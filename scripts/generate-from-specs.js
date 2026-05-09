const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const SPEC_DIRS = ['spec', 'specs'];

function listSpecFiles() {
  const files = [];

  for (const dirName of SPEC_DIRS) {
    const dir = path.join(ROOT, dirName);
    if (!fs.existsSync(dir)) {
      continue;
    }

    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.md') || name === 'spec.md') {
        continue;
      }

      files.push(path.join(dir, name));
    }
  }

  return files;
}

function getTag(content, tagName) {
  const match = String(content || '').match(new RegExp(`^@${tagName}:\\s*(.+)$`, 'im'));
  return match ? match[1].trim() : '';
}

function getTestGoal(content) {
  const section = String(content || '').match(/^#\s*Test Goal\s*$([\s\S]*?)(?=^#\s|\Z)/im);
  if (!section || !section[1]) {
    return '';
  }

  const line = section[1]
    .split(/\r?\n/)
    .map(item => item.trim())
    .find(item => item && !item.startsWith('@') && !item.startsWith('#'));

  return line || '';
}

function isTrue(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function runNodeScript(scriptPath, args, label) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    return {
      ok: false,
      message: `${label} failed with exit code ${result.status}`,
    };
  }

  return { ok: true, message: `${label} succeeded` };
}

function main() {
  const files = listSpecFiles();

  if (!files.length) {
    console.log('No markdown specs found in spec/ or specs/.');
    return;
  }

  const planScript = path.join(ROOT, 'scripts', 'create-test-plan.js');
  const convertScript = path.join(ROOT, 'scripts', 'convertSpec.js');

  let planFailures = 0;
  let testFailures = 0;
  let generatedPlans = 0;
  let generatedTests = 0;

  for (const absFile of files) {
    const relFile = path.relative(ROOT, absFile).split(path.sep).join('/');
    const baseName = path.basename(absFile);
    const inputDir = path.dirname(relFile);
    const content = fs.readFileSync(absFile, 'utf8');

    const brdId = getTag(content, 'brd');
    if (!brdId) {
      console.log(`Skipping ${relFile} (no @brd tag)`);
      continue;
    }

    const url = getTag(content, 'url');
    const testGoal = getTestGoal(content);
    const plannerAgent = getTag(content, 'planner-agent') || 'playwright/cli planner';
    const testGeneratorAgent = getTag(content, 'test-generator-agent') || 'playwright/cli test generator';
    const mode = getTag(content, 'generation-mode').toLowerCase();
    const generateTestsTag = getTag(content, 'generate-tests').toLowerCase();

    const planOnly =
      isTrue(getTag(content, 'plan-only')) ||
      mode === 'plan-only' ||
      generateTestsTag === 'false';

    const planArgs = [
      `--brd=${brdId}`,
      `--spec-file=${relFile}`,
      `--agent=${plannerAgent}`,
      '--output-dir=plan',
    ];

    if (url) {
      planArgs.push(`--url=${url}`);
    }
    if (testGoal) {
      planArgs.push(`--goal=${testGoal}`);
    }

    console.log(`Creating test plan for ${brdId} from ${relFile} using ${plannerAgent}...`);
    const planResult = runNodeScript(planScript, planArgs, `Plan generation for ${relFile}`);
    if (!planResult.ok) {
      planFailures += 1;
      console.log(`${planResult.message}. Continuing...`);
    } else {
      generatedPlans += 1;
    }

    if (planOnly) {
      console.log(`Skipping test generation for ${relFile} (plan-only mode)`);
      continue;
    }

    console.log(`Generating Playwright tests from ${relFile} using ${testGeneratorAgent}...`);
    const testResult = runNodeScript(
      convertScript,
      [baseName, `--input-dir=${inputDir}`, `--agent=${testGeneratorAgent}`],
      `Test generation for ${relFile}`
    );

    if (!testResult.ok) {
      testFailures += 1;
      console.error(testResult.message);
      continue;
    }

    generatedTests += 1;
  }

  console.log(`Plan generation completed: ${generatedPlans} succeeded, ${planFailures} failed.`);
  console.log(`Test generation completed: ${generatedTests} succeeded, ${testFailures} failed.`);

  if (testFailures > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  listSpecFiles,
  getTag,
  getTestGoal,
  isTrue,
};