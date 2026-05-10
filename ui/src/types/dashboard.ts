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

// ── Run-tab execution types ───────────────────────────────────────────────────

/** A single test-case entry shown in the Run tab test list */
export interface RunTestEntry {
  brdId: string;
  requirement: string;
  testCaseId: string;
  specFile: string; // e.g. tests/generated/TC-101.spec.ts
  status: SyncStatusState;
}

/** One test result row inside an execution */
export interface ExecutionTestResult {
  brdId: string;
  requirement: string;
  testCaseId: string;
  specFile: string;
  result: 'passed' | 'failed' | 'pending';
  pipelineUrl: string | null;
  pipelineStatus: PipelineRunConclusion;
}

/** A single execution record created when the user clicks Run */
export interface TestExecution {
  id: string; // timestamp-based unique id
  createdAt: string;
  label: string; // human summary e.g. "BRD-01, TC-102 · 3 tests"
  tests: ExecutionTestResult[];
  overallStatus: 'running' | 'passed' | 'failed' | 'mixed';
}
