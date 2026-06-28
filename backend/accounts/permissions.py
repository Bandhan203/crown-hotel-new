from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Allow access only to admin users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class IsStaffUser(permissions.BasePermission):
    """Allow access only to staff users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('STAFF', 'ADMIN')


class IsGuest(permissions.BasePermission):
    """Allow access only to guests (or admin)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('GUEST', 'ADMIN')


class IsAdminOrReadOnly(permissions.BasePermission):
    """Admin can do anything; others can only read."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == 'ADMIN'
