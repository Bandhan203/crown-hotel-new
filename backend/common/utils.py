import uuid


def generate_booking_ref():
    """Generate a unique booking reference like NVY-XXXXXXXX."""
    return f"NVY-{uuid.uuid4().hex[:8].upper()}"
