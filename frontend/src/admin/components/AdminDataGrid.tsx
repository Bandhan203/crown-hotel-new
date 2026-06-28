import { useCallback, useEffect, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef } from 'ag-grid-community';
import api from '../../services/api';
import { gridDefaultColDef } from '../utils/gridHelpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const EMPTY_QUERY: Record<string, string | number | boolean | undefined> = {};

interface Props {
  url: string;
  columnDefs: ColDef[];
  pageSize?: number;
  enableSelection?: boolean;
  rowId?: string;
  queryParams?: Record<string, string | number | boolean | undefined>;
  refreshKey?: number | string;
  rowLabel?: string;
  showExport?: boolean;
}

export default function AdminDataGrid({
  url,
  columnDefs,
  pageSize = 15,
  enableSelection = false,
  rowId = 'id',
  queryParams = EMPTY_QUERY,
  refreshKey = 0,
  rowLabel = 'record',
  showExport = false,
}: Props) {
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [sortModel, setSortModel] = useState<any[]>([]);
  const gridRef = useRef<any>(null);

  const buildOrdering = useCallback(() => {
    if (!sortModel.length) return undefined;
    const s = sortModel[0];
    return (s.sort === 'desc' ? '-' : '') + s.colId;
  }, [sortModel]);

  const fetchPage = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const ordering = buildOrdering();
      const params: Record<string, unknown> = { page: p, page_size: pageSize, ...queryParams };
      if (ordering) params.ordering = ordering;
      const res = await api.get(url, { params });
      const data = res.data.results ?? res.data;
      setRowData(data);
      setTotal(res.data.count ?? null);
    } catch {
      setRowData([]);
      setTotal(0);
    }
    setLoading(false);
  }, [url, pageSize, buildOrdering, queryParams]);

  useEffect(() => { setPage(1); }, [url, refreshKey]);
  useEffect(() => { fetchPage(page); }, [fetchPage, page]);

  const fitGridColumns = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.sizeColumnsToFit({ defaultMinWidth: 68 });
  }, []);

  const onGridReady = useCallback(() => {
    fitGridColumns();
  }, [fitGridColumns]);

  const onSortChanged = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const sm = api.getColumnState()
      .filter((c: any) => c.sort)
      .map((c: any) => ({ colId: c.colId!, sort: c.sort! }));
    setSortModel(sm);
    setPage(1);
  }, []);

  const totalPages = total !== null ? Math.ceil(total / pageSize) || 1 : 1;
  const label = total === 1 ? rowLabel : `${rowLabel}s`;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-[#141414] shadow-lg">
      {showExport && (
        <div className="flex justify-end px-3 py-2 border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => gridRef.current?.api?.exportDataAsCsv()}
            className="px-3 py-1 text-xs font-medium rounded border border-gray-200 text-gray-600 hover:border-teal-600/50 hover:text-slate-800 transition"
          >
            Export CSV
          </button>
        </div>
      )}

      <div className="ag-theme-quartz ag-theme-bookings w-full" style={{ height: 500 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full bg-white">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={gridDefaultColDef}
            rowHeight={40}
            headerHeight={38}
            enableBrowserTooltips={true}
            suppressPaginationPanel={true}
            pagination={false}
            suppressCellFocus={true}
            suppressHorizontalScroll={true}
            animateRows={false}
            onGridReady={onGridReady}
            onFirstDataRendered={fitGridColumns}
            onGridSizeChanged={fitGridColumns}
            onSortChanged={onSortChanged}
            rowSelection={enableSelection ? 'multiple' : undefined}
            getRowId={params => String(params.data[rowId])}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {total !== null
            ? `${total} ${label} · showing page ${page} of ${totalPages}`
            : 'Loading...'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-xs font-medium rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-teal-600/50 hover:text-slate-800 transition"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500 min-w-[4.5rem] text-center">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-xs font-medium rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-teal-600/50 hover:text-slate-800 transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
