import { MdGroups, MdCurrencyExchange, MdDescription } from 'react-icons/md';

export type WorkflowPhase = 'multi' | 'currency' | 'voucher';

interface SavedBooking {
  id: number;
  booking_ref: string;
  guest_name?: string;
}

interface Props {
  phase: WorkflowPhase;
  booking: SavedBooking;
  roomCount: number;
  onMultiYes: () => void;
  onMultiNo: () => void;
  onCurrency: (currency: 'USD' | 'BDT') => void;
  onPrintVoucher: () => void;
  onFinish: () => void;
  finalizing?: boolean;
  printing?: boolean;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-outline-variant/40 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function ReservationWorkflowDialogs({
  phase,
  booking,
  roomCount,
  onMultiYes,
  onMultiNo,
  onCurrency,
  onPrintVoucher,
  onFinish,
  finalizing = false,
  printing = false,
}: Props) {
  if (phase === 'multi') {
    return (
      <Overlay>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2 rounded-full bg-primary/10 text-primary">
              <MdGroups className="text-xl" />
            </span>
            <h3 className="text-lg font-bold text-on-surface">Multi Reservation</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-2">
            Reservation <strong>{booking.booking_ref}</strong> saved for{' '}
            <strong>{booking.guest_name || 'guest'}</strong>.
          </p>
          <p className="text-sm text-on-surface-variant mb-6">
            Would you like to make another room reservation under the same booking reference?
            Guest details will be retained; room fields will be cleared.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onMultiYes}
              className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-dark"
            >
              Yes, add another room
            </button>
            <button
              type="button"
              onClick={onMultiNo}
              className="flex-1 py-2.5 rounded-lg border border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container-low"
            >
              No, continue
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  if (phase === 'currency') {
    return (
      <Overlay>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2 rounded-full bg-primary/10 text-primary">
              <MdCurrencyExchange className="text-xl" />
            </span>
            <h3 className="text-lg font-bold text-on-surface">Billing Currency</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-6">
            Before generating the confirmation voucher, select the billing currency for
            {roomCount > 1 ? ` all ${roomCount} reservations` : ' this reservation'}.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={finalizing}
              onClick={() => onCurrency('USD')}
              className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-dark disabled:opacity-60"
            >
              Yes — USD
            </button>
            <button
              type="button"
              disabled={finalizing}
              onClick={() => onCurrency('BDT')}
              className="flex-1 py-2.5 rounded-lg border border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container-low disabled:opacity-60"
            >
              No — BDT
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="p-2 rounded-full bg-primary/10 text-primary">
            <MdDescription className="text-xl" />
          </span>
          <h3 className="text-lg font-bold text-on-surface">Reservation Confirmation</h3>
        </div>
        <p className="text-sm text-on-surface-variant mb-2">
          Confirmation <strong>{booking.booking_ref}</strong> is ready.
        </p>
        <p className="text-sm text-on-surface-variant mb-6">
          Print the reservation voucher for the guest. The booking is now visible in Expected Arrivals
          and the room grid reflects expected arrival status.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={printing}
            onClick={onPrintVoucher}
            className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-dark disabled:opacity-60"
          >
            {printing ? 'Generating…' : 'Print confirmation'}
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="flex-1 py-2.5 rounded-lg border border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container-low"
          >
            Done
          </button>
        </div>
      </div>
    </Overlay>
  );
}
