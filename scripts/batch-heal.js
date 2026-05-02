const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const QA_REVIEW_DIR = path.join(ROOT, 'QA_Manual_Review');

function parseArgs(argv) {
  const args = argv.slice(2);
  const fileArg = args.find(arg => !arg.startsWith('--'));
  const commit = args.includes('--commit');
  const dryRun = args.includes('--dry-run');

  return {
    inputPath: fileArg || path.join('output', 'analyze-failures.json'),
    commit,
    dryRun,
  };
}

function readJson(inputPath) {
  const resolved = path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Input JSON not found: ${resolved}`);
  }

  return {
    resolved,
    data: JSON.parse(fs.readFileSync(resolved, 'utf8')),
  };
}

function normalizeFailures(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.failures)) {
    return data.failures;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

function isCategoryBLocator(item) {
  const category = String(item.category || item.failure_category || '').toLowerCase();
  const issueType = String(item.issueType || item.issue_type || item.classification || '').toLowerCase();
  const bucket = String(item.bucket || '').toLowerCase();

  const categoryB =
    category === 'b' ||
    category === 'category b' ||
    category === 'category_b' ||
    bucket === 'category b';

  const locatorIssue =
    issueType.includes('locator') ||
    String(item.reason || '').toLowerCase().includes('locator');

  return categoryB && locatorIssue;
}

function toAbsoluteFile(filePath) {
  if (!filePath) {
    return null;
  }

  return path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
}

function applyReplace({ filePath, find, replaceWith, dryRun = false }) {
  const absPath = toAbsoluteFile(filePath);
  if (!absPath || !fs.existsSync(absPath)) {
    return { changed: false, reason: `File not found: ${filePath || 'unknown'}` };
  }

  if (!absPath.endsWith('.spec.ts')) {
    return { changed: false, reason: `Target is not a .spec.ts file: ${filePath}` };
  }

  const source = fs.readFileSync(absPath, 'utf8');
  if (!find || !source.includes(find)) {
    return { changed: false, reason: `Pattern not found in ${filePath}` };
  }

  const updated = source.split(find).join(replaceWith || '');
  if (updated === source) {
    return { changed: false, reason: `No content change for ${filePath}` };
  }

  if (dryRun) {
    return { changed: true, reason: `[dry-run] Would update ${filePath}` };
  }

  fs.writeFileSync(absPath, updated, 'utf8');
  return { changed: true, reason: `Updated ${filePath}` };
}

function applySuggestedFix(item, { dryRun = false } = {}) {
  const filePath = item.spec_file || item.file || item.testFile || item.path;
  const fix = item.suggested_fix || item.fix || item.suggestedFix || {};

  if (!filePath) {
    return { changed: false, reason: 'Missing target file path on failure item' };
  }

  if (fix.type === 'replace_text') {
    return applyReplace({
      filePath,
      find: fix.find,
      replaceWith: fix.replace,
      dryRun,
    });
  }

  if (fix.type === 'replace_selector') {
    return applyReplace({
      filePath,
      find: fix.old_selector || fix.oldSelector,
      replaceWith: fix.new_selector || fix.newSelector,
      dryRun,
    });
  }

  if (typeof fix.find === 'string' && typeof fix.replace === 'string') {
    return applyReplace({
      filePath,
      find: fix.find,
      replaceWith: fix.replace,
      dryRun,
    });
  }

  if (typeof item.old_selector === 'string' && typeof item.new_selector === 'string') {
    return applyReplace({
      filePath,
      find: item.old_selector,
      replaceWith: item.new_selector,
      dryRun,
    });
  }

  return {
    changed: false,
    reason: `Unsupported fix schema for ${filePath}`,
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectGrepTokens(items) {
  const tokens = new Set();

  for (const item of items) {
    const tc = item.test_case_id || item.testCaseId;
    const testTitle = item.test_title || item.testTitle || item.title;

    if (tc) {
      tokens.add(tc);
    }

    if (testTitle) {
      tokens.add(testTitle);
    }
  }

  return Array.from(tokens);
}

function runPlaywrightGrep(tokens) {
  if (!tokens.length) {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'No grep tokens found to rerun healed tests',
      command: 'npx playwright test --grep <empty>',
    };
  }

  const grepPattern = tokens.map(escapeRegex).join('|');
  const args = ['playwright', 'test', '--grep', grepPattern];
  const result = spawnSync('npx', args, { cwd: ROOT, encoding: 'utf8' });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    command: `npx ${args.join(' ')}`,
  };
}

function runGit(args) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function hasStagedChanges() {
  const diff = runGit(['diff', '--cached', '--name-only']);
  return diff.status === 0 && diff.stdout.trim().length > 0;
}

function commitHealedChanges(files, summary) {
  const relFiles = files.map(file => path.relative(ROOT, file));
  const add = runGit(['add', ...relFiles]);
  if (add.status !== 0) {
    throw new Error(add.stderr || 'git add failed');
  }

  if (!hasStagedChanges()) {
    return { committed: false, message: 'No staged changes to commit' };
  }

  const commitMessage = `[AI-HEALED] ${summary}`;
  const commit = runGit(['commit', '-m', commitMessage]);
  if (commit.status !== 0) {
    throw new Error(commit.stderr || 'git commit failed');
  }

  return { committed: true, message: commitMessage };
}

function escalate(items, details) {
  fs.mkdirSync(QA_REVIEW_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(QA_REVIEW_DIR, `healer-escalation-${stamp}.json`);

  const payload = {
    status: 'escalated',
    created_at: new Date().toISOString(),
    reason: 'Batch healer rerun failed',
    details,
    items,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return outPath;
}

function main() {
  const { inputPath, commit, dryRun } = parseArgs(process.argv);
  const { resolved, data } = readJson(inputPath);
  const failures = normalizeFailures(data);
  const locatorItems = failures.filter(isCategoryBLocator);

  if (!locatorItems.length) {
    console.log(`No Category B Locator issues found in ${resolved}`);
    return;
  }

  const changedFiles = new Set();
  const applyReport = [];

  for (const item of locatorItems) {
    const outcome = applySuggestedFix(item, { dryRun });
    applyReport.push({
      id: item.id || item.failure_id || null,
      file: item.spec_file || item.file || item.testFile || item.path || null,
      changed: outcome.changed,
      message: outcome.reason,
    });

    if (outcome.changed) {
      const abs = toAbsoluteFile(item.spec_file || item.file || item.testFile || item.path);
      if (abs) {
        changedFiles.add(abs);
      }
    }
  }

  const changed = Array.from(changedFiles);
  if (!changed.length) {
    const escalationPath = escalate(locatorItems, {
      reason: 'No fixes could be applied',
      applyReport,
    });
    console.error(`No fixes applied. Escalated: ${escalationPath}`);
    process.exit(1);
  }

  const tokens = collectGrepTokens(locatorItems);
  console.log(`Applied fixes to ${changed.length} file(s).`);
  console.log(`Re-running filtered tests with ${tokens.length} grep token(s).`);

  if (dryRun) {
    console.log('Dry run enabled. Skipping test rerun, commit, and escalation.');
    return;
  }

  const rerun = runPlaywrightGrep(tokens);
  process.stdout.write(rerun.stdout);
  process.stderr.write(rerun.stderr);

  if (rerun.ok) {
    if (!commit) {
      console.log('Healed tests passed. Commit skipped (use --commit to enable auto-commit).');
      return;
    }

    const result = commitHealedChanges(changed, `batch locator fixes (${changed.length} files)`);
    if (result.committed) {
      console.log(`Committed successfully: ${result.message}`);
    } else {
      console.log(result.message);
    }

    return;
  }

  const escalationPath = escalate(locatorItems, {
    rerunCommand: rerun.command,
    rerunExitCode: rerun.status,
    applyReport,
  });

  console.error(`Healed tests still failing. Escalated to: ${escalationPath}`);
  process.exit(1);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`batch-heal failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  normalizeFailures,
  isCategoryBLocator,
  applySuggestedFix,
  collectGrepTokens,
  runPlaywrightGrep,
};
