import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle as WarnIcon } from 'lucide-react';
import { Octokit } from '@octokit/rest';
import { AlertTriangle, CheckCircle2, Layers3 } from 'lucide-react';
import { BRDTable } from './components/BRDTable';
import { DashboardHeader } from './components/DashboardHeader';
import { FailingBRDTable } from './components/FailingBRDTable';
import { FiltersToolbar } from './components/FiltersToolbar';
import { GenerateTestSpec } from './components/GenerateTestSpec';
import { StatusCard } from './components/StatusCard';
import { useSyncStatus } from './hooks/useSyncStatus';
import { useTheme } from './hooks/useTheme';
import type { BRDSortKey, SortDirection, TestSpecFormValues } from './types/dashboard';

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
    const fallback = `${Date.now()}-spec`;
    const trimmed = formValues.specName.trim();
    const withoutExtension = trimmed.replace(/\.md$/i, '');
    const normalized = withoutExtension
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${normalized || fallback}.md`;
  };

  const buildFileContent = (folder: string) => {
    const fileName = resolveSpecFileName();
    const brdTag = formValues.brdId ? `@brd: ${formValues.brdId.toUpperCase()}\n` : '';
    const urlTag = formValues.targetUrl ? `@url: ${formValues.targetUrl}\n` : '';
    const markdown = `${brdTag}${urlTag}\n# Requirement\n${formValues.testGoal}\n\n# Target URL\n${formValues.targetUrl}\n`;
    const path = `${folder}/${fileName}`;
    return { path, markdown, fileName };
  };

  const downloadLocally = (markdown: string, folder: 'test-plans' | 'specs', fileName: string) => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
    const cmd = folder === 'specs'
      ? `node scripts/convertSpec.js ${fileName} --brd=${formValues.brdId || 'BRD-01'}`
      : `node scripts/create-test-plan.js --brd=${formValues.brdId || 'BRD-01'} --url=${formValues.targetUrl}`;
    return `Downloaded ${fileName}. Move to ${folder}/ and run: ${cmd}`;
  };

  const pushToGitHub = async (path: string, markdown: string, commitMessage: string) => {
    if (!githubToken || githubToken.startsWith('your_')) {
      throw new Error('Missing VITE_GITHUB_TOKEN. Add a valid GitHub PAT in required.env, then restart the dev server.');
    }
    const octokit = new Octokit({ auth: githubToken });
    await octokit.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path,
      message: commitMessage,
      content: btoa(unescape(encodeURIComponent(markdown))),
      committer: { name: 'AI Test Engine', email: 'ai-test-engine@example.com' },
      author: { name: 'AI Test Engine', email: 'ai-test-engine@example.com' },
    });
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
    setPlanStatus(specDeliveryMode === 'github' ? 'Pushing test plan to GitHub...' : 'Preparing local plan file...');
    try {
      const { path, markdown, fileName } = buildFileContent('test-plans');
      if (specDeliveryMode === 'local') {
        setPlanStatus(downloadLocally(markdown, 'test-plans', fileName));
        return;
      }
      await pushToGitHub(path, markdown, `docs(plans): add test plan for ${formValues.brdId || 'new BRD'}`);
      setPlanStatus(`Test plan ${fileName} pushed to GitHub. A PR will be created for your review.`);
    } catch (err) {
      setPlanStatus(handleGitHubError(err));
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleCreatePlanAndTests = async () => {
    setSubmittingPlanAndTests(true);
    setPlanAndTestsStatus(specDeliveryMode === 'github' ? 'Pushing spec to GitHub (triggers plan + test generation)...' : 'Preparing local spec file...');
    try {
      const { path, markdown, fileName } = buildFileContent('specs');
      if (specDeliveryMode === 'local') {
        setPlanAndTestsStatus(downloadLocally(markdown, 'specs', fileName));
        return;
      }
      await pushToGitHub(path, markdown, `feat(specs): add spec for ${formValues.brdId || 'new BRD'} [generates tests]`);
      setPlanAndTestsStatus(`Spec ${fileName} pushed to GitHub. The CI pipeline will generate a test plan and Playwright tests, then raise a PR for review.`);
    } catch (err) {
      setPlanAndTestsStatus(handleGitHubError(err));
    } finally {
      setSubmittingPlanAndTests(false);
    }
  };

  const handleGenerateTests = async () => {
    if (selectedBrds.length === 0) return;
    setSubmittingGenerate(true);
    setGenerateStatus(`Pushing ${selectedBrds.length} trigger spec(s) to GitHub...`);
    try {
      if (specDeliveryMode === 'local') {
        setGenerateStatus(`Local mode: run  node scripts/generate-local-tests.js --all  to generate tests for all pending BRDs.`);
        return;
      }
      if (!githubToken || githubToken.startsWith('your_')) {
        throw new Error('Missing VITE_GITHUB_TOKEN. Add a valid GitHub PAT in required.env.');
      }
      const octokit = new Octokit({ auth: githubToken });
      for (const brdId of selectedBrds) {
        const ts = Date.now();
        const markdown = `@brd: ${brdId}\n\n# Auto-trigger\nGenerate Playwright tests for ${brdId}.\n`;
        await octokit.repos.createOrUpdateFileContents({
          owner: githubOwner,
          repo: githubRepo,
          path: `specs/${ts}-${brdId.toLowerCase()}-spec.md`,
          message: `chore(specs): trigger test generation for ${brdId}`,
          content: btoa(unescape(encodeURIComponent(markdown))),
          committer: { name: 'AI Test Engine', email: 'ai-test-engine@example.com' },
          author: { name: 'AI Test Engine', email: 'ai-test-engine@example.com' },
        });
      }
      setSelectedBrds([]);
      setGenerateStatus(`Pushed ${selectedBrds.length} spec trigger(s). The CI pipeline will generate Playwright tests and raise a PR for review.`);
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
      </div>
    </div>
  );
}
