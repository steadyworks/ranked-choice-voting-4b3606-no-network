import random
import string
from django.db import models


class Election(models.Model):
    title = models.CharField(max_length=500)
    code = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=10, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'elections'

    @classmethod
    def generate_code(cls):
        while True:
            code = 'VOTE-' + ''.join(random.choices(string.digits, k=4))
            if not cls.objects.filter(code=code).exists():
                return code

    def __str__(self):
        return f'{self.title} ({self.code})'


class Candidate(models.Model):
    election = models.ForeignKey(
        Election, on_delete=models.CASCADE, related_name='candidates'
    )
    name = models.CharField(max_length=200)
    order = models.IntegerField(default=0)

    class Meta:
        app_label = 'elections'
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class Ballot(models.Model):
    election = models.ForeignKey(
        Election, on_delete=models.CASCADE, related_name='ballots'
    )
    voter_name = models.CharField(max_length=200)
    ranking = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'elections'
        unique_together = ('election', 'voter_name')

    def __str__(self):
        return f'{self.voter_name} in {self.election.code}'
