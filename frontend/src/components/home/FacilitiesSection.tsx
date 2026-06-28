import { useEffect, useMemo, useState } from 'react';
import SectionHeading from '../SectionHeading';
import { FiCheck } from 'react-icons/fi';
import api from '../../services/api';
import { unwrapList } from '../../utils/cmsList';

type Facility = {
  id: number;
  name: string;
  category: 'COMPLIMENTARY' | 'GENERAL' | 'FEATURE';
};

const FALLBACK_COMPLIMENTARY = [
  'Welcome Drink on Arrival',
  'Mineral Water',
  'Buffet Breakfast',
  'High Speed Wi-fi',
  'Health Club Access',
  'Room Amenities & Supplies',
  'On Arrival Fruit Basket',
  'In Room Tea/Coffee Making Facilities',
  'Cold Towel',
  'Car Parking',
];

const FALLBACK_GENERAL = [
  '24 Hours Room Service',
  '24 Hours Front Office',
  'Fully Air Conditioned',
  'Banquet & Conference',
  'Private Meeting Room',
  'Multicuisine Restaurant',
  'Out & Industrial Catering',
  'On Call Doctor',
  'Pick Up & Drop Off Service',
  'Access Controlled Elevator',
  'Electronic Safe Box In Room',
  'Basement Parking',
];

export default function FacilitiesSection() {
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadFacilities(): Promise<void> {
      try {
        const res = await api.get<Facility[] | { results: Facility[] }>('/facilities/');
        if (mounted) {
          setFacilities(unwrapList(res.data));
        }
      } catch {
        if (mounted) setFacilities([]);
      }
    }

    void loadFacilities();
    return () => {
      mounted = false;
    };
  }, []);

  const complimentary = useMemo(() => {
    const fromApi = facilities
      .filter((f) => f.category === 'COMPLIMENTARY')
      .map((f) => f.name);
    return fromApi.length > 0 ? fromApi : FALLBACK_COMPLIMENTARY;
  }, [facilities]);

  const general = useMemo(() => {
    const fromApi = facilities
      .filter((f) => f.category === 'GENERAL')
      .map((f) => f.name);
    return fromApi.length > 0 ? fromApi : FALLBACK_GENERAL;
  }, [facilities]);

  return (
    <section className="py-20 bg-[var(--color-light)]">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeading subtitle="HOTEL CROWN" title="Amenities & Facilities" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h4 className="font-[var(--font-heading)] text-xl text-[var(--color-dark)] mb-6">
              Complimentary Services
            </h4>
            <ul className="space-y-3">
              {complimentary.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-body)]">
                  <FiCheck className="text-[var(--color-primary)] mt-0.5 shrink-0" size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h4 className="font-[var(--font-heading)] text-xl text-[var(--color-dark)] mb-6">
              General Facilities
            </h4>
            <ul className="space-y-3">
              {general.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-body)]">
                  <FiCheck className="text-[var(--color-primary)] mt-0.5 shrink-0" size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
