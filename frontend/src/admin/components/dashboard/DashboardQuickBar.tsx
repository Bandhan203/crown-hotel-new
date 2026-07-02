import { useNavigate } from 'react-router-dom';
import {
  MdAdd, MdPersonAdd, MdLogin, MdLogout, MdCleaningServices,
  MdCalendarMonth, MdReceipt, MdNightsStay, MdCheckCircle,
} from 'react-icons/md';
import { isDirtyHk } from '../../utils/housekeepingStatus';

interface SelectedRoom {
  id: number;
  room_number: string;
  status: string;
  housekeeping_status: string;
  is_dirty?: boolean;
  occupant?: { booking_id: number } | null;
}

interface Props {
  dirtyCount: number;
  selectedRoom: SelectedRoom | null;
  hkLoading?: boolean;
  onRequestCleaning?: () => void;
  onMarkReady?: () => void;
  onOpenFolio?: () => void;
}

type Btn = {
  key: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: 'primary' | 'success' | 'danger' | 'warn' | 'ghost' | 'outline';
  disabled?: boolean;
  title?: string;
};

const VARIANT: Record<Btn['variant'], string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  warn: 'bg-status-dirty text-white hover:brightness-110 shadow-sm',
  ghost: 'bg-surface-container-low text-on-surface border border-outline-variant hover:bg-surface-container',
  outline: 'bg-white text-on-surface-variant border border-outline-variant hover:border-primary/40 hover:text-primary',
};

function ActionBtn({ btn }: { btn: Btn }) {
  return (
    <button
      type="button"
      title={btn.title || btn.label}
      disabled={btn.disabled}
      onClick={btn.onClick}
      className={`
        h-8 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold
        inline-flex items-center gap-1.5 shrink-0 transition-colors
        disabled:opacity-45 disabled:pointer-events-none
        ${VARIANT[btn.variant]}
      `}
    >
      {btn.icon}
      <span className="hidden sm:inline">{btn.shortLabel || btn.label}</span>
      <span className="sm:hidden">{btn.shortLabel || btn.label.split(' ').pop()}</span>
    </button>
  );
}

function Divider({ className = '' }: { className?: string }) {
  return <div className={`w-px h-5 bg-outline-variant/80 shrink-0 mx-0.5 ${className}`} aria-hidden />;
}

export default function DashboardQuickBar({
  dirtyCount,
  selectedRoom,
  hkLoading = false,
  onRequestCleaning,
  onMarkReady,
  onOpenFolio,
}: Props) {
  const navigate = useNavigate();
  const go = (path: string) => () => navigate(path);
  const fd = (action?: string) => () => navigate(action ? `/admin/front-desk?action=${action}` : '/admin/front-desk');

  const isDirty = selectedRoom
    ? (selectedRoom.is_dirty ?? isDirtyHk(selectedRoom.housekeeping_status)) && selectedRoom.status !== 'OCCUPIED'
    : false;
  const isOccupied = selectedRoom?.status === 'OCCUPIED' && !!selectedRoom.occupant;

  const core: Btn[] = [
    { key: 'res', label: 'New Reservation', shortLabel: 'Reservation', icon: <MdAdd size={15} />, onClick: fd('reservation'), variant: 'primary' },
    { key: 'walk', label: 'Walk-in', icon: <MdPersonAdd size={14} />, onClick: fd('walkin'), variant: 'outline' },
    { key: 'ci', label: 'Check-in', icon: <MdLogin size={14} />, onClick: go('/admin/front-desk?tab=arrivals'), variant: 'success' },
    { key: 'co', label: 'Check-out', icon: <MdLogout size={14} />, onClick: go('/admin/checkout'), variant: 'danger' },
  ];

  const context: Btn[] = [];
  if (selectedRoom) {
    if (isDirty) {
      context.push(
        {
          key: 'clean',
          label: `Clean Room ${selectedRoom.room_number}`,
          shortLabel: 'Clean Room',
          icon: <MdCleaningServices size={14} />,
          onClick: () => onRequestCleaning?.(),
          variant: 'warn',
          disabled: hkLoading || !onRequestCleaning,
        },
        {
          key: 'ready',
          label: 'Mark Ready',
          icon: <MdCheckCircle size={14} />,
          onClick: () => onMarkReady?.(),
          variant: 'outline',
          disabled: hkLoading || !onMarkReady,
        },
      );
    } else if (isOccupied) {
      context.push(
        {
          key: 'folio',
          label: 'Guest Folio',
          shortLabel: 'Folio',
          icon: <MdReceipt size={14} />,
          onClick: () => onOpenFolio?.(),
          variant: 'outline',
          disabled: !onOpenFolio,
        },
        {
          key: 'cogo',
          label: 'Check-out Guest',
          shortLabel: 'Check-out',
          icon: <MdLogout size={14} />,
          onClick: go('/admin/checkout'),
          variant: 'danger',
        },
      );
    }
  }

  const ops: Btn[] = [
    {
      key: 'hk',
      label: dirtyCount > 0 ? `Housekeeping (${dirtyCount})` : 'Housekeeping',
      shortLabel: dirtyCount > 0 ? `HK (${dirtyCount})` : 'HK',
      icon: <MdCleaningServices size={14} />,
      onClick: go('/admin/housekeeping'),
      variant: dirtyCount > 0 ? 'warn' : 'ghost',
    },
    { key: 'cal', label: 'Calendar', icon: <MdCalendarMonth size={14} />, onClick: go('/admin/reservations/calendar'), variant: 'ghost' },
    { key: 'bill', label: 'Service Entry', shortLabel: 'Billing', icon: <MdReceipt size={14} />, onClick: go('/admin/service-entry'), variant: 'ghost' },
    { key: 'audit', label: 'Night Audit', shortLabel: 'Audit', icon: <MdNightsStay size={14} />, onClick: go('/admin/night-audit'), variant: 'ghost' },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-x-1.5 gap-y-2 max-w-full"
      role="toolbar"
      aria-label="Dashboard quick actions"
    >
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        {core.map(btn => <ActionBtn key={btn.key} btn={btn} />)}
      </div>

      {context.length > 0 && (
        <>
          <Divider />
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 rounded-lg bg-primary/5 border border-primary/10 max-w-full">
            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider text-primary/70 pr-1 shrink-0">
              Rm {selectedRoom!.room_number}
            </span>
            {context.map(btn => <ActionBtn key={btn.key} btn={btn} />)}
          </div>
        </>
      )}

      {!selectedRoom && dirtyCount > 0 && (
        <>
          <Divider />
          <button
            type="button"
            onClick={go('/admin/housekeeping')}
            className="h-8 px-2 sm:px-2.5 rounded-lg text-[10px] sm:text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 bg-status-dirty/15 text-status-dirty border border-status-dirty/30 hover:bg-status-dirty/25 max-w-full"
          >
            <MdCleaningServices size={14} className="shrink-0" />
            <span className="truncate">{dirtyCount} dirty</span>
          </button>
        </>
      )}

      <Divider className="hidden sm:block" />

      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto sm:ml-auto">
        {ops.map(btn => <ActionBtn key={btn.key} btn={btn} />)}
      </div>
    </div>
  );
}
