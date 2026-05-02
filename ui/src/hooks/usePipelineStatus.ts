import { useCallback, useEffect, useRef, useState } from 'react';
import { Octokit } from '@octokit/rest';
import type { PipelineJob, PipelineRun, PipelineStep, WorkflowInfo } from '../types/dashboard';

const POLL_INTERVAL_MS = 15_000;

function mapConclusion(c: string | null | undefined) {
  if (!c) return null;
  return c as PipelineRun['conclusion'];
}

function mapStatus(s: string) {
  return s as PipelineRun['status'];
}

function mapStep(s: Record<string, unknown>): PipelineStep {
  return {
    name: String(s.name ?? ''),
    status: mapStatus(String(s.status ?? 'queued')),
    conclusion: mapConclusion(s.conclusion as string | null),
    number: Number(s.number ?? 0),
    startedAt: (s.started_at as string | null) ?? null,
    completedAt: (s.completed_at as string | null) ?? null,
  };
}

function mapJob(j: Record<string, unknown>): PipelineJob {
  const steps = Array.isArray(j.steps)
    ? (j.steps as Record<string, unknown>[]).map(mapStep)
    : [];
  return {
    id: Number(j.id),
    name: String(j.name ?? ''),
    status: mapStatus(String(j.status ?? 'queued')),
    conclusion: mapConclusion(j.conclusion as string | null),
    startedAt: (j.started_at as string | null) ?? null,
    completedAt: (j.completed_at as string | null) ?? null,
    steps,
  };
}

export function usePipelineStatus(
  token: string,
  owner: string,
  repo: string,
  enabled: boolean,
) {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getOctokit = useCallback(() => {
    if (!token || token.startsWith('your_')) throw new Error('Missing GitHub token.');
    return new Octokit({ auth: token });
  }, [token]);

  const fetchWorkflows = useCallback(async () => {
    const octokit = getOctokit();
    const { data } = await octokit.actions.listRepoWorkflows({ owner, repo, per_page: 20 });
    return (data.workflows as Record<string, unknown>[]).map(w => ({
      id: Number(w.id),
      name: String(w.name ?? ''),
      path: String(w.path ?? ''),
      state: String(w.state ?? ''),
      // A workflow supports manual dispatch if its YAML has workflow_dispatch trigger
      // We detect this by checking the path name (rough) or state
      hasDispatch: String(w.path ?? '').includes('playwright') || String(w.path ?? '').includes('ai-pipeline'),
    }));
  }, [getOctokit, owner, repo]);

  const fetchRuns = useCallback(async () => {
    const octokit = getOctokit();
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 10,
    });
    const runList = data.workflow_runs as Record<string, unknown>[];

    const runsWithJobs: PipelineRun[] = await Promise.all(
      runList.map(async run => {
        let jobs: PipelineJob[] = [];
        try {
          const { data: jobsData } = await octokit.actions.listJobsForWorkflowRun({
            owner,
            repo,
            run_id: Number(run.id),
          });
          jobs = (jobsData.jobs as Record<string, unknown>[]).map(mapJob);
        } catch {
          // Jobs may not be accessible yet if run is queued
        }

        const headCommit = (run.head_commit ?? {}) as Record<string, unknown>;
        const actor = (run.actor ?? {}) as Record<string, unknown>;
        const repo_obj = (run.repository ?? {}) as Record<string, unknown>;

        return {
          id: Number(run.id),
          name: String(run.name ?? ''),
          workflowId: Number(run.workflow_id ?? 0),
          workflowName: String(run.name ?? ''),
          status: mapStatus(String(run.status ?? 'queued')),
          conclusion: mapConclusion(run.conclusion as string | null),
          branch: String(run.head_branch ?? ''),
          commitSha: String(run.head_sha ?? '').slice(0, 7),
          commitMessage: String((headCommit.message as string | undefined) ?? '').split('\n')[0].slice(0, 80),
          triggeredBy: String((actor.login as string | undefined) ?? 'workflow'),
          createdAt: String(run.created_at ?? ''),
          updatedAt: String(run.updated_at ?? ''),
          htmlUrl: String(run.html_url ?? `https://github.com/${owner}/${repo}/actions/runs/${run.id}`),
          jobs,
          // annotate repo info for display
          ...(repo_obj.name ? {} : {}),
        };
      })
    );

    return runsWithJobs;
  }, [getOctokit, owner, repo]);

  const refresh = useCallback(async (silent = false) => {
    if (!enabled || !token || token.startsWith('your_')) {
      setError('GitHub token is required to view pipeline status.');
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [fetchedRuns, fetchedWorkflows] = await Promise.all([fetchRuns(), fetchWorkflows()]);
      setRuns(fetchedRuns);
      setWorkflows(fetchedWorkflows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [enabled, token, fetchRuns, fetchWorkflows]);

  const triggerWorkflow = useCallback(async (workflowId: number, workflowName: string) => {
    setTriggering(true);
    setTriggerStatus(null);
    try {
      const octokit = getOctokit();
      await octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref: 'main',
      });
      setTriggerStatus(`✓ "${workflowName}" triggered on main. Refreshing in 5s...`);
      setTimeout(() => refresh(true), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('422') || msg.includes('workflow does not have')) {
        setTriggerStatus(`Cannot trigger "${workflowName}": add workflow_dispatch to its YAML trigger.`);
      } else {
        setTriggerStatus('Trigger failed: ' + msg);
      }
    } finally {
      setTriggering(false);
    }
  }, [getOctokit, owner, repo, refresh]);

  // Initial load + polling while any run is in progress
  useEffect(() => {
    if (!enabled) return;
    refresh();

    timerRef.current = setInterval(() => {
      const hasActive = runs.some(r => r.status === 'in_progress' || r.status === 'queued');
      if (hasActive) refresh(true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { runs, workflows, loading, error, refresh, triggering, triggerStatus, triggerWorkflow };
}
