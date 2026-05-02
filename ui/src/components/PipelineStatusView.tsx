import { CheckCircle2, ChevronDown, ChevronRight, Clock, Loader2, Play, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { PipelineJob, PipelineRun, PipelineRunConclusion, PipelineRunStatus, WorkflowInfo } from '../types/dashboard';

interface PipelineStatusViewProps {
  runs: PipelineRun[];
  workflows: WorkflowInfo[];
  loading: boolean;
  error: string | null;
  triggering: boolean;
  triggerStatus: string | null;
  onRefresh: () => void;
  onTrigger: (workflowId: number, workflowName: string) => void;
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const ms = end - start;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatRelative(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusIcon({ status, conclusion, size = 4 }: { status: PipelineRunStatus; conclusion: PipelineRunConclusion; size?: number }) {
  const cls = `h-${size} w-${size}`;
  if (status === 'in_progress' || status === 'queued') {
    return <Loader2 className={`${cls} animate-spin text-sky-500`} />;
  }
  if (conclusion === 'success') return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (conclusion === 'failure') return <XCircle className={`${cls} text-red-500`} />;
  if (conclusion === 'cancelled') return <XCircle className={`${cls} text-slate-400`} />;
  if (conclusion === 'skipped') return <ChevronRight className={`${cls} text-slate-400`} />;
  return <Clock className={`${cls} text-amber-400`} />;
}

function conclusionBadge(status: PipelineRunStatus, conclusion: PipelineRunConclusion) {
  if (status === 'in_progress') return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
  if (status === 'queued') return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  if (conclusion === 'success') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (conclusion === 'failure') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
}

function conclusionLabel(status: PipelineRunStatus, conclusion: PipelineRunConclusion) {
  if (status === 'queued') return 'Queued';
  if (status === 'in_progress') return 'Running';
  return conclusion ? conclusion.replace(/_/g, ' ') : 'unknown';
}

function JobRow({ job }: { job: PipelineJob }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-800/40">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <StatusIcon status={job.status} conclusion={job.conclusion} size={4} />
        <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{job.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${conclusionBadge(job.status, job.conclusion)}`}>
          {conclusionLabel(job.status, job.conclusion)}
        </span>
        {(job.startedAt || job.completedAt) && (
          <span className="text-xs text-slate-400">{formatDuration(job.startedAt, job.completedAt)}</span>
        )}
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>
      {expanded && job.steps.length > 0 && (
        <div className="border-t border-slate-100 px-4 pb-3 dark:border-slate-700/50">
          <ul className="mt-2 space-y-1">
            {job.steps.map(step => (
              <li key={step.number} className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs hover:bg-slate-100/70 dark:hover:bg-slate-700/40">
                <StatusIcon status={step.status} conclusion={step.conclusion} size={3} />
                <span className={`flex-1 ${step.conclusion === 'skipped' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                  {step.name}
                </span>
                {step.startedAt && (
                  <span className="text-slate-400">{formatDuration(step.startedAt, step.completedAt)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RunCard({ run }: { run: PipelineRun }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[1.5rem] border border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <StatusIcon status={run.status} conclusion={run.conclusion} size={5} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">{run.workflowName}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${conclusionBadge(run.status, run.conclusion)}`}>
              {conclusionLabel(run.status, run.conclusion)}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              {run.branch}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {run.commitSha} · {run.commitMessage || '(no message)'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-slate-400">{formatRelative(run.createdAt)}</span>
          <a
            href={run.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-sky-500 hover:underline"
          >
            View on GitHub ↗
          </a>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-4 pt-3 dark:border-slate-700/50">
          {run.jobs.length === 0 ? (
            <p className="text-xs text-slate-400">No job details available yet.</p>
          ) : (
            <div className="space-y-2">
              {run.jobs.map(job => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PipelineStatusView({
  runs,
  workflows,
  loading,
  error,
  triggering,
  triggerStatus,
  onRefresh,
  onTrigger,
}: PipelineStatusViewProps) {
  const dispatchableWorkflows = workflows.filter(w => w.hasDispatch && w.state === 'active');

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_20px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Pipeline Status</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Latest GitHub Actions runs · Click a run to see job steps and results.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Trigger buttons ──────────────────────────────────────── */}
        {dispatchableWorkflows.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Trigger a pipeline run:</p>
            <div className="flex flex-wrap gap-2">
              {dispatchableWorkflows.map(wf => (
                <button
                  key={wf.id}
                  type="button"
                  onClick={() => onTrigger(wf.id, wf.name)}
                  disabled={triggering}
                  className="flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-600 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  {triggering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Run: {wf.name}
                </button>
              ))}
            </div>
            {triggerStatus && (
              <p className={`mt-2 text-xs ${triggerStatus.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {triggerStatus}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* ── Run list ─────────────────────────────────────────────── */}
      {loading && runs.length === 0 ? (
        <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading pipeline runs…</span>
        </div>
      ) : runs.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-12">No workflow runs found.</p>
      ) : (
        <div className="space-y-3">
          {runs.map(run => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
