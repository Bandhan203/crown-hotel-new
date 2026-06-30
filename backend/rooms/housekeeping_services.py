"""Housekeeping workflow helpers — checkout → dirty room → cleaning task."""

from datetime import date

from rooms.models import HousekeepingTask, Room

DIRTY_HK_STATUSES = frozenset({'OD', 'VD', 'CO'})


def is_room_dirty(room: Room) -> bool:
    return room.housekeeping_status in DIRTY_HK_STATUSES


def ensure_cleaning_task(room, booking=None, *, notes='', priority='HIGH'):
    """
    Create a pending CLEAN task for a dirty room if one does not already exist.
    Returns (task, created).
    """
    existing = (
        HousekeepingTask.objects.filter(
            room=room,
            task_type=HousekeepingTask.TaskType.CLEAN,
            status__in=[
                HousekeepingTask.Status.PENDING,
                HousekeepingTask.Status.IN_PROGRESS,
            ],
        )
        .select_related('room', 'booking')
        .first()
    )
    if existing:
        updates = []
        if booking and not existing.booking_id:
            existing.booking = booking
            updates.append('booking')
        if notes and not existing.notes:
            existing.notes = notes
            updates.append('notes')
        if updates:
            existing.save(update_fields=updates)
        return existing, False

    task = HousekeepingTask.objects.create(
        room=room,
        booking=booking,
        task_type=HousekeepingTask.TaskType.CLEAN,
        priority=priority,
        status=HousekeepingTask.Status.PENDING,
        scheduled_date=date.today(),
        notes=notes or 'Room cleaning requested',
    )
    return task, True


def on_checkout_room(room, booking):
    """After checkout: mark room dirty and queue housekeeping."""
    room.status = Room.Status.AVAILABLE
    room.housekeeping_status = Room.HousekeepingStatus.CO
    room.save(update_fields=['status', 'housekeeping_status'])
    ensure_cleaning_task(
        room,
        booking=booking,
        notes=f'Auto: post-checkout clean — {booking.booking_ref}',
        priority=HousekeepingTask.Priority.HIGH,
    )


def request_room_cleaning(room_id, user=None, notes=''):
    """Dashboard / manual dispatch — ensure dirty room has an active HK task."""
    room = Room.objects.get(pk=room_id)
    if not is_room_dirty(room):
        raise ValueError('Room is not marked dirty. Nothing to clean.')
    task, created = ensure_cleaning_task(
        room,
        notes=notes or f'Cleaning requested from dashboard by {getattr(user, "full_name", "staff")}',
        priority=HousekeepingTask.Priority.HIGH,
    )
    return task, created
