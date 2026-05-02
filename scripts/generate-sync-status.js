const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MAPPING_PATH = path.join(ROOT, 'output', 'spec-mapping.json');
const DEFAULT_FAILURES_PATH = path.join(ROOT, 'output', 'analyze-failures.json');
const OUT_PATH = path.join(ROOT, 'ui', 'public', 'sync-status.json');

function extractTestCasesFromSpec(specFilePath) {
  if (!specFilePath || !fs.existsSync(specFilePath)) {
    return [];
  }

  const content = fs.readFileSync(specFilePath, 'utf8');
  const regex = /test\(\s*['"`]\s*(TC-[A-Za-z0-9_-]+)\s*:\s*([^'"`]+?)\s*['"`]\s*,/g;
  const seen = new Set();
  const cases = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const id = String(match[1] || '').trim();
    const description = String(match[2] || '').trim();
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    cases.push({
      id,
      description,
    });
  }

  return cases;
}

function collectTestCases(row) {
  const fromSpec = extractTestCasesFromSpec(row && row.generated_test ? row.generated_test.file : null);
  if (fromSpec.length > 0) {
    return fromSpec;
  }

  const fallbackId = row && row.test_case_id ? String(row.test_case_id).trim() : '';
  if (!fallbackId) {
    return [];
  }

  return [
    {
      id: fallbackId,
      description: row && row.requirement ? String(row.requirement) : '',
    },
  ];
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const failuresArg = args.find(arg => arg.startsWith('--failures='));
  const buildArg = args.find(arg => arg.startsWith('--buildId='));

  return {
    failuresPath: failuresArg ? failuresArg.split('=')[1] : null,
    buildId: buildArg ? buildArg.split('=')[1] : null,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadMapping() {
  if (!fs.existsSync(MAPPING_PATH)) {
    return {};
  }

  return readJson(MAPPING_PATH);
}

function normalizeFailuresShape(data) {
  if (!data) {
    return [];
  }

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

function loadFailures(failuresPath) {
  const target = failuresPath
    ? path.isAbsolute(failuresPath)
      ? failuresPath
      : path.join(ROOT, failuresPath)
    : DEFAULT_FAILURES_PATH;

  if (!fs.existsSync(target)) {
    return [];
  }

  return normalizeFailuresShape(readJson(target));
}

function buildTestCaseToBrdIndex(mapping) {
  const index = new Map();

  for (const [brdId, row] of Object.entries(mapping)) {
    const testCases = collectTestCases(row);
    for (const testCase of testCases) {
      if (testCase.id) {
        index.set(String(testCase.id), brdId);
      }
    }
  }

  return index;
}

function extractFailingBrds(failures, tcToBrd) {
  const failing = new Set();

  for (const item of failures) {
    const rawStatus = String(item.status || item.result || '').toLowerCase();
    const isFailure = rawStatus.includes('fail') || !rawStatus;

    if (!isFailure) {
      continue;
    }

    const byBrd = item.brdId || item.brd_id || item.BRD_ID;
    if (byBrd) {
      failing.add(String(byBrd).toUpperCase());
      continue;
    }

    const tcId = item.test_case_id || item.testCaseId || item.tc_id || item.testId;
    if (tcId && tcToBrd.has(String(tcId))) {
      failing.add(tcToBrd.get(String(tcId)));
    }
  }

  return failing;
}

function buildPayload(mapping, failingBrds, buildId) {
  const results = Object.entries(mapping).map(([brdId, row]) => {
    const testCases = collectTestCases(row);

    return {
      brdId,
      requirement: row.requirement || '',
      testCaseId: testCases[0] ? testCases[0].id : row.test_case_id || '',
      testCases,
      status: failingBrds.has(brdId) ? 'failing' : 'passing',
      hasTestPlan: !!(row.test_plan && row.test_plan.file),
      hasGeneratedTest: !!(row.generated_test && row.generated_test.file),
    };
  });

  results.sort((a, b) => a.brdId.localeCompare(b.brdId, undefined, { numeric: true }));

  return {
    buildId,
    updatedAt: new Date().toISOString(),
    results,
  };
}

function resolveBuildId(cliBuildId) {
  if (cliBuildId) {
    return cliBuildId;
  }

  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.BUILD_ID ||
    `local-${Date.now()}`
  );
}

function main() {
  const { failuresPath, buildId } = parseArgs(process.argv);
  const mapping = loadMapping();
  const failures = loadFailures(failuresPath);

  const tcToBrd = buildTestCaseToBrdIndex(mapping);
  const failingBrds = extractFailingBrds(failures, tcToBrd);
  const payload = buildPayload(mapping, failingBrds, resolveBuildId(buildId));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Sync status generated: ${OUT_PATH}`);
  console.log(`Failing BRDs: ${failingBrds.size}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`generate-sync-status failed: ${error.message}`);
    process.exit(1);
  }
}
