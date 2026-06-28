import { MdViewCarousel } from 'react-icons/md';
import CrudPage from '../components/CrudPage';
import type { ICellRendererParams } from 'ag-grid-community';

export default function CMSHeroSlides() {
  return (
    <CrudPage
      title="Hero Slides"
      icon={<MdViewCarousel size={24} />}
      endpoint="hero-slides"
      columns={[
        { field: 'title', headerName: 'Title', flex: 1, minWidth: 200 },
        { field: 'subtitle', headerName: 'Subtitle', width: 200 },
        { field: 'order', headerName: 'Order', width: 90 },
        { field: 'is_active', headerName: 'Active', width: 100,
          cellRenderer: (p: ICellRendererParams) => p.value ? '✓' : '✗' },
      ]}
      formFields={[
        { key: 'title', label: 'Title' },
        { key: 'subtitle', label: 'Subtitle' },
        { key: 'background_image', label: 'Background Image', type: 'image' },
        { key: 'cta_text', label: 'Button Text' },
        { key: 'cta_link', label: 'Button Link' },
        { key: 'order', label: 'Display Order', type: 'number' },
        { key: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
      defaultValues={{ order: 0, is_active: true }}
    />
  );
}
