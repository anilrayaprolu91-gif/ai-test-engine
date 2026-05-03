import { CheckSquare, FileText, LoaderCircle, Sparkles, Square, Zap } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { BRDMissingTest, TestSpecFormValues } from '../types/dashboard';

interface GenerateTestSpecProps {
  values: TestSpecFormValues;
  planStatus: string;
  planAndTestsStatus: string;
  generateStatus: string;
  submittingPlan: boolean;
  submittingPlanAndTests: boolean;
  submittingGenerate: boolean;
  brdsMissingTests: BRDMissingTest[];
  selectedBrds: string[];
  deliveryMode: 'github' | 'local';
  onChange: (field: keyof TestSpecFormValues, value: string) => void;
  onToggleBrd: (brdId: string) => void;
  onCreatePlan: () => void;
  onCreatePlanAndTests: () => void;
  onGenerateTests: () => void;
}

export function GenerateTestSpec({
  values,
  planStatus,
  planAndTestsStatus,
  generateStatus,
  submittingPlan,
  submittingPlanAndTests,
  submittingGenerate,
  brdsMissingTests,
  selectedBrds,
  deliveryMode,
  onChange,
  onToggleBrd,
  onCreatePlan,
  onCreatePlanAndTests,
  onGenerateTests,
}: GenerateTestSpecProps) {
  const handleFieldChange =
    (field: keyof TestSpecFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(field, event.target.value);
    };

  const isFormBusy = submittingPlan || submittingPlanAndTests;
  const isGenerateBusy = submittingGenerate;
  const noSelections = selectedBrds.length === 0;
  const hasSpecNameInput = values.specName.trim().length > 0;
  const normalizedSpecStem = values.specName
    .trim()
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const isSpecNameInvalid = hasSpecNameInput && normalizedSpecStem.length === 0;

  const isRunningLocally =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const localNote =
    deliveryMode === 'local' && isRunningLocally
      ? 'Local mode: files are downloaded. Move spec files into spec/ and run the local generation commands.'
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section A: New requirement entry ── */}
      <section className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_20px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">New Requirement</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Enter a requirement and choose what to generate. Both actions create a PR for your review.
            </p>
          </div>
          <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-600 dark:text-sky-300">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-3 md:items-start">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                BRD ID <span className="text-slate-400 dark:text-slate-300">(optional)</span>
              </span>
              <input
                value={values.brdId}
                onChange={handleFieldChange('brdId')}
                placeholder="e.g. BRD-04"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-300"
              />
            </label>

            <div className="grid gap-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Spec Name <span className="text-slate-400 dark:text-slate-300">(optional)</span>
                </span>
                <input
                  value={values.specName}
                  onChange={handleFieldChange('specName')}
                  placeholder="e.g. checkout-smoke"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-300"
                />
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-300">
                Allowed characters: letters, numbers, hyphen, underscore. Example output: checkout-smoke.md
              </span>
              {isSpecNameInvalid && (
                <span className="text-xs font-medium text-red-600 dark:text-red-300">
                  Spec name is invalid. Use at least one letter or number.
                </span>
              )}
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Target URL</span>
              <input
                value={values.targetUrl}
                onChange={handleFieldChange('targetUrl')}
                placeholder="https://example.com"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-300"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Requirement / Test Goal</span>
            <textarea
              value={values.testGoal}
              onChange={handleFieldChange('testGoal')}
              placeholder="Describe the requirement, expected behaviour, and business intent."
              rows={4}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-300"
            />
          </label>

          {localNote && (
            <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
              {localNote}
            </p>
          )}

          {/* Two action buttons */}
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onCreatePlan}
                disabled={isFormBusy}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/85 dark:text-slate-100 dark:hover:border-sky-400/50 dark:hover:text-sky-300"
              >
                {submittingPlan ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Plan Only
              </button>
              {planStatus && (
                <p className="max-w-xs text-xs text-slate-500 dark:text-slate-300">{planStatus}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onCreatePlanAndTests}
                disabled={isFormBusy}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                {submittingPlanAndTests ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Plan + Tests
              </button>
              {planAndTestsStatus && (
                <p className="max-w-xs text-xs text-slate-500 dark:text-slate-300">{planAndTestsStatus}</p>
              )}
            </div>
          </div>

          <div className="mt-1 grid gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/55 dark:text-slate-300">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Plan Only</span> — Creates a natural-language test plan with Gherkin-style scenarios. Submits a PR for your review. No Playwright code generated.
            </div>
            <div className="mt-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Plan + Tests</span> — Creates the same test plan and also triggers Playwright test script generation. Submits one PR containing spec, plan, and generated tests.
            </div>
          </div>
        </div>
      </section>

      {/* ── Section B: Generate tests for existing plans ── */}
      <section className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_20px_90px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Generate Tests for Existing Plans</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Select BRDs that have a test plan but no generated Playwright tests yet.
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-300">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-6">
          {brdsMissingTests.length === 0 ? (
            <p className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/55 dark:text-slate-300">
              All BRDs already have generated Playwright tests, or no BRDs are loaded yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid gap-2">
                {brdsMissingTests.map(brd => {
                  const checked = selectedBrds.includes(brd.brdId);
                  return (
                    <button
                      key={brd.brdId}
                      type="button"
                      onClick={() => onToggleBrd(brd.brdId)}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        checked
                          ? 'border-sky-400 bg-sky-50 dark:border-sky-400/40 dark:bg-sky-400/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/85 dark:hover:border-slate-500'
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                      ) : (
                        <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{brd.brdId}</span>
                          {brd.hasTestPlan ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
                              Has plan
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              No plan yet
                            </span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-300">{brd.testCaseId}</span>
                        </div>
                        <p className="mt-0.5 truncate text-slate-600 dark:text-slate-300">{brd.requirement}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={onGenerateTests}
                  disabled={isGenerateBusy || noSelections}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  {isGenerateBusy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Generate Tests ({selectedBrds.length} selected)
                </button>
                {generateStatus && (
                  <p className="text-sm text-slate-500 dark:text-slate-300">{generateStatus}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
