import { MoonStar, RefreshCw, SunMedium } from 'lucide-react';
import { formatRelativeTimestamp } from '../lib/utils';

interface DashboardHeaderProps {
  buildId?: string;
  updatedAt?: string;
  refreshing: boolean;
  lastRefreshAttemptedAt?: string;
  lastSuccessfulRefreshAt?: string;
  autoRefreshEnabled: boolean;
  refreshError?: string;
  onRefresh: () => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
}

export function DashboardHeader({
  buildId,
  updatedAt,
  refreshing,
  lastRefreshAttemptedAt,
  lastSuccessfulRefreshAt,
  autoRefreshEnabled,
  refreshError,
  onRefresh,
  onToggleTheme,
  theme,
}: DashboardHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_30px_120px_-50px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_top_left,rgba(248,113,113,0.12),transparent_30%)]" />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-600 dark:text-sky-300">Release Health</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-5xl">
            AI-Native Quality Controller
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
            Business requirement visibility for every build, with fast signals on what is broken and what is safe to ship.
          </p>
        </div>

        <div className="flex flex-col gap-3 self-start md:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-sky-400/50 dark:hover:text-sky-200"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100"
            >
              {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>

          <div className="grid gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-200">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Build ID:</span> {buildId || 'Unavailable'}
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Updated:</span> {formatRelativeTimestamp(updatedAt || '')}
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Last checked:</span> {formatRelativeTimestamp(lastRefreshAttemptedAt || '')}
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Refresh health:</span>{' '}
              {refreshError ? 'Retry needed' : lastSuccessfulRefreshAt ? 'Healthy' : 'Pending'}
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Auto-refresh:</span> {autoRefreshEnabled ? 'On' : 'Off'}
            </div>
            {lastSuccessfulRefreshAt && (
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">Last success:</span> {formatRelativeTimestamp(lastSuccessfulRefreshAt)}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
