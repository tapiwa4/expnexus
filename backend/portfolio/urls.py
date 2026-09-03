from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, ServiceViewSet, TestimonialViewSet

router = DefaultRouter()
router.register('services', ServiceViewSet, basename='service')
router.register('projects', ProjectViewSet, basename='project')
router.register('testimonials', TestimonialViewSet, basename='testimonial')

urlpatterns = router.urls
