# notifications/views.py
from rest_framework import permissions, viewsets
from rest_framework.authentication import (
    BasicAuthentication,
    SessionAuthentication,
)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from pfslib.helper import StandardResultsSetPagination

from .models import Notification
from .serializers import NotificationSerializer


class IsRecipient(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.recipient_id == request.user.id

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Notifications are created by the server (services / utils / Celery tasks).
    Clients can only read their own notifications and mark them as read.
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsRecipient]
    authentication_classes = [
        SessionAuthentication,
        BasicAuthentication,
        JWTAuthentication,
    ]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=["get"])
    def unread(self, request):
        qs = self.get_queryset().filter(is_read=False)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"detail": f"{updated} notification(s) marked as read."})

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response({"detail": "Notification marked as read."})
