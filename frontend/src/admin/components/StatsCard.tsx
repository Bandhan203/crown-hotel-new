import type { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  color?: string;
  valueClassName?: string;
  compact?: boolean;
}

export default function StatsCard({ title, value, icon, trend, color = '#aa8453', valueClassName, compact }: StatsCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider">{title}</p>
          <p className={`font-bold text-white mt-1 ${valueClassName || 'text-2xl'}`}>{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.positive ? '▲' : '▼'} {trend.value}
            </p>
          )}
        </div>
        <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
