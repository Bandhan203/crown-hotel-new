import { useRooms } from '../../contexts/RoomsContext';
import { useHotel } from '../../contexts/HotelContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import { BedDouble, Users, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Wrench, WifiOff, DollarSign } from 'lucide-react';

export function StatsBar() {
  const { rooms, folios, transactions } = useRooms();
  const { config } = useHotel();
  const { colors, theme } = useTheme();
  const { t } = useLang();

  const today = config.systemDate;
  const occupied = rooms.filter(r => r.status === 'occupied').length;
  const vacant = rooms.filter(r => r.status === 'vacant').length;
  const dirty = rooms.filter(r => r.status === 'dirty').length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;
  const total = rooms.length;
  const availableForSale = total - occupied - maintenance;
  const occupancyPct = Math.round((occupied / (total - maintenance)) * 100);

  const arrivalsToday = folios.filter(f => f.checkIn === today).length;
  const departuresToday = folios.filter(f => f.checkOut === today && f.status === 'inhouse').length;

  const todayRevenue = transactions
    .filter(t => t.date === today && t.type !== 'void' && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const roomRevenue = transactions
    .filter(t => t.date === today && t.category === 'Room Rent' && t.type !== 'void')
    .reduce((sum, t) => sum + t.amount, 0);
  const adr = occupied > 0 ? Math.round(roomRevenue / occupied) : 0;

  const stats = [
    { label: t('totalRooms'), value: total, icon: BedDouble, color: colors.primary, bg: colors.primaryBg },
    { label: t('occupied'), value: occupied, icon: Users, color: colors.danger, bg: colors.dangerBg },
    { label: t('vacant'), value: vacant, icon: BedDouble, color: colors.success, bg: colors.successBg },
    { label: t('dirty'), value: dirty, icon: Wrench, color: colors.orange, bg: colors.orangeBg },
    { label: 'OOO', value: maintenance, icon: WifiOff, color: colors.purple, bg: colors.purpleBg },
    { label: t('occupancy'), value: `${occupancyPct}%`, icon: TrendingUp, color: '#a78bfa', bg: colors.purpleBg },
    { label: t('arrivals'), value: arrivalsToday, icon: ArrowDownToLine, color: colors.success, bg: colors.successBg },
    { label: t('departures'), value: departuresToday, icon: ArrowUpFromLine, color: colors.orange, bg: colors.orangeBg },
    { label: t('adr') + ' (৳)', value: adr.toLocaleString(), icon: DollarSign, color: colors.warning, bg: colors.warningBg },
    { label: t('todayRevenue') + ' (৳)', value: todayRevenue.toLocaleString(), icon: TrendingUp, color: colors.success, bg: colors.successBg },
  ];

  return (
    <div style={{ display: 'flex', gap: 6, padding: '10px 16px', background: colors.bgSecondary, borderBottom: `1px solid ${colors.borderLight}`, overflowX: 'auto', flexShrink: 0 }}>
      {stats.map(stat => (
        <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: stat.bg, border: `1px solid ${stat.color}33`, borderRadius: 8, padding: '7px 12px', flexShrink: 0, minWidth: 90, boxShadow: theme === 'light' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>
          <stat.icon size={14} color={stat.color} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: stat.color, lineHeight: 1, fontFamily: 'monospace' }}>{stat.value}</div>
            <div style={{ fontSize: 9, color: colors.textMuted, marginTop: 2, whiteSpace: 'nowrap', letterSpacing: 0.3 }}>{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
