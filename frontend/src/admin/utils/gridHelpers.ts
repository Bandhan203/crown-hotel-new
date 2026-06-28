import { type ColDef } from 'ag-grid-community';

export const BADGE = 'inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold leading-none whitespace-nowrap';

export const ACTIVE_BADGE: Record<string, string> = {
  true: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  false: 'bg-red-50 text-red-700 border border-red-200',
};

export const YES_BADGE = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
export const NO_BADGE = 'bg-slate-100 text-slate-600 border border-slate-200';

export const pinCol = { resizable: false, suppressSizeToFit: true };

export const gridDefaultColDef: ColDef = {
  sortable: true,
  resizable: true,
  suppressMovable: true,
  filter: false,
  cellClass: 'cell-muted',
};

export const actionBtn = 'inline-flex items-center justify-center rounded border transition shrink-0';
export const goldBtn = `${actionBtn} px-1.5 h-5 text-[10px] font-semibold text-teal-700 border-teal-600/35 bg-teal-50/50 hover:bg-teal-100`;
export const editBtn = `${actionBtn} w-5 h-5 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100`;
export const deleteBtn = `${actionBtn} w-5 h-5 text-red-700 border-red-200 bg-red-50 hover:bg-red-100`;
