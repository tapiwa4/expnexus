from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .checks import (
    layer1_dns_validation,
    layer2_email_authentication,
    layer3_reputation_and_tls,
    layer4_domain_risk,
    parse_target,
    validate_format,
)
from .models import PremiumAccessCode, ScanLog


class FreeScanThrottle(AnonRateThrottle):
    scope = 'free_scan'


def get_client_ip(request):
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def validate_target(raw, email_only):
    """Shared input validation for both scan endpoints.

    Returns (domain, is_email, error_message). error_message is None when valid.
    """
    if not raw:
        return None, None, 'Please enter an email address or domain.'

    domain, is_email = parse_target(raw)

    if email_only and not is_email:
        return None, None, (
            'Email Scan checks a specific inbox, so it needs a full email address '
            '(e.g. you@gmail.com) — not just a domain. For domain-only checks, use Security Check instead.'
        )

    fmt = validate_format(raw, is_email)
    if not fmt['valid']:
        return None, None, fmt['message']

    return domain, is_email, None


class FreeScanView(APIView):
    # Public, anonymous-use endpoint — must not authenticate via session, otherwise a
    # visitor who happens to be logged into /admin/ in the same browser gets a CSRF 403
    # (SessionAuthentication enforces CSRF once it recognizes an authenticated session).
    authentication_classes = []
    throttle_classes = [FreeScanThrottle]

    def post(self, request):
        raw = str(request.data.get('target', '')).strip()
        email_only = bool(request.data.get('email_only'))

        domain, is_email, error = validate_target(raw, email_only)
        if error:
            return Response({'error': error}, status=400)

        layer1, _mx_hosts = layer1_dns_validation(domain, raw, is_email)
        ScanLog.objects.create(identifier=raw, ip_address=get_client_ip(request), is_premium=False)

        return Response({
            'tier': 'free',
            'target': raw,
            'domain': domain,
            'layers': [layer1],
            'upsell': 'This free check covers basic DNS validation only. A full security check also verifies '
                      'email authentication (SPF/DKIM/DMARC), server reputation, encryption, and domain risk.',
        })


class DeepScanView(APIView):
    authentication_classes = []  # public endpoint gated by access code, not by login — see FreeScanView

    def post(self, request):
        raw = str(request.data.get('target', '')).strip()
        code_value = str(request.data.get('code', '')).strip()
        email_only = bool(request.data.get('email_only'))

        if not code_value:
            return Response({'error': 'Please enter a valid access code.'}, status=400)

        try:
            code = PremiumAccessCode.objects.get(code__iexact=code_value, is_active=True)
        except PremiumAccessCode.DoesNotExist:
            return Response(
                {'error': "That access code isn't valid. Please check it, or purchase a scan below."}, status=403
            )

        if code.remaining <= 0:
            return Response({'error': 'This access code has already been used.'}, status=403)

        domain, is_email, error = validate_target(raw, email_only)
        if error:
            return Response({'error': error}, status=400)

        layer1, mx_hosts = layer1_dns_validation(domain, raw, is_email)
        layer2 = layer2_email_authentication(domain)
        layer3 = layer3_reputation_and_tls(mx_hosts)
        layer4 = layer4_domain_risk(domain)

        code.uses += 1
        code.save(update_fields=['uses'])
        ScanLog.objects.create(identifier=raw, ip_address=get_client_ip(request), is_premium=True)

        return Response({
            'tier': 'premium',
            'target': raw,
            'domain': domain,
            'layers': [layer1, layer2, layer3, layer4],
            'code_remaining': code.remaining,
        })
