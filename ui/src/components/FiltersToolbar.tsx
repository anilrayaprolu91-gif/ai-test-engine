import { Download, ListFilter, Search, X } from 'lucide-react';

interface FiltersToolbarProps {
  searchTerm: string;
  statusFilter: 'all' | 'passing' | 'failing';
  totalVisible: number;
  totalRows: number;
  autoRefreshEnabled: boolean;
  pageSize: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | 'passing' | 'failing') => void;
  onAutoRefreshChange: (value: boolean) => void;
  onPageSizeChange: (value: number) => void;
  onExportCsv: () => void;
}

export function FiltersToolbar({
  searchTerm,
  statusFilter,
  totalVisible,
  totalRows,
  autoRefreshEnabled,
  pageSize,
  onSearchChange,
  onStatusFilterChange,
  onAutoRefreshChange,
  onPageSizeChange,
  onExportCsv,
}: FiltersToolbarProps) {
  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== 'all';

  return (
    <section className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-5 shadow-[0_20px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <ListFilter className="h-4 w-4 text-sky-500" />
            Filter traceability matrix
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Showing {totalVisible} of {totalRows} BRDs.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative block min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Search BRD, requirement, or test case"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-300"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <select
            value={statusFilter}
            onChange={event => onStatusFilterChange(event.target.value as 'all' | 'passing' | 'failing')}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="passing">Passing only</option>
            <option value="failing">Failing only</option>
          </select>

          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/85 dark:text-slate-100">
            <input
              type="checkbox"
              checked={autoRefreshEnabled}
              onChange={event => onAutoRefreshChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
            />
            Auto-refresh 45s
          </label>

          <select
            value={pageSize}
            onChange={event => onPageSizeChange(Number(event.target.value))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/85 dark:text-slate-100"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('all');
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/85 dark:text-slate-100"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>
    </section>
  );
}