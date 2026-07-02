import { useEffect, useMemo, useState } from 'react';
import SectionHeading from '../SectionHeading';
import { FiCheck } from 'react-icons/fi';
import api from '../../services/api';
import { unwrapList } from '../../utils/cmsList';
import { pickBySelectedIds, type HomeSectionConfig } from '../../hooks/useHomeCMS';

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

export default function FacilitiesSection({ config }: { config?: HomeSectionConfig }) {
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
      .filter((f) => f.category === 'COMPLIMENTARY');
    const picked = pickBySelectedIds(fromApi, config?.complimentary_selected_ids, config?.complimentary_limit || 20)
      .map((f) => f.name);
    return picked.length > 0 ? picked : FALLBACK_COMPLIMENTARY;
  }, [facilities, config?.complimentary_limit, config?.complimentary_selected_ids]);

  const general = useMemo(() => {
    const fromApi = facilities
      .filter((f) => f.category === 'GENERAL');
    const picked = pickBySelectedIds(fromApi, config?.general_selected_ids, config?.general_limit || 20)
      .map((f) => f.name);
    return picked.length > 0 ? picked : FALLBACK_GENERAL;
  }, [facilities, config?.general_limit, config?.general_selected_ids]);

  return (
    <section className="py-20 bg-[var(--color-light)]">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeading
          subtitle={config?.subtitle || 'HOTEL CROWN'}
          title={config?.title || 'Amenities & Facilities'}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h4 className="font-[var(--font-heading)] text-xl text-[var(--color-dark)] mb-6">
              {config?.complimentary_title || 'Complimentary Services'}
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
              {config?.general_title || 'General Facilities'}
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
