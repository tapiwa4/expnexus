"""Real DNS/SMTP/RDAP-based checks for SecureMail Sentinel.

No fabricated results: every finding here comes from an actual lookup against
the target domain. Where a check can't be completed (network restrictions,
missing data), we report 'inconclusive' rather than guessing.
"""
import re
import smtplib
import socket
from datetime import datetime, timezone

import dns.resolver
import requests

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
DOMAIN_RE = re.compile(
    r'^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
)
COMMON_DKIM_SELECTORS = ['default', 'selector1', 'selector2', 'google', 'k1', 'mail', 's1']


def parse_target(raw: str):
    raw = raw.strip()
    is_email = '@' in raw
    domain = raw.rsplit('@', 1)[-1].lower() if is_email else raw.lower()
    return domain, is_email


def validate_format(raw: str, is_email: bool) -> dict:
    if is_email and not EMAIL_RE.match(raw):
        return {'valid': False, 'message': "That doesn't look like a valid email address. Please check for typos."}
    domain = raw.rsplit('@', 1)[-1].lower() if is_email else raw.lower()
    if not DOMAIN_RE.match(domain):
        return {'valid': False, 'message': "That domain format doesn't look right. Please check for typos."}
    return {'valid': True, 'message': ''}


def _make_resolver():
    # Use public resolvers explicitly rather than trusting the host's configured
    # nameservers — those are unreliable in containers/sandboxes and shouldn't be
    # assumed to work at deploy time either.
    resolver = dns.resolver.Resolver(configure=False)
    resolver.nameservers = ['1.1.1.1', '8.8.8.8']
    resolver.timeout = 4
    resolver.lifetime = 4
    return resolver


def resolve_records(domain, record_type):
    try:
        answers = _make_resolver().resolve(domain, record_type)
        return [str(r).strip('"') for r in answers]
    except Exception:
        return []


def layer1_dns_validation(domain, raw, is_email):
    findings = []
    if is_email:
        findings.append({
            'check': 'Email format', 'status': 'pass',
            'explanation': f'"{raw}" is a validly formatted email address.',
        })

    a_records = resolve_records(domain, 'A') or resolve_records(domain, 'AAAA')
    mx_records = resolve_records(domain, 'MX')

    if a_records:
        findings.append({
            'check': 'Domain resolves', 'status': 'pass',
            'explanation': 'This domain is active and correctly set up on the internet.',
        })
    else:
        findings.append({
            'check': 'Domain resolves', 'status': 'fail',
            'explanation': "We couldn't find this domain online. Best practice suggests double-checking "
                           "the spelling, or confirming the domain is still registered and active.",
        })

    if mx_records:
        findings.append({
            'check': 'Mail server configured', 'status': 'pass',
            'explanation': 'This domain has mail servers set up, meaning it can send and receive email properly.',
        })
    else:
        findings.append({
            'check': 'Mail server configured', 'status': 'warn',
            'explanation': 'No mail server (MX record) was found for this domain. We recommend confirming this '
                           "is intentional — without one, this domain can't receive email at all.",
        })

    passed = sum(1 for f in findings if f['status'] == 'pass')
    mx_hosts = [m.split(' ')[-1].rstrip('.') for m in mx_records]
    return {
        'layer': 1,
        'name': 'Basic DNS Validation',
        'summary': f'{passed} of {len(findings)} checks passed',
        'findings': findings,
    }, mx_hosts


def layer2_email_authentication(domain):
    findings = []
    txt_records = resolve_records(domain, 'TXT')

    spf = next((t for t in txt_records if t.lower().startswith('v=spf1')), None)
    if spf:
        findings.append({
            'check': 'SPF record', 'status': 'pass',
            'explanation': 'This domain publishes an SPF record, which tells other mail servers which senders '
                           'are allowed to send email on its behalf — a key defense against spoofing.',
        })
    else:
        findings.append({
            'check': 'SPF record', 'status': 'fail',
            'explanation': "No SPF record was found. We recommend adding one — without it, it's easier for "
                           'scammers to send fake emails that appear to come from this domain.',
        })

    dkim_found = None
    for selector in COMMON_DKIM_SELECTORS:
        recs = resolve_records(f'{selector}._domainkey.{domain}', 'TXT')
        if any('v=dkim1' in r.lower() for r in recs):
            dkim_found = selector
            break
    if dkim_found:
        findings.append({
            'check': 'DKIM signing', 'status': 'pass',
            'explanation': f'A DKIM record was found (selector "{dkim_found}"), which lets receiving mail '
                           "servers verify that messages weren't tampered with in transit.",
        })
    else:
        findings.append({
            'check': 'DKIM signing', 'status': 'warn',
            'explanation': "We couldn't detect a DKIM record using common selector names. This isn't "
                           'conclusive — some providers use custom selectors we can\'t guess — but best '
                           'practice suggests confirming DKIM is enabled with your email provider.',
        })

    dmarc_records = resolve_records(f'_dmarc.{domain}', 'TXT')
    dmarc = next((t for t in dmarc_records if t.lower().startswith('v=dmarc1')), None)
    if dmarc:
        policy_match = re.search(r'p=(\w+)', dmarc, re.IGNORECASE)
        policy = policy_match.group(1).lower() if policy_match else 'none'
        if policy == 'reject':
            findings.append({
                'check': 'DMARC policy', 'status': 'pass',
                'explanation': 'This domain has a strict DMARC policy (reject), which actively blocks emails '
                               'that fail authentication — strong protection against spoofing.',
            })
        elif policy == 'quarantine':
            findings.append({
                'check': 'DMARC policy', 'status': 'pass',
                'explanation': 'This domain has a DMARC policy set to quarantine suspicious emails. We '
                               "recommend eventually moving to a 'reject' policy for stronger protection.",
            })
        else:
            findings.append({
                'check': 'DMARC policy', 'status': 'warn',
                'explanation': "A DMARC record exists but its policy is set to 'none', meaning it monitors "
                               "but doesn't block spoofed email. Best practice suggests tightening this over time.",
            })
    else:
        findings.append({
            'check': 'DMARC policy', 'status': 'fail',
            'explanation': 'No DMARC record was found. We recommend adding one — it works alongside SPF and '
                           'DKIM to stop scammers from impersonating this domain.',
        })

    passed = sum(1 for f in findings if f['status'] == 'pass')
    return {
        'layer': 2,
        'name': 'Email Authentication (SPF / DKIM / DMARC)',
        'summary': f'{passed} of {len(findings)} checks passed',
        'findings': findings,
    }


def _reverse_ip(ip):
    return '.'.join(reversed(ip.split('.')))


# Spamhaus ZEN returns these specific addresses to signal a policy/error condition,
# not a real listing — e.g. 127.255.255.254 means "this query came via a public DNS
# resolver", which their free lookup service blocks rather than answering honestly.
# Treating any of these as "blacklisted" would misreport huge numbers of clean domains.
SPAMHAUS_ERROR_CODES = {
    '127.255.255.252': 'the lookup was malformed',
    '127.255.255.253': 'too many queries were sent from this network in a short time',
    '127.255.255.254': 'this check ran through a public DNS resolver, which Spamhaus blocks for its free lookup service',
    '127.255.255.255': 'too many queries have been sent from this network',
}


def _query_spamhaus(query):
    """Prefer the host's own configured resolver — Spamhaus's free service blocks
    queries that arrive via well-known public resolvers (see SPAMHAUS_ERROR_CODES).
    Falls back to a public resolver only if the host's own resolver is unusable."""
    for resolver in (dns.resolver.Resolver(configure=True), _make_resolver()):
        resolver.timeout = 4
        resolver.lifetime = 4
        try:
            return [str(a) for a in resolver.resolve(query, 'A')]
        except dns.resolver.NXDOMAIN:
            return []
        except Exception:
            continue
    raise RuntimeError('DNSBL lookup unavailable')


def layer3_reputation_and_tls(mx_hosts):
    findings = []

    if not mx_hosts:
        findings.append({
            'check': 'Blacklist check', 'status': 'skip',
            'explanation': "No mail server was found, so we couldn't check its reputation.",
        })
        findings.append({
            'check': 'Mail encryption (STARTTLS)', 'status': 'skip',
            'explanation': "No mail server was found, so we couldn't check its encryption support.",
        })
        return {
            'layer': 3, 'name': 'Reputation & Transport Security',
            'summary': 'Skipped — no mail server found', 'findings': findings,
        }

    primary_host = mx_hosts[0]

    try:
        ip = socket.gethostbyname(primary_host)
        try:
            answers = _query_spamhaus(f'{_reverse_ip(ip)}.zen.spamhaus.org')
        except Exception:
            answers = None

        if answers is None:
            findings.append({
                'check': 'Blacklist check', 'status': 'inconclusive',
                'explanation': "We weren't able to complete this check right now. This doesn't indicate a "
                               'problem — please try again shortly.',
            })
        elif not answers:
            findings.append({
                'check': 'Blacklist check', 'status': 'pass',
                'explanation': "This domain's mail server isn't listed on the blacklist we checked — a good "
                               'sign for deliverability and trust.',
            })
        elif any(a in SPAMHAUS_ERROR_CODES for a in answers):
            findings.append({
                'check': 'Blacklist check', 'status': 'inconclusive',
                'explanation': "We weren't able to complete this check right now "
                               f'({SPAMHAUS_ERROR_CODES[next(a for a in answers if a in SPAMHAUS_ERROR_CODES)]}). '
                               "This doesn't indicate a problem — please try again shortly.",
            })
        else:
            findings.append({
                'check': 'Blacklist check', 'status': 'fail',
                'explanation': "This domain's mail server appears on a spam blacklist. We recommend contacting "
                               'the mail provider to investigate and request delisting.',
            })
    except Exception:
        findings.append({
            'check': 'Blacklist check', 'status': 'inconclusive',
            'explanation': "We weren't able to complete this check right now. This doesn't indicate a "
                           'problem — please try again shortly.',
        })

    try:
        with smtplib.SMTP(timeout=6) as server:
            server.connect(primary_host, 25)
            server.ehlo('securemail-sentinel-scan.local')
            supports_tls = server.has_extn('starttls')
        if supports_tls:
            findings.append({
                'check': 'Mail encryption (STARTTLS)', 'status': 'pass',
                'explanation': 'This mail server supports encrypted connections (STARTTLS), helping keep '
                               'messages private in transit.',
            })
        else:
            findings.append({
                'check': 'Mail encryption (STARTTLS)', 'status': 'warn',
                'explanation': "We couldn't confirm encrypted mail transport support. Best practice suggests "
                               'checking with the mail provider that STARTTLS is enabled.',
            })
    except Exception:
        findings.append({
            'check': 'Mail encryption (STARTTLS)', 'status': 'inconclusive',
            'explanation': "We weren't able to test this from our current network (outbound mail-port "
                           "connections are often restricted). This isn't a finding either way.",
        })

    passed = sum(1 for f in findings if f['status'] == 'pass')
    return {
        'layer': 3, 'name': 'Reputation & Transport Security',
        'summary': f'{passed} of {len(findings)} checks passed', 'findings': findings,
    }


def layer4_domain_risk(domain):
    findings = []
    try:
        resp = requests.get(f'https://rdap.org/domain/{domain}', timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            events = data.get('events', [])
            reg_event = next((e for e in events if e.get('eventAction') == 'registration'), None)
            if reg_event and reg_event.get('eventDate'):
                reg_date = datetime.fromisoformat(reg_event['eventDate'].replace('Z', '+00:00'))
                age_days = (datetime.now(timezone.utc) - reg_date).days
                if age_days < 30:
                    findings.append({
                        'check': 'Domain age', 'status': 'warn',
                        'explanation': f'This domain was registered only {age_days} day(s) ago. We recommend '
                                       'extra caution — very new domains are more commonly associated with '
                                       'scams, though many are perfectly legitimate.',
                    })
                else:
                    years = age_days // 365
                    age_text = f'about {years} year(s)' if years else 'less than a year'
                    findings.append({
                        'check': 'Domain age', 'status': 'pass',
                        'explanation': f'This domain has been registered for {age_text} — established '
                                       'domains are generally lower-risk.',
                    })
            else:
                findings.append({
                    'check': 'Domain age', 'status': 'inconclusive',
                    'explanation': "We couldn't determine this domain's registration date from public records.",
                })
        else:
            findings.append({
                'check': 'Domain age', 'status': 'inconclusive',
                'explanation': "Public registration records weren't available for this domain right now.",
            })
    except Exception:
        findings.append({
            'check': 'Domain age', 'status': 'inconclusive',
            'explanation': "We weren't able to look up registration records right now. Please try again shortly.",
        })

    findings.append({
        'check': 'Breach exposure', 'status': 'coming_soon',
        'explanation': 'Breach-database checking is coming soon. This requires a separate paid data '
                       "subscription and isn't enabled yet.",
    })

    checkable = [f for f in findings if f['status'] != 'coming_soon']
    passed = sum(1 for f in checkable if f['status'] == 'pass')
    return {
        'layer': 4, 'name': 'Domain Risk & Breach Exposure',
        'summary': f'{passed} of {len(checkable)} available checks passed', 'findings': findings,
    }
