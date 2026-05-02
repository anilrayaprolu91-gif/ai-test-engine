import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SyncStatusRow } from '../types/dashboard';

export function FailingBRDTable({ rows, hasActiveFilters }: { rows: SyncStatusRow[]; hasActiveFilters: boolean }) {
  return (
    <section className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_20px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Currently Failing BRD IDs</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Stakeholder-facing view of the business requirements impacted in the latest build.
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/60">
            <thead className="bg-slate-100/80 dark:bg-slate-800/85">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">BRD_ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Test Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white/90 dark:divide-slate-700/60 dark:bg-slate-900/55">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {hasActiveFilters ? 'No failing BRDs match the current filters' : 'No failing BRD IDs'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                          {hasActiveFilters
                            ? 'Try clearing or adjusting the dashboard filters.'
                            : 'Latest build is clean for all mapped business requirements.'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.brdId} className="transition hover:bg-red-500/5 dark:hover:bg-red-400/5">
                    <td className="px-4 py-4 align-top text-sm font-semibold text-red-700 dark:text-red-300">
                      <div className="inline-flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {row.brdId}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{row.requirement}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.testCaseId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
