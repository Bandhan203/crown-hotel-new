import { MdStar } from 'react-icons/md';
import CrudPage from '../components/CrudPage';
import type { ICellRendererParams } from 'ag-grid-community';

export default function CMSTestimonials() {
  return (
    <CrudPage
      title="Testimonials"
      icon={<MdStar size={24} />}
      endpoint="testimonials"
      columns={[
        { field: 'guest_name', headerName: 'Guest', flex: 1, minWidth: 150 },
        { field: 'rating', headerName: 'Rating', width: 100,
          cellRenderer: (p: ICellRendererParams) => '⭐'.repeat(p.value || 0) },
        { field: 'is_active', headerName: 'Active', width: 100,
          cellRenderer: (p: ICellRendererParams) => p.value ? '✓' : '✗' },
      ]}
      formFields={[
        { key: 'guest_name', label: 'Guest Name' },
        { key: 'guest_role', label: 'Guest Title', placeholder: 'e.g. Business Traveler' },
        { key: 'avatar', label: 'Avatar', type: 'image' },
        { key: 'content', label: 'Testimonial', type: 'textarea' },
        { key: 'rating', label: 'Rating (1-5)', type: 'number' },
        { key: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
      defaultValues={{ rating: 5, is_active: true }}
    />
  );
}
