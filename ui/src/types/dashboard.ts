export type SyncStatusState = 'passing' | 'failing';

export interface SyncStatusTestCase {
  id: string;
  description: string;
}

export interface SyncStatusRow {
  brdId: string;
  requirement: string;
  testCaseId: string;
  testCases?: SyncStatusTestCase[];
  status: SyncStatusState;
  hasTestPlan: boolean;
  hasGeneratedTest: boolean;
}

export interface SyncStatusPayload {
  buildId: string;
  updatedAt: string;
  results: SyncStatusRow[];
}

/** Form values used when creating a new test plan or spec. */
export interface TestSpecFormValues {
  brdId: string;
  specName: string;
  targetUrl: string;
  testGoal: string;
}

/** Minimal BRD item exposed to the "generate tests for existing plans" selector. */
export interface BRDMissingTest {
  brdId: string;
  requirement: string;
  testCaseId: string;
  hasTestPlan: boolean;
}

export interface DashboardSummary {
  total: number;
  failing: number;
  passing: number;
}

export type BRDSortKey = 'brdId' | 'requirement' | 'testCaseId' | 'status';
export type SortDirection = 'asc' | 'desc';

// ── Pipeline / GitHub Actions types ──────────────────────────────────────────

export type PipelineRunStatus = 'queued' | 'in_progress' | 'completed';
export type PipelineRunConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | null;

export interface PipelineStep {
  name: string;
  status: PipelineRunStatus;
  conclusion: PipelineRunConclusion;
  number: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface PipelineJob {
  id: number;
  name: string;
  status: PipelineRunStatus;
  conclusion: PipelineRunConclusion;
  startedAt: string | null;
  completedAt: string | null;
  steps: PipelineStep[];
}

export interface PipelineRun {
  id: number;
  name: string;
  workflowId: number;
  workflowName: string;
  status: PipelineRunStatus;
  conclusion: PipelineRunConclusion;
  branch: string;
  commitSha: string;
  commitMessage: string;
  triggeredBy: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  jobs: PipelineJob[];
}

export interface WorkflowInfo {
  id: number;
  name: string;
  path: string;
  state: string;
  hasDispatch: boolean;
}
