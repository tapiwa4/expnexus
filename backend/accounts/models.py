from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Custom user so we can add fields later (e.g. client portal) without a painful migration."""

    def __str__(self):
        return self.username
