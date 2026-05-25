# notifications/serializers.py
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'actor',
            'type',
            'title',
            'message',
            'target_url',
            'is_read',
            'created_at',
            'send_email',
            'email_sent_at',
            'email_subject',
            'email_body',
        ]
        read_only_fields = [
            'recipient',
            'actor',
            'created_at',
            'email_sent_at',
        ]


class NotificationReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'is_read']
        read_only_fields = ['id']
