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
