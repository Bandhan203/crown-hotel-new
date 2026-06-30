"""Staff invite link generation and acceptance."""
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import StaffInvite, StaffPermission, StaffProfile

User = get_user_model()
INVITE_TTL_DAYS = 7


def build_invite_url(token: str) -> str:
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    return f'{base}/admin/staff/join/{token}'


def create_staff_invite(*, email: str, full_name: str, created_by, phone='', department='', position='', permissions=None):
    email = email.strip().lower()
    if User.objects.filter(email__iexact=email).exists():
        raise ValueError('A user with this email already exists.')

    StaffInvite.objects.filter(
        email__iexact=email,
        accepted_at__isnull=True,
        revoked_at__isnull=True,
    ).update(revoked_at=timezone.now())

    token = secrets.token_urlsafe(32)
    invite = StaffInvite.objects.create(
        token=token,
        email=email,
        full_name=full_name.strip(),
        phone=phone or '',
        department=department or '',
        position=position or '',
        permissions_data=permissions or [],
        created_by=created_by,
        expires_at=timezone.now() + timedelta(days=INVITE_TTL_DAYS),
    )
    return invite, build_invite_url(token)


@transaction.atomic
def accept_staff_invite(invite: StaffInvite, password: str):
    if not invite.is_valid:
        raise ValueError('This invite link is invalid or has expired.')

    if User.objects.filter(email__iexact=invite.email).exists():
        raise ValueError('An account with this email already exists.')

    user = User.objects.create_user(
        email=invite.email,
        full_name=invite.full_name,
        phone=invite.phone,
        password=password,
        role='STAFF',
        is_staff=True,
        is_active=True,
    )
    profile = StaffProfile.objects.create(
        user=user,
        department=invite.department,
        position=invite.position,
        is_active=True,
    )

    for perm in invite.permissions_data or []:
        module = perm.get('module')
        if not module:
            continue
        StaffPermission.objects.create(
            staff=profile,
            module=module,
            can_view=bool(perm.get('can_view')),
            can_create=bool(perm.get('can_create')),
            can_edit=bool(perm.get('can_edit')),
            can_delete=bool(perm.get('can_delete')),
        )

    invite.staff_profile = profile
    invite.accepted_at = timezone.now()
    invite.save(update_fields=['staff_profile', 'accepted_at'])

    return user, profile
