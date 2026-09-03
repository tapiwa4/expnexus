from django.urls import path

from .views import DeepScanView, FreeScanView

urlpatterns = [
    path('scanner/free-scan/', FreeScanView.as_view(), name='free-scan'),
    path('scanner/deep-scan/', DeepScanView.as_view(), name='deep-scan'),
]
