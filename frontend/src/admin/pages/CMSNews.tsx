import { MdNewspaper } from 'react-icons/md';
import { useMemo, useState } from 'react';
import CrudPage from '../components/CrudPage';
import type { ICellRendererParams } from 'ag-grid-community';

export default function CMSNews() {
  const [search, setSearch] = useState('');
  const [published, setPublished] = useState<'all' | 'true' | 'false'>('all');
  const [category, setCategory] = useState('');

  const gridQueryParams = useMemo(() => ({
    search: search.trim() || undefined,
    is_published: published === 'all' ? undefined : published,
    category: category.trim() || undefined,
  }), [search, published, category]);

  return (
    <CrudPage
      title="News Posts"
      icon={<MdNewspaper size={24} />}
      endpoint="news"
      gridQueryParams={gridQueryParams}
      filterToolbar={(
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title"
            className="w-full px-3 py-2 bg-[#121212] border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none"
          />
          <select
            value={published}
            onChange={(e) => setPublished(e.target.value as 'all' | 'true' | 'false')}
            className="w-full px-3 py-2 bg-[#121212] border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none"
          >
            <option value="all">All publish states</option>
            <option value="true">Published only</option>
            <option value="false">Draft only</option>
          </select>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Filter by category"
            className="w-full px-3 py-2 bg-[#121212] border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none"
          />
        </div>
      )}
      columns={[
        { field: 'title', headerName: 'Title', flex: 1, minWidth: 200 },
        { field: 'category', headerName: 'Category', width: 140 },
        { field: 'author_name', headerName: 'Author', width: 150,
          valueGetter: (p) => p.data?.author_name || '-' },
        { field: 'slug', headerName: 'Slug', width: 180 },
        { field: 'is_published', headerName: 'Published', width: 110,
          cellRenderer: (p: ICellRendererParams) => p.value ? '✓ Yes' : '✗ No' },
        { field: 'published_at', headerName: 'Published At', width: 140,
          valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '-' },
        { field: 'updated_at', headerName: 'Updated', width: 120,
          valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '-' },
        { field: 'created_at', headerName: 'Created', width: 120,
          valueFormatter: p => new Date(p.value).toLocaleDateString() },
      ]}
      formFields={[
        { key: 'title', label: 'Title' },
        { key: 'slug', label: 'Slug', placeholder: 'auto-generated if empty' },
        { key: 'category', label: 'Category', placeholder: 'e.g. HOTEL, EVENTS, SPA' },
        { key: 'image', label: 'Featured Image', type: 'image' },
        { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
        { key: 'content', label: 'Content', type: 'textarea' },
        { key: 'author', label: 'Author (User ID)' },
        { key: 'published_at', label: 'Published At (ISO date-time)' },
        { key: 'is_published', label: 'Published', type: 'checkbox' },
      ]}
      defaultValues={{ is_published: true }}
    />
  );
}
