import RegistrationModule from './GuestRegistrationModal';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

/** Walk-in fast-track — unified registration module (mode=walk-in). */
export default function WalkInModal({ onClose, onSuccess }: Props) {
  return (
    <RegistrationModule
      mode="walk-in"
      checkInMode
      onClose={onClose}
      onSuccess={onSuccess}
      onRefresh={onSuccess}
    />
  );
}
