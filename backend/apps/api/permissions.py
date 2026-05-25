from rest_framework.permissions import BasePermission


class IsSellerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.pfs_role in {"SELLER", "ADMIN"})


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.pfs_role == "ADMIN")
