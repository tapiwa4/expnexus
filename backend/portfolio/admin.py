from django.contrib import admin

from .models import Project, Service, Testimonial


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'tagline', 'price_from', 'order', 'is_active']
    list_editable = ['order', 'is_active']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'client_name', 'is_featured', 'is_published', 'completed_on', 'order']
    list_editable = ['is_featured', 'is_published', 'order']
    list_filter = ['is_featured', 'is_published']
    search_fields = ['title', 'client_name', 'tags']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ['client_name', 'company', 'project', 'order', 'is_active']
    list_editable = ['order', 'is_active']
