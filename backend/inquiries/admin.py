from django.contrib import admin

from .models import Inquiry


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'company', 'budget', 'created_at', 'is_read']
    list_editable = ['is_read']
    list_filter = ['is_read', 'budget']
    search_fields = ['name', 'email', 'company', 'message']
    readonly_fields = ['name', 'email', 'company', 'budget', 'message', 'created_at']

    def has_add_permission(self, request):
        return False
