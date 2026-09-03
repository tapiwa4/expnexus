import secrets

from django.db import models


def generate_code():
    return secrets.token_hex(4).upper()


class PremiumAccessCode(models.Model):
    """Manually issued by an admin to a customer who paid outside Stripe
    (bank transfer, invoice, cash) until real Stripe Checkout is wired in."""

    code = models.CharField(max_length=32, unique=True, default=generate_code)
    label = models.CharField(
        max_length=200, blank=True,
        help_text='Who this is for / how they paid — for your own records, e.g. "Jane Doe, EFT 2026-09-02"',
    )
    max_uses = models.PositiveIntegerField(default=1)
    uses = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} ({self.uses}/{self.max_uses} used)'

    @property
    def remaining(self):
        return max(self.max_uses - self.uses, 0)


class ScanLog(models.Model):
    identifier = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    is_premium = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.identifier} ({"premium" if self.is_premium else "free"})'
