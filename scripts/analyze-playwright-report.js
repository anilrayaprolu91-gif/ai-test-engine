const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DEFAULT_REPORT_PATH = path.join(ROOT, 'output', 'playwright-report.json');
const DEFAULT_OUT_PATH = path.join(ROOT, 'output', 'analyze-failures.json');

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    reportPath: args[0] ? resolvePath(args[0]) : DEFAULT_REPORT_PATH,
    outPath: args[1] ? resolvePath(args[1]) : DEFAULT_OUT_PATH,
  };
}

function resolvePath(targetPath) {
  if (!targetPath) {
    return targetPath;
  }

  return path.isAbsolute(targetPath) ? targetPath : path.join(ROOT, targetPath);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input JSON not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractAnnotations(testEntry) {
  const annotations = Array.isArray(testEntry.annotations) ? testEntry.annotations : [];
  const map = new Map();

  for (const item of annotations) {
    const type = String(item.type || '').trim();
    const description = String(item.description || '').trim();
    if (type && description && !map.has(type)) {
      map.set(type, description);
    }
  }

  return map;
}

function findAllSpecs(suites, acc = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      acc.push(spec);
    }

    if (suite.suites && suite.suites.length > 0) {
      findAllSpecs(suite.suites, acc);
    }
  }

  return acc;
}

function pickFailingResult(testEntry) {
  const results = Array.isArray(testEntry.results) ? testEntry.results : [];
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const result = results[index];
    if (String(result.status || '').toLowerCase() !== 'passed') {
      return result;
    }
  }

  return null;
}

function collectErrorText(result) {
  const errors = Array.isArray(result && result.errors) ? result.errors : [];
  return errors
    .map(error => [error.message, error.value, error.stack].filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n');
}

function resolveSpecFile(specFile) {
  const candidates = [
    resolvePath(specFile),
    path.join(ROOT, 'tests', specFile || ''),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractTestBlock(source, title) {
  const start = source.indexOf(title);
  if (start < 0) {
    return source;
  }

  return source.slice(start, start + 2000);
}

function extractSelectorFromSource(specPath, title) {
  if (!specPath || !fs.existsSync(specPath)) {
    return null;
  }

  const source = fs.readFileSync(specPath, 'utf8');
  const block = extractTestBlock(source, title || '');
  const directMatch = block.match(/analyzeLocator\(\{[^}]*selector:\s*(['"`])([^'"`]+)\1/s);
  if (directMatch) {
    return directMatch[2].trim();
  }

  const variableMatch = block.match(/const\s+([A-Za-z0-9_$]+)\s*=\s*(['"`])([^'"`]+)\2\s*;[\s\S]{0,600}?analyzeLocator\(\{[^}]*selector:\s*\1?\s*\w+/s);
  if (variableMatch) {
    return variableMatch[3].trim();
  }

  const selectorAssignment = block.match(/const\s+[A-Za-z0-9_$]*selector[A-Za-z0-9_$]*\s*=\s*(['"`])([^'"`]+)\1/s);
  if (selectorAssignment) {
    return selectorAssignment[2].trim();
  }

  return null;
}

function extractLocatorSuggestion(errorText) {
  const match = String(errorText || '').match(/Locator not found:\s*([^\n\r]+)/i);
  if (!match) {
    return null;
  }

  const suggestion = String(match[1] || '').trim();
  if (!suggestion || suggestion === 'null' || suggestion === 'undefined') {
    return null;
  }

  return suggestion;
}

function inferFailureCategory(errorText) {
  const text = String(errorText || '').toLowerCase();
  if (text.includes('locator not found:') || text.includes('strict mode violation') || text.includes('waiting for locator')) {
    return { category: 'B', issueType: 'locator' };
  }

  return { category: 'C', issueType: 'assertion' };
}

function toFailureItem(spec, testEntry, result) {
  const annotations = extractAnnotations(testEntry);
  const errorText = collectErrorText(result);
  const category = inferFailureCategory(errorText);
  const specPath = resolveSpecFile(spec.file);
  const suggestion = extractLocatorSuggestion(errorText);
  const oldSelector = suggestion ? extractSelectorFromSource(specPath, spec.title) : null;
  const testCaseId =
    annotations.get('Test_Case_ID') ||
    (String(spec.title || '').match(/(TC-[A-Za-z0-9_-]+)/)?.[1] ?? null);

  const item = {
    test_title: spec.title,
    test_case_id: testCaseId,
    brd_id: annotations.get('BRD_ID') || null,
    file: path.relative(ROOT, specPath),
    project: testEntry.projectName || testEntry.projectId || null,
    status: String(result.status || 'failed').toLowerCase(),
    category: category.category,
    issueType: category.issueType,
    error: errorText,
  };

  if (oldSelector && suggestion && oldSelector !== suggestion) {
    item.old_selector = oldSelector;
    item.new_selector = suggestion;
    item.suggested_fix = {
      type: 'replace_selector',
      old_selector: oldSelector,
      new_selector: suggestion,
    };
  }

  return item;
}

function buildFailureReport(report) {
  const specs = findAllSpecs(report.suites || []);
  const failures = [];

  for (const spec of specs) {
    for (const testEntry of spec.tests || []) {
      const result = pickFailingResult(testEntry);
      if (!result) {
        continue;
      }

      failures.push(toFailureItem(spec, testEntry, result));
    }
  }

  const actionableLocatorFailures = failures.filter(item => item.category === 'B' && item.old_selector && item.new_selector);

  return {
    generatedAt: new Date().toISOString(),
    sourceReport: report?.config?.configFile || null,
    summary: {
      totalFailures: failures.length,
      actionableLocatorFailures: actionableLocatorFailures.length,
    },
    failures,
  };
}

function main() {
  const { reportPath, outPath } = parseArgs(process.argv);
  const report = readJson(reportPath);
  const payload = buildFailureReport(report);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Failure analysis written: ${outPath}`);
  console.log(`Total failures: ${payload.summary.totalFailures}`);
  console.log(`Actionable locator failures: ${payload.summary.actionableLocatorFailures}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`analyze-playwright-report failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  buildFailureReport,
  extractLocatorSuggestion,
  extractSelectorFromSource,
  inferFailureCategory,
};