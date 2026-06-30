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


def staff_module_permission(module: str):
    """Factory: ADMIN always allowed; STAFF needs StaffPermission for module + HTTP verb."""

    class _StaffModulePermission(permissions.BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not user.is_authenticated:
                return False
            if user.role == 'ADMIN':
                return True
            if user.role != 'STAFF':
                return False
            try:
                profile = user.staff_profile
            except Exception:
                return False
            perm = profile.permissions.filter(module=module).first()
            if not perm:
                return False
            method = request.method.upper()
            if method in ('GET', 'HEAD', 'OPTIONS'):
                return perm.can_view
            if method == 'POST':
                return perm.can_create
            if method in ('PUT', 'PATCH'):
                return perm.can_edit
            if method == 'DELETE':
                return perm.can_delete
            return False

    return _StaffModulePermission
