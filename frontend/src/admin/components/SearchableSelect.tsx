import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdExpandMore, MdSearch } from 'react-icons/md';
import { filterOptions } from '../constants/countries';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  emptyLabel?: string;
  allowCustom?: boolean;
  /** Abbreviations mapped to option labels (e.g. usa → United States) */
  aliases?: Record<string, string>;
  className?: string;
  variant?: 'dark' | 'light';
}

export default function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  emptyLabel = 'N/A',
  allowCustom = true,
  aliases,
  className = '',
  variant = 'dark',
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const displayValue = open ? query : (value || '');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => filterOptions(options, query, aliases),
    [options, query, aliases],
  );

  const PREVIEW_LIMIT = 60;
  const visible = useMemo(() => {
    if (!q && filtered.length > PREVIEW_LIMIT) return filtered.slice(0, PREVIEW_LIMIT);
    return filtered;
  }, [filtered, q]);

  const showTypeHint = !q && filtered.length > PREVIEW_LIMIT;

  const listItems = [
    ...(emptyLabel ? [{ value: '', label: emptyLabel }] : []),
    ...visible.map(o => ({ value: o, label: o })),
  ];

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const updateMenuPos = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPos();
    window.addEventListener('resize', updateMenuPos);
    window.addEventListener('scroll', updateMenuPos, true);
    return () => {
      window.removeEventListener('resize', updateMenuPos);
      window.removeEventListener('scroll', updateMenuPos, true);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if ((e.target as HTMLElement).closest(`[data-searchable-menu="${listId}"]`)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, listId]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (allowCustom) onChange(text);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight(h => Math.min(h + 1, listItems.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter' && open && listItems.length) {
      e.preventDefault();
      pick(listItems[highlight].value);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const isLight = variant === 'light';
  const fieldClass = [
    'w-full min-w-0 h-7 rounded-sm pl-2 pr-7 text-sm font-medium leading-none transition-all duration-150 box-border',
    isLight
      ? [
          'bg-white border border-slate-300 text-slate-800',
          'shadow-[inset_1px_1px_1px_rgba(0,0,0,0.04)]',
          'placeholder:text-slate-400 placeholder:font-normal',
          'hover:border-slate-400 hover:bg-slate-50/50',
          'focus:outline-none focus:border-blue-600 focus:bg-blue-50/40 focus:text-slate-900',
          'focus:ring-[3px] focus:ring-blue-500/35 focus:shadow-[0_1px_4px_rgba(37,99,235,0.15)]',
          open ? 'border-blue-600 ring-[3px] ring-blue-500/35 bg-blue-50/40 shadow-[0_1px_4px_rgba(37,99,235,0.15)]' : '',
        ].join(' ')
      : [
          'bg-gray-50 border border-white/15 text-slate-800',
          'placeholder:text-gray-600',
          'focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/40',
          open ? 'border-teal-600 ring-1 ring-[#aa8453]/40' : '',
        ].join(' '),
    className,
  ].join(' ');

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-form-type="other"
          data-lpignore="true"
          value={displayValue}
          placeholder={placeholder}
          className={fieldClass}
          onChange={e => onInputChange(e.target.value)}
          onFocus={() => {
            setOpen(true);
            setQuery(value);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle options"
          className={`absolute right-0 top-0 bottom-0 px-2 flex items-center transition-colors ${
            isLight ? 'text-slate-400 hover:text-blue-600' : 'text-gray-500 hover:text-teal-700'
          }`}
          onMouseDown={e => {
            e.preventDefault();
            if (open) {
              setOpen(false);
              setQuery('');
            } else {
              setOpen(true);
              setQuery(value);
              inputRef.current?.focus();
            }
          }}
        >
          <MdExpandMore
            size={18}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && createPortal(
        <ul
          id={listId}
          data-searchable-menu={listId}
          role="listbox"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          className={`fixed z-[200] max-h-56 overflow-y-auto rounded-sm py-0.5 shadow-lg ${
            isLight
              ? 'border border-slate-300 bg-white'
              : 'border border-white/15 bg-[#1e1e1e] shadow-2xl'
          }`}
        >
          {showTypeHint && (
            <li className={`px-3 py-1.5 text-[10px] border-b sticky top-0 ${
              isLight
                ? 'text-slate-500 border-slate-200 bg-slate-50'
                : 'text-gray-500 border-gray-200 bg-[#1e1e1e]'
            }`}>
              Type to search all {filtered.length} options…
            </li>
          )}
          {listItems.length === 0 ? (
            <li className={`px-3 py-2 text-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>No matches</li>
          ) : (
            listItems.map((item, i) => (
              <li
                key={item.label + item.value}
                role="option"
                aria-selected={value === item.value}
                className={[
                  'px-3 py-1.5 text-xs cursor-pointer transition-colors',
                  isLight
                    ? i === highlight
                      ? 'bg-blue-100 text-blue-900'
                      : value === item.value
                        ? 'bg-amber-50 text-amber-800'
                        : 'text-slate-700 hover:bg-slate-100'
                    : i === highlight
                      ? 'bg-teal-700/25 text-slate-800'
                      : value === item.value
                        ? 'bg-gray-50 text-teal-700'
                        : 'text-gray-200 hover:bg-white/10',
                ].join(' ')}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={e => {
                  e.preventDefault();
                  pick(item.value);
                }}
              >
                {item.label}
              </li>
            ))
          )}
          {allowCustom && q && !filtered.some(o => o.toLowerCase() === q) && (
            <li
              role="option"
              className={`px-3 py-1.5 text-xs border-t cursor-pointer ${
                isLight
                  ? 'text-slate-500 border-slate-200 hover:bg-slate-50'
                  : 'text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
              onMouseDown={e => {
                e.preventDefault();
                pick(query.trim());
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <MdSearch size={14} />
                Use &quot;{query.trim()}&quot;
              </span>
            </li>
          )}
        </ul>,
        document.body,
      )}
    </div>
  );
}
