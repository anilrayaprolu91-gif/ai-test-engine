import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { SyncStatusState } from '../types/dashboard';

export function StatusBadge({ status }: { status: SyncStatusState }) {
  const failing = status === 'failing';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors',
        failing
          ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300',
      )}
    >
      {failing ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}
