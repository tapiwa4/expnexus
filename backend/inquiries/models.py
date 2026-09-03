from django.db import models


class Inquiry(models.Model):
    class Budget(models.TextChoices):
        UNDER_500 = 'under_500', 'Under $500'
        B500_2000 = '500_2000', '$500 – $2,000'
        B2000_5000 = '2000_5000', '$2,000 – $5,000'
        OVER_5000 = 'over_5000', 'Over $5,000'
        UNSURE = 'unsure', 'Not sure yet'

    name = models.CharField(max_length=100)
    email = models.EmailField()
    company = models.CharField(max_length=100, blank=True)
    budget = models.CharField(max_length=20, choices=Budget.choices, default=Budget.UNSURE)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = 'inquiries'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} <{self.email}>'
