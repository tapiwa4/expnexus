from rest_framework import serializers

from .models import Project, Service, Testimonial


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'tagline', 'description', 'price_from', 'order']


class ProjectSerializer(serializers.ModelSerializer):
    tag_list = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'slug', 'client_name', 'summary', 'description',
            'live_url', 'image', 'tag_list', 'is_featured', 'completed_on',
        ]


class TestimonialSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source='project.title', read_only=True, default=None)

    class Meta:
        model = Testimonial
        fields = ['id', 'client_name', 'company', 'quote', 'project_title']
