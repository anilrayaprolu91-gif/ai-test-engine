import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle as WarnIcon } from 'lucide-react';
import { Octokit } from '@octokit/rest';
import { AlertTriangle, CheckCircle2, Layers3 } from 'lucide-react';
import { BRDTable } from './components/BRDTable';
import { DashboardHeader } from './components/DashboardHeader';
import { FailingBRDTable } from './components/FailingBRDTable';
import { FiltersToolbar } from './components/FiltersToolbar';
import { GenerateTestSpec } from './components/GenerateTestSpec';
import { PipelineStatusView } from './components/PipelineStatusView';
import { StatusCard } from './components/StatusCard';
import { usePipelineStatus } from './hooks/usePipelineStatus';
import { useSyncStatus } from './hooks/useSyncStatus';
import { useTheme } from './hooks/useTheme';
import type { BRDSortKey, SortDirection, TestSpecFormValues } from './types/dashboard';

type PendingGitHubFile = {
  path: string;
  markdown: string;
};

type GenerationMode = 'plan-only' | 'plan-and-tests';

const DASHBOARD_PREFERENCES_KEY = 'sync-dashboard-preferences';

function loadDashboardPreferences() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as {
      searchTerm?: string;
      statusFilter?: 'all' | 'passing' | 'failing';
      sortKey?: BRDSortKey;
      sortDirection?: SortDirection;
      autoRefreshEnabled?: boolean;
      pageSize?: number;
    };
  } catch {
    return null;
  }
}

const githubToken = String(import.meta.env.VITE_GITHUB_TOKEN || '').trim();
const githubOwner = String(import.meta.env.VITE_GITHUB_OWNER || 'anilrayaprolu91-gif').trim();
const githubRepo = String(import.meta.env.VITE_GITHUB_REPO || 'ai-test-engine').trim();
const specDeliveryMode = String(import.meta.env.VITE_SPEC_DELIVERY_MODE || 'github').toLowerCase() === 'local' ? 'local' : 'github';

const PLACEHOLDER_TOKEN = 'your_github_token_here';
const missingEnvWarnings: string[] = [];
if (specDeliveryMode === 'github') {
  if (!githubToken || githubToken === PLACEHOLDER_TOKEN) {
    missingEnvWarnings.push('VITE_GITHUB_TOKEN is missing or still set to the placeholder value.');
  }
  if (!githubOwner) {
    missingEnvWarnings.push('VITE_GITHUB_OWNER is not set.');
  }
  if (!githubRepo) {
    missingEnvWarnings.push('VITE_GITHUB_REPO is not set.');
  }
}

export default function App() {
  const [envWarningDismissed, setEnvWarningDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<'requirements' | 'pipeline' | 'generate'>('requirements');
  const savedPreferences = loadDashboardPreferences();
  const [formValues, setFormValues] = useState<TestSpecFormValues>({
    brdId: '',
    specName: '',
    targetUrl: '',
    testGoal: '',
  });
  const [planStatus, setPlanStatus] = useState('');
  const [planAndTestsStatus, setPlanAndTestsStatus] = useState('');
  const [generateStatus, setGenerateStatus] = useState('');
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [submittingPlanAndTests, setSubmittingPlanAndTests] = useState(false);
  const [submittingGenerate, setSubmittingGenerate] = useState(false);
  const [selectedBrds, setSelectedBrds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState(savedPreferences?.searchTerm || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passing' | 'failing'>(savedPreferences?.statusFilter || 'all');
  const [sortKey, setSortKey] = useState<BRDSortKey>(savedPreferences?.sortKey || 'brdId');
  const [sortDirection, setSortDirection] = useState<SortDirection>(savedPreferences?.sortDirection || 'asc');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(savedPreferences?.autoRefreshEnabled ?? true);
  const [pageSize, setPageSize] = useState(savedPreferences?.pageSize || 10);
  const [currentPage, setCurrentPage] = useState(1);
  const { theme, toggleTheme } = useTheme();
  const { data, error, loading, refreshing, summary, refresh, lastRefreshAttemptedAt, lastSuccessfulRefreshAt, brdsMissingTests } = useSyncStatus();
  const pipeline = usePipelineStatus(githubToken, githubOwner, githubRepo, activeTab === 'pipeline');

  const updateField = (field: keyof TestSpecFormValues, value: string) => {
    setFormValues(current => ({ ...current, [field]: value }));
  };

  const filteredRows = useMemo(() => {
    const rows = data?.results || [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rows.filter(row => {
      const matchesSearch =
        !normalizedSearch ||
        row.brdId.toLowerCase().includes(normalizedSearch) ||
        row.requirement.toLowerCase().includes(normalizedSearch) ||
        row.testCaseId.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.results, searchTerm, statusFilter]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((left, right) => {
      const leftValue = String(left[sortKey]).toLowerCase();
      const rightValue = String(right[sortKey]).toLowerCase();
      const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : comparison * -1;
    });

    return rows;
  }, [filteredRows, sortDirection, sortKey]);

  const sortedFailingRows = useMemo(() => {
    return sortedRows.filter(row => row.status === 'failing');
  }, [sortedRows]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedRows.length / pageSize));
  }, [pageSize, sortedRows.length]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, sortedRows]);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_PREFERENCES_KEY,
      JSON.stringify({
        searchTerm,
        statusFilter,
        sortKey,
        sortDirection,
        autoRefreshEnabled,
        pageSize,
      })
    );
  }, [autoRefreshEnabled, pageSize, searchTerm, sortDirection, sortKey, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortKey, sortDirection, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, 45000);

    return () => window.clearInterval(timer);
  }, [autoRefreshEnabled, refresh]);

  const handleToggleBrd = (brdId: string) => {
    setSelectedBrds(current =>
      current.includes(brdId) ? current.filter(id => id !== brdId) : [...current, brdId]
    );
  };

  const handleSort = (nextKey: BRDSortKey) => {
    setSortDirection(current => (sortKey === nextKey ? (current === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(nextKey);
  };

  const handlePageChange = (nextPage: number) => {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  const handleExportCsv = () => {
    const header = ['BRD_ID', 'Requirement', 'Test_Case_ID', 'Status'];
    const lines = sortedRows.map(row => [row.brdId, row.requirement, row.testCaseId, row.status]);
    const csv = [header, ...lines]
      .map(columns => columns.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sync-status-dashboard.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const resolveSpecFileName = () => {
    // Strip any leading 'brd-' the user may have typed in brdId or specName to avoid double prefix
    const brdSlug = formValues.brdId
      ? formValues.brdId.toLowerCase().replace(/^brd-?/i, '').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : '';
    const trimmed = formValues.specName.trim();
    const withoutExtension = trimmed.replace(/\.md$/i, '');
    const nameSlug = withoutExtension
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const fallback = nameSlug || 'spec';
    // Name as brd-{id}-{name}.md so sync-requirements.js picks it up
    return brdSlug ? `brd-${brdSlug}-${fallback}.md` : `${fallback}.md`;
  };

  const buildSpecArtifacts = (mode: GenerationMode) => {
    const fileName = resolveSpecFileName();
    const brdTag = formValues.brdId ? `@brd: ${formValues.brdId.toUpperCase()}\n` : '';
    const urlTag = formValues.targetUrl ? `@url: ${formValues.targetUrl}\n` : '';
    const generationModeTag = `@generation-mode: ${mode}\n`;
    const planOnlyTag = mode === 'plan-only' ? '@plan-only: true\n' : '';
    const plannerAgentTag = '@planner-agent: playwright/cli planner\n';
    const generatorAgentTag = '@test-generator-agent: playwright/cli test generator\n';
    const generateTestsTag = `@generate-tests: ${mode === 'plan-only' ? 'false' : 'true'}\n`;
    const goal = formValues.testGoal.trim() || 'No explicit goal provided.';

    const markdown = `${brdTag}${urlTag}${generationModeTag}${planOnlyTag}${plannerAgentTag}${generatorAgentTag}${generateTestsTag}\n# Test Goal\n\n${goal}\n\n# Requirement\n\n${goal}\n\n# Acceptance Criteria\n\n1. ${goal}\n`;

    const specPath = `spec/${fileName}`;
    const fullSpecPath = 'spec/spec.md';
    const fullSpecMarkdown = `# Full Specification\n\nThis file is auto-generated by AI Test Engine dashboard for ${mode === 'plan-only' ? 'Plan Only' : 'Plan + Tests'} flow.\n\n## Primary Spec File\n\n- ${specPath}\n\n## Specification Content\n\n${markdown}`;

    return {
      fileName,
      primarySpec: { path: specPath, markdown },
      fullSpec: { path: fullSpecPath, markdown: fullSpecMarkdown },
    };
  };

  const downloadLocally = (markdown: string, folder: 'plan' | 'spec', fileName: string) => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
    const cmd = folder === 'spec'
      ? `node scripts/convertSpec.js ${fileName} --brd=${formValues.brdId || 'BRD-01'}`
      : `node scripts/create-test-plan.js --brd=${formValues.brdId || 'BRD-01'} --url=${formValues.targetUrl}`;
    return `Downloaded ${fileName}. Move to ${folder}/ and run: ${cmd}`;
  };

  const pushFilesToGitHub = async (
    files: PendingGitHubFile[],
    commitMessage: string,
    prBody: string,
  ): Promise<string> => {
    if (!githubToken || githubToken.startsWith('your_')) {
      throw new Error('Missing VITE_GITHUB_TOKEN. Add a valid GitHub PAT in required.env, then restart the dev server.');
    }
    if (files.length === 0) {
      throw new Error('No files to push.');
    }

    const octokit = new Octokit({ auth: githubToken });

    // Get SHA of main HEAD to branch from
    const { data: refData } = await octokit.git.getRef({
      owner: githubOwner,
      repo: githubRepo,
      ref: 'heads/main',
    });
    const baseSha = refData.object.sha;

    // Create a unique feature branch name (branch created after commit below)
    const slug = files[0].path.split('/').pop()?.replace(/\.md$/i, '') ?? 'spec';
    const branchName = `feat/spec-${slug}-${Date.now()}`;

    // Build a single git tree with all files so they land in ONE commit.
    const { data: baseCommit } = await octokit.git.getCommit({
      owner: githubOwner,
      repo: githubRepo,
      commit_sha: baseSha,
    });
    const { data: newTree } = await octokit.git.createTree({
      owner: githubOwner,
      repo: githubRepo,
      base_tree: baseCommit.tree.sha,
      tree: files.map(file => ({
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        content: file.markdown,
      })),
    });
    const { data: newCommit } = await octokit.git.createCommit({
      owner: githubOwner,
      repo: githubRepo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [baseSha],
      committer: { name: 'AI Test Engine', email: 'ai-test-engine@example.com' },
      author: { name: 'AI Test Engine', email: 'ai-test-engine@example.com' },
    });
    await octokit.git.createRef({
      owner: githubOwner,
      repo: githubRepo,
      ref: `refs/heads/${branchName}`,
      sha: newCommit.sha,
    });

    // Open a PR into main
    const { data: pr } = await octokit.pulls.create({
      owner: githubOwner,
      repo: githubRepo,
      title: commitMessage,
      head: branchName,
      base: 'main',
      body: prBody,
    });

    return pr.html_url;
  };

  const handleGitHubError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();
    if (lower.includes('401')) return 'GitHub auth failed (401). Check VITE_GITHUB_TOKEN in required.env.';
    if (lower.includes('403')) return 'GitHub access denied (403). Token lacks Contents write permission.';
    return 'Error: ' + message;
  };

  const handleCreatePlan = async () => {
    setSubmittingPlan(true);
    setPlanStatus(specDeliveryMode === 'github' ? 'Pushing spec to GitHub — CI will generate the AI test plan...' : 'Preparing local spec file...');
    try {
      // Push a @plan-only spec so CI runs create-test-plan.js (AI) but skips convertSpec.js (no Playwright tests)
      const { primarySpec, fullSpec, fileName } = buildSpecArtifacts('plan-only');
      if (specDeliveryMode === 'local') {
        setPlanStatus(downloadLocally(primarySpec.markdown, 'spec', fileName));
        return;
      }
      const prUrl = await pushFilesToGitHub(
        [primarySpec, fullSpec],
        `docs(plan-only): generate plan artifacts for ${formValues.brdId || 'new BRD'}`,
        `Plan Only generation request created by AI Test Engine dashboard.\n\nThis PR intentionally includes only planning/specification artifacts:\n- Spec source: \`${primarySpec.path}\`\n- Full specification: \`${fullSpec.path}\`\n\nExpected CI behavior:\n1. Invoke playwright/cli planner agent\n2. Generate plan files under \`plan/\`\n3. Do NOT generate Playwright test scripts`,
      );
      setPlanStatus(`Plan Only PR opened. CI will add plan/spec artifacts with no Playwright test code: ${prUrl}`);
    } catch (err) {
      setPlanStatus(handleGitHubError(err));
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleCreatePlanAndTests = async () => {
    setSubmittingPlanAndTests(true);
    setPlanAndTestsStatus(specDeliveryMode === 'github' ? 'Pushing spec to GitHub — CI will generate the AI test plan + Playwright tests...' : 'Preparing local spec file...');
    try {
      // Push ONLY the spec. CI will:
      //   1. run create-test-plan.js  → AI-generated test plan in plan/
      //   2. run convertSpec.js       → Playwright tests in tests/generated/
      // and commit both back to this same PR branch.
      const { primarySpec, fullSpec, fileName } = buildSpecArtifacts('plan-and-tests');
      if (specDeliveryMode === 'local') {
        setPlanAndTestsStatus(downloadLocally(primarySpec.markdown, 'spec', fileName));
        return;
      }
      const prUrl = await pushFilesToGitHub(
        [primarySpec, fullSpec],
        `feat(plan+tests): generate plan and tests for ${formValues.brdId || 'new BRD'}`,
        `Plan + Tests generation request created by AI Test Engine dashboard.\n\nInitial artifacts in this PR:\n- Spec source: \`${primarySpec.path}\`\n- Full specification: \`${fullSpec.path}\`\n\nExpected CI behavior in this same PR:\n1. Invoke playwright/cli planner agent and generate plan files under \`plan/\`\n2. Invoke playwright/cli test generator using the generated plan\n3. Commit generated Playwright scripts in standard test locations`,
      );
      setPlanAndTestsStatus(`Plan + Tests PR opened. CI will add plan artifacts and generated Playwright tests in this same PR: ${prUrl}`);
    } catch (err) {
      setPlanAndTestsStatus(handleGitHubError(err));
    } finally {
      setSubmittingPlanAndTests(false);
    }
  };

  const handleGenerateTests = async () => {
    if (selectedBrds.length === 0) return;
    setSubmittingGenerate(true);
    setGenerateStatus(`Pushing ${selectedBrds.length} trigger spec(s) to GitHub in one PR...`);
    try {
      if (specDeliveryMode === 'local') {
        setGenerateStatus(`Local mode: run  node scripts/generate-local-tests.js --all  to generate tests for all pending BRDs.`);
        return;
      }
      if (!githubToken || githubToken.startsWith('your_')) {
        throw new Error('Missing VITE_GITHUB_TOKEN. Add a valid GitHub PAT in required.env.');
      }

      const ts = Date.now();
      const files: PendingGitHubFile[] = selectedBrds.map((brdId, index) => {
        const markdown = `@brd: ${brdId}\n\n# Auto-trigger\nGenerate Playwright tests for ${brdId}.\n`;
        const filePath = `spec/${ts + index}-${brdId.toLowerCase()}-spec.md`;
        return { path: filePath, markdown };
      });

      const prUrl = await pushFilesToGitHub(
        files,
        `chore(specs): trigger test generation for ${selectedBrds.length} BRD(s)`,
        `Auto-generated trigger by AI Test Engine dashboard.\n\nSingle PR containing all selected BRDs:\n${selectedBrds.map(id => `- ${id}`).join('\n')}\n\nMerging this PR will trigger CI generation for all selected BRDs.`,
      );
      setSelectedBrds([]);
      setGenerateStatus(`Opened one PR for review: ${prUrl}`);
    } catch (err) {
      setGenerateStatus(handleGitHubError(err));
    } finally {
      setSubmittingGenerate(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(248,113,113,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] px-4 py-6 text-slate-950 transition-colors duration-300 ease-out [&_*]:transition-colors [&_*]:duration-200 dark:bg-[radial-gradient(circle_at_12%_0%,_rgba(56,189,248,0.16),_transparent_34%),radial-gradient(circle_at_86%_2%,_rgba(99,102,241,0.14),_transparent_32%),linear-gradient(180deg,_#0b1020_0%,_#111827_56%,_#090f1f_100%)] dark:text-slate-100 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <DashboardHeader
          buildId={data?.buildId}
          updatedAt={data?.updatedAt}
          refreshing={refreshing}
          lastRefreshAttemptedAt={lastRefreshAttemptedAt}
          lastSuccessfulRefreshAt={lastSuccessfulRefreshAt}
          autoRefreshEnabled={autoRefreshEnabled}
          refreshError={error}
          onRefresh={refresh}
          onToggleTheme={toggleTheme}
          theme={theme}
        />

        {missingEnvWarnings.length > 0 && !envWarningDismissed && (
          <div className="flex items-start gap-3 rounded-3xl border border-amber-400/30 bg-amber-50/90 px-5 py-4 text-sm text-amber-800 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
            <WarnIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Missing or incomplete environment configuration</p>
              <ul className="mt-1 list-inside list-disc">
                {missingEnvWarnings.map(w => <li key={w}>{w}</li>)}
              </ul>
              <p className="mt-1 text-xs opacity-75">Add these to required.env for local use, or configure them in your deployment environment, then restart the dev server.</p>
            </div>
            <button
              type="button"
              onClick={() => setEnvWarningDismissed(true)}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-medium opacity-70 transition hover:opacity-100"
              aria-label="Dismiss env warning"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-700 dark:text-red-200">
            Unable to load sync status: {error}
          </div>
        )}

        {/* ── Tab navigation ──────────────────────────────────── */}
        <div className="flex gap-1 rounded-2xl border border-slate-200/70 bg-white/70 p-1 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/50 w-fit">
          {([
            { id: 'requirements', label: 'Requirements' },
            { id: 'pipeline', label: 'Pipeline' },
            { id: 'generate', label: 'Generate' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Requirements tab ────────────────────────────────── */}
        {activeTab === 'requirements' && (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <StatusCard
                title="Total BRDs"
                value={summary.total}
                caption="Mapped business requirements tracked in the latest sync snapshot."
                icon={Layers3}
              />
              <StatusCard
                title="Failing BRDs"
                value={summary.failing}
                caption={summary.failing > 0 ? 'Immediate stakeholder attention required.' : 'No critical requirement failures detected.'}
                icon={AlertTriangle}
                tone={summary.failing > 0 ? 'danger' : 'success'}
              />
              <StatusCard
                title="Passing BRDs"
                value={summary.passing}
                caption="Requirements currently validated by the latest build results."
                icon={CheckCircle2}
                tone="success"
              />
            </section>

            <FiltersToolbar
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              totalVisible={sortedRows.length}
              totalRows={data?.results.length || 0}
              autoRefreshEnabled={autoRefreshEnabled}
              pageSize={pageSize}
              onSearchChange={setSearchTerm}
              onStatusFilterChange={setStatusFilter}
              onAutoRefreshChange={setAutoRefreshEnabled}
              onPageSizeChange={setPageSize}
              onExportCsv={handleExportCsv}
            />

            {loading ? (
              <section className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-10 text-center text-sm text-slate-500 shadow-[0_20px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/65 dark:text-slate-300">
                Loading dashboard data...
              </section>
            ) : (
              <>
                <FailingBRDTable rows={sortedFailingRows} hasActiveFilters={searchTerm.trim().length > 0 || statusFilter !== 'all'} />
                <BRDTable
                  rows={paginatedRows}
                  hasActiveFilters={searchTerm.trim().length > 0 || statusFilter !== 'all'}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalRows={sortedRows.length}
                  pageSize={pageSize}
                  onSort={handleSort}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </>
        )}

        {/* ── Pipeline tab ────────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <PipelineStatusView
            runs={pipeline.runs}
            workflows={pipeline.workflows}
            loading={pipeline.loading}
            error={pipeline.error}
            triggering={pipeline.triggering}
            triggerStatus={pipeline.triggerStatus}
            onRefresh={() => pipeline.refresh()}
            onTrigger={pipeline.triggerWorkflow}
          />
        )}

        {/* ── Generate tab ────────────────────────────────────── */}
        {activeTab === 'generate' && (
          <GenerateTestSpec
            values={formValues}
            planStatus={planStatus}
            planAndTestsStatus={planAndTestsStatus}
            generateStatus={generateStatus}
            submittingPlan={submittingPlan}
            submittingPlanAndTests={submittingPlanAndTests}
            submittingGenerate={submittingGenerate}
            brdsMissingTests={brdsMissingTests}
            selectedBrds={selectedBrds}
            deliveryMode={specDeliveryMode}
            onChange={updateField}
            onToggleBrd={handleToggleBrd}
            onCreatePlan={handleCreatePlan}
            onCreatePlanAndTests={handleCreatePlanAndTests}
            onGenerateTests={handleGenerateTests}
          />
        )}
      </div>
    </div>
  );
}
