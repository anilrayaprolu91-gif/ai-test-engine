import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatusCardProps {
  title: string;
  value: number;
  caption: string;
  icon: LucideIcon;
  tone?: 'default' | 'danger' | 'success';
}

export function StatusCard({
  title,
  value,
  caption,
  icon: Icon,
  tone = 'default',
}: StatusCardProps) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-200'
      : tone === 'success'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
        : 'border-slate-200 bg-white/80 text-slate-800 dark:border-slate-700/70 dark:bg-slate-800/65 dark:text-slate-100';

  const iconClass =
    tone === 'danger'
      ? 'bg-red-500/15 text-red-600 dark:text-red-300'
      : tone === 'success'
        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
        : 'bg-sky-500/15 text-sky-600 dark:text-sky-300';

  return (
    <div
      className={cn(
        'group rounded-3xl border p-5 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)]',
        toneClass,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">{title}</p>
          <p className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{value}</p>
        </div>
        <div className={cn('rounded-2xl p-3 transition-transform group-hover:scale-105', iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-8 text-sm opacity-80">{caption}</p>
    </div>
  );
}
