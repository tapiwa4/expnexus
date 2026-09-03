from rest_framework import mixins, viewsets
from rest_framework.throttling import AnonRateThrottle

from .models import Inquiry
from .serializers import InquirySerializer


class ContactThrottle(AnonRateThrottle):
    scope = 'contact'


class InquiryViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Public endpoint: visitors can submit an inquiry, nothing else."""

    # Must not authenticate via session — a visitor logged into /admin/ in the same
    # browser would otherwise get a CSRF 403 (see scanner.views.FreeScanView).
    authentication_classes = []
    queryset = Inquiry.objects.all()
    serializer_class = InquirySerializer
    throttle_classes = [ContactThrottle]
