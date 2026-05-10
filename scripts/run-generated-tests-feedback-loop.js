const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'output', 'playwright-report.json');
const FAILURES_PATH = path.join(ROOT, 'output', 'analyze-failures.json');

function parseArgs(argv) {
  const args = argv.slice(2);
  const maxRoundsArg = args.find(arg => arg.startsWith('--max-rounds='));
  const reporterArg = args.find(arg => arg.startsWith('--reporter='));

  const envRounds = process.env.HEAL_FEEDBACK_MAX_ROUNDS;
  const maxRounds = Number(
    (maxRoundsArg && maxRoundsArg.split('=')[1]) || envRounds || 2
  );

  return {
    maxRounds: Number.isFinite(maxRounds) && maxRounds > 0 ? Math.floor(maxRounds) : 2,
    reporter: (reporterArg && reporterArg.split('=')[1]) || 'line,json',
  };
}

function runNodeScript(scriptRelativePath, args = [], extraEnv = {}) {
  const scriptPath = path.join(ROOT, scriptRelativePath);
  const result = spawnSync('node', [scriptPath, ...args], {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    shell: false,
  });

  return result.status || 0;
}

function loadFailures(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function hasActionableLocatorFailures(items) {
  return items.some(item => {
    if (!item) {
      return false;
    }

    const category = String(item.category || '').toUpperCase();
    const suggested = item.suggested_fix || {};

    return (
      category === 'B' &&
      ((item.old_selector && item.new_selector) ||
        (suggested.old_selector && suggested.new_selector))
    );
  });
}

function analyzeFailures() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.log('Skipping failure analysis: output/playwright-report.json not found.');
    return 1;
  }

  return runNodeScript('scripts/analyze-playwright-report.js', [
    'output/playwright-report.json',
    'output/analyze-failures.json',
  ]);
}

function main() {
  const { maxRounds, reporter } = parseArgs(process.argv);
  console.log(`Starting generated test feedback loop (max rounds: ${maxRounds}).`);

  for (let round = 1; round <= maxRounds; round += 1) {
    console.log(`\n=== Feedback Round ${round}/${maxRounds}: run generated tests ===`);
    const testExitCode = runNodeScript(
      'scripts/run-generated-tests.js',
      [`--reporter=${reporter}`],
      { PLAYWRIGHT_JSON_OUTPUT_NAME: 'output/playwright-report.json' }
    );

    if (testExitCode === 0) {
      console.log('Generated tests passed.');
      process.exit(0);
    }

    console.log('Generated tests failed. Analyzing failures...');
    const analyzeExitCode = analyzeFailures();
    if (analyzeExitCode !== 0) {
      console.error('Failure analysis failed. Stopping feedback loop.');
      process.exit(testExitCode);
    }

    const failures = loadFailures(FAILURES_PATH);
    const actionable = hasActionableLocatorFailures(failures);
    if (!actionable) {
      console.log('No actionable locator fixes found. Stopping feedback loop.');
      process.exit(testExitCode);
    }

    console.log('Applying batch healer for actionable locator failures...');
    const healExitCode = runNodeScript('scripts/batch-heal.js', ['output/analyze-failures.json']);

    if (healExitCode !== 0) {
      console.log('Batch healer did not fully resolve failures in this round. Continuing loop if rounds remain.');
    }
  }

  console.error(`Feedback loop reached max rounds without full pass (${maxRounds}).`);
  process.exit(1);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`run-generated-tests-feedback-loop failed: ${error.message}`);
    process.exit(1);
  }
}
