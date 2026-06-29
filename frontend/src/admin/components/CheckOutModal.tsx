import CheckoutModule from './CheckoutModule';

interface Booking {
  id: number;
  booking_ref: string;
  guest_name: string;
  room_number: string | null;
}

interface Props {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

/** Embedded checkout modal — wraps the full Revenue Guard module. */
export default function CheckOutModal({ booking, onClose, onSuccess }: Props) {
  return (
    <CheckoutModule
      embedded
      initialBookingId={booking.id}
      initialRoomNumber={booking.room_number || ''}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
