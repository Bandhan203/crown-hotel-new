import type { ReactNode } from 'react';
import {
  MdMeetingRoom,
  MdRestaurant,
  MdLocalParking,
  MdSpa,
  MdPool,
  MdFitnessCenter,
} from 'react-icons/md';
import { FaGlassCheers, FaWifi, FaCar, FaConciergeBell, FaCoffee } from 'react-icons/fa';
import { FiCheck } from 'react-icons/fi';

const ICON_MAP: Record<string, ReactNode> = {
  MdMeetingRoom: <MdMeetingRoom size={28} />,
  MdRestaurant: <MdRestaurant size={28} />,
  MdLocalParking: <MdLocalParking size={28} />,
  MdSpa: <MdSpa size={28} />,
  MdPool: <MdPool size={28} />,
  MdFitnessCenter: <MdFitnessCenter size={28} />,
  FaGlassCheers: <FaGlassCheers size={28} />,
  FaWifi: <FaWifi size={28} />,
  FaCar: <FaCar size={28} />,
  FaConciergeBell: <FaConciergeBell size={28} />,
  FaCoffee: <FaCoffee size={28} />,
  FiCheck: <FiCheck size={16} />,
};

export function renderServiceIcon(iconName: string | null | undefined, size = 28): ReactNode {
  if (!iconName) {
    return <MdMeetingRoom size={size} />;
  }

  const mapped = ICON_MAP[iconName];
  if (mapped) return mapped;

  const lower = iconName.toLowerCase();
  if (lower.includes('restaurant')) return <MdRestaurant size={size} />;
  if (lower.includes('spa')) return <MdSpa size={size} />;
  if (lower.includes('parking') || lower.includes('garage')) return <MdLocalParking size={size} />;
  if (lower.includes('pool')) return <MdPool size={size} />;
  if (lower.includes('wifi')) return <FaWifi size={size} />;

  return <MdMeetingRoom size={size} />;
}
