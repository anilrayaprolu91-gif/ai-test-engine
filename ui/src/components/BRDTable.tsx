import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, ArrowUp, ArrowDown, ShieldCheck, X } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { BRDSortKey, SortDirection, SyncStatusRow } from '../types/dashboard';

export function BRDTable({
  rows,
  hasActiveFilters,
  sortKey,
  sortDirection,
  currentPage,
  totalPages,
  totalRows,
  pageSize,
  onSort,
  onPageChange,
}: {
  rows: SyncStatusRow[];
  hasActiveFilters: boolean;
  sortKey: BRDSortKey;
  sortDirection: SortDirection;
  currentPage: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  onSort: (key: BRDSortKey) => void;
  onPageChange: (page: number) => void;
}) {
  const [selectedBrdId, setSelectedBrdId] = useState<string | null>(null);

  const selectedRow = useMemo(() => {
    if (!selectedBrdId) {
      return null;
    }

    return rows.find(row => row.brdId === selectedBrdId) || null;
  }, [rows, selectedBrdId]);

  const selectedCases = useMemo(() => {
    if (!selectedRow) {
      return [];
    }

    return (selectedRow.testCases && selectedRow.testCases.length > 0
      ? selectedRow.testCases
      : [{ id: selectedRow.testCaseId, description: selectedRow.requirement }]
    ).filter(testCase => testCase.id);
  }, [selectedRow]);

  useEffect(() => {
    if (!selectedBrdId) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedBrdId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedBrdId]);

  const renderSortButton = (label: string, column: BRDSortKey) => {
    const active = sortKey === column;
    const Icon = !active ? ArrowDownUp : sortDirection === 'asc' ? ArrowUp : ArrowDown;

    return (
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 transition hover:text-slate-800 dark:hover:text-slate-200"
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  return (
    <>
      <section className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_20px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Test Cases</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Full traceability matrix across business requirements and generated test cases.
          </p>
        </div>
        <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-200 md:inline-flex md:items-center md:gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Latest sync matrix
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/60">
            <thead className="bg-slate-100/80 dark:bg-slate-800/85">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">{renderSortButton('BRD_ID', 'brdId')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">{renderSortButton('Requirement', 'requirement')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">{renderSortButton('Test Cases', 'testCaseId')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">{renderSortButton('Status', 'status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white/90 dark:divide-slate-700/60 dark:bg-slate-900/55">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-300">
                    {hasActiveFilters
                      ? 'No BRDs match the current search and status filters.'
                      : 'No BRD results are available yet.'}
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr
                    key={row.brdId}
                    className={`transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                      row.status === 'failing' ? 'bg-red-500/5 dark:bg-red-400/5' : ''
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">{row.brdId}</td>
                    <td className="min-w-[320px] px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{row.requirement}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                      {(() => {
                        const caseCount = (row.testCases && row.testCases.length > 0
                          ? row.testCases
                          : [{ id: row.testCaseId, description: row.requirement }]
                        ).filter(testCase => testCase.id).length;

                        const isSelected = selectedBrdId === row.brdId;

                        return (
                          <button
                            type="button"
                            onClick={() => setSelectedBrdId(row.brdId)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              isSelected
                                ? 'border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-400/50 dark:bg-sky-400/10 dark:text-sky-200'
                                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-slate-500'
                            }`}
                          >
                            {caseCount} {caseCount === 1 ? 'Test Case' : 'Test Cases'}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={row.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalRows > 0 && (
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/80 pt-4 text-sm text-slate-500 dark:border-slate-700/70 dark:text-slate-300 md:flex-row md:items-center md:justify-between">
          <div>
            Page {currentPage} of {totalPages} · Showing up to {pageSize} rows per page
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-full border border-slate-200 px-3 py-2 text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-full border border-slate-200 px-3 py-2 text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </section>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close test case descriptions"
            onClick={() => setSelectedBrdId(null)}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedRow.brdId} test case descriptions`}
            className="relative z-10 w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {selectedRow.brdId} Test Case Descriptions
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{selectedRow.requirement}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBrdId(null)}
                className="rounded-full border border-slate-300 p-1.5 text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                aria-label="Close popup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/65">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/60">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">TC_ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                  {selectedCases.map(testCase => (
                    <tr key={`detail-${selectedRow.brdId}-${testCase.id}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{testCase.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{testCase.description || 'No description available.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
