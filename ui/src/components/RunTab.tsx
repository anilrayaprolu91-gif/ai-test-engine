import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Loader2, Play, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import type { ExecutionTestResult, PipelineRun, RunTestEntry, SyncStatusRow, TestExecution } from '../types/dashboard';

// ── helpers ──────────────────────────────────────────────────────────────────

function buildRunEntries(rows: SyncStatusRow[]): RunTestEntry[] {
  return rows.map(row => ({
    brdId: row.brdId,
    requirement: row.requirement,
    testCaseId: row.testCaseId,
    specFile: `tests/generated/${row.testCaseId}.spec.ts`,
    status: row.status,
  }));
}

function statusBadge(status: 'passed' | 'failed' | 'pending' | 'running' | 'mixed' | string) {
  if (status === 'passed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (status === 'failed') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (status === 'running') return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
  if (status === 'mixed') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'passed') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-sky-500" />;
  return <span className="h-4 w-4 rounded-full border-2 border-slate-300 inline-block" />;
}

function resolveExecutionStatus(tests: ExecutionTestResult[]): TestExecution['overallStatus'] {
  if (tests.every(t => t.result === 'pending')) return 'running';
  const allPassed = tests.every(t => t.result === 'passed');
  const anyFailed = tests.some(t => t.result === 'failed');
  if (allPassed) return 'passed';
  if (anyFailed && !allPassed) return 'mixed';
  return 'running';
}

/** Find the latest pipeline run for a given spec file based on commit message heuristic */
function findPipelineRun(specFile: string, runs: PipelineRun[]): PipelineRun | null {
  const tcId = specFile.replace(/^.*\//, '').replace(/\.spec\.ts$/, '');
  return (
    runs.find(r => r.commitMessage.includes(tcId) || r.name.includes(tcId)) ??
    runs[0] ??
    null
  );
}

// ── sub-components ───────────────────────────────────────────────────────────

function TestListTable({
  entries,
  selected,
  onToggle,
  onSelectAll,
  onSelectByBrd,
}: {
  entries: RunTestEntry[];
  selected: Set<string>;
  onToggle: (tcId: string) => void;
  onSelectAll: () => void;
  onSelectByBrd: (brdId: string) => void;
}) {
  const [brdFilter, setBrdFilter] = useState('');

  const uniqueBrds = useMemo(() => [...new Set(entries.map(e => e.brdId))].sort(), [entries]);

  const visible = useMemo(
    () => entries.filter(e => !brdFilter || e.brdId === brdFilter),
    [entries, brdFilter],
  );

  const allSelected = visible.length > 0 && visible.every(e => selected.has(e.testCaseId));

  const handleHeaderCheck = () => {
    if (allSelected) {
      visible.forEach(e => { if (selected.has(e.testCaseId)) onToggle(e.testCaseId); });
    } else {
      visible.forEach(e => { if (!selected.has(e.testCaseId)) onToggle(e.testCaseId); });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={brdFilter}
          onChange={e => setBrdFilter(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">All BRDs</option>
          {uniqueBrds.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {uniqueBrds.map(brd => (
          <button
            key={brd}
            type="button"
            onClick={() => onSelectByBrd(brd)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-400/60 dark:hover:text-sky-300"
          >
            Select {brd}
          </button>
        ))}

        <button
          type="button"
          onClick={onSelectAll}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          Select All
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/60">
            <thead className="bg-slate-100/80 dark:bg-slate-800/85">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleHeaderCheck}
                    className="rounded accent-sky-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">BRD ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Test Case</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Spec File</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Last Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white/90 dark:divide-slate-700/60 dark:bg-slate-900/55">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    No test cases found.
                  </td>
                </tr>
              ) : (
                visible.map(entry => (
                  <tr
                    key={entry.testCaseId}
                    onClick={() => onToggle(entry.testCaseId)}
                    className={cn(
                      'cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5',
                      selected.has(entry.testCaseId) && 'bg-sky-50/60 dark:bg-sky-900/10',
                    )}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(entry.testCaseId)}
                        onChange={() => onToggle(entry.testCaseId)}
                        className="rounded accent-sky-500"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{entry.brdId}</td>
                    <td className="min-w-[240px] px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{entry.requirement}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-sky-700 dark:text-sky-300">{entry.testCaseId}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400 dark:text-slate-400 font-mono">{entry.specFile}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', statusBadge(entry.status))}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ExecutionRow({ execution }: { execution: TestExecution }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-[1.5rem] border border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <StatusIcon status={execution.overallStatus} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{execution.label}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(execution.createdAt).toLocaleString()} · {execution.tests.length} test{execution.tests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', statusBadge(execution.overallStatus))}>
          {execution.overallStatus}
        </span>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-4 pt-3 dark:border-slate-700/50">
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/70">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/60">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">BRD</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Requirement</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Test Case</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Spec File</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Result</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white/90 dark:divide-slate-700/60 dark:bg-slate-900/55">
                {execution.tests.map(t => (
                  <tr key={`${execution.id}-${t.testCaseId}`} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{t.brdId}</td>
                    <td className="min-w-[200px] px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{t.requirement}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-sky-700 dark:text-sky-300">{t.testCaseId}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-slate-400">{t.specFile}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', statusBadge(t.result))}>
                        <StatusIcon status={t.result} />
                        {t.result}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.pipelineUrl ? (
                        <a
                          href={t.pipelineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline dark:text-sky-400"
                        >
                          <span className={cn('mr-1 h-2 w-2 rounded-full', t.pipelineStatus === 'success' ? 'bg-emerald-500' : t.pipelineStatus === 'failure' ? 'bg-red-500' : 'bg-amber-400')} />
                          {t.pipelineStatus ?? 'pending'}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

interface RunTabProps {
  rows: SyncStatusRow[];
  pipelineRuns: PipelineRun[];
  executions: TestExecution[];
  onRun: (selected: RunTestEntry[]) => void;
  running: boolean;
}

export function RunTab({ rows, pipelineRuns, executions, onRun, running }: RunTabProps) {
  const entries = useMemo(() => buildRunEntries(rows), [rows]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (tcId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(tcId) ? next.delete(tcId) : next.add(tcId);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(entries.map(e => e.testCaseId)));

  const selectByBrd = (brdId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      entries.filter(e => e.brdId === brdId).forEach(e => next.add(e.testCaseId));
      return next;
    });
  };

  const handleRun = () => {
    const toRun = entries.filter(e => selected.has(e.testCaseId));
    if (toRun.length === 0) return;
    onRun(toRun);
    setSelected(new Set());
  };

  const enrichedExecutions = useMemo<TestExecution[]>(() => {
    return executions.map(ex => ({
      ...ex,
      tests: ex.tests.map(t => {
        if (t.pipelineUrl) return t;
        const run = findPipelineRun(t.specFile, pipelineRuns);
        return {
          ...t,
          pipelineUrl: run?.htmlUrl ?? null,
          pipelineStatus: run?.conclusion ?? null,
        };
      }),
      overallStatus: resolveExecutionStatus(
        ex.tests.map(t => {
          const run = !t.pipelineUrl ? findPipelineRun(t.specFile, pipelineRuns) : null;
          return { ...t, pipelineStatus: t.pipelineStatus ?? run?.conclusion ?? null };
        }),
      ),
    }));
  }, [executions, pipelineRuns]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Test List ──────────────────────────────────────────── */}
      <section className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_20px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Available Tests</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Select one test, tests for one or more BRDs, or any combination — then click Run.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRun}
            disabled={selected.size === 0 || running}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run {selected.size > 0 ? `${selected.size} Test${selected.size > 1 ? 's' : ''}` : 'Selected'}
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No generated tests found. Use the Generate tab to create tests from your requirements.
          </p>
        ) : (
          <TestListTable
            entries={entries}
            selected={selected}
            onToggle={toggle}
            onSelectAll={selectAll}
            onSelectByBrd={selectByBrd}
          />
        )}
      </section>

      {/* ── Tests Executed ─────────────────────────────────────── */}
      <section className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_20px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Tests Executed</h2>
        <p className="mt-1 mb-5 text-sm text-slate-500 dark:text-slate-300">
          History of all executions with per-test results and linked pipeline status.
        </p>

        {enrichedExecutions.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No executions yet. Select tests above and click Run to create the first execution.
          </p>
        ) : (
          <div className="space-y-3">
            {enrichedExecutions.map(ex => (
              <ExecutionRow key={ex.id} execution={ex} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
