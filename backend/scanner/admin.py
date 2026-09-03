from django.contrib import admin

from .models import PremiumAccessCode, ScanLog


@admin.register(PremiumAccessCode)
class PremiumAccessCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'label', 'uses', 'max_uses', 'is_active', 'created_at']
    list_editable = ['is_active']
    readonly_fields = ['uses', 'created_at']


@admin.register(ScanLog)
class ScanLogAdmin(admin.ModelAdmin):
    list_display = ['identifier', 'ip_address', 'is_premium', 'created_at']
    list_filter = ['is_premium']
    search_fields = ['identifier', 'ip_address']

    def has_add_permission(self, request):
        return False
