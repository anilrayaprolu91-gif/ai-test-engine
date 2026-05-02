const fs = require('fs');
const path = require('path');

const SPEC_PATH = path.join(__dirname, '../specs/spec.md');
const MAPPING_PATH = path.join(__dirname, '../output/spec-mapping.json');

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRequirement(value) {
  return String(value || '')
    .replace(/\|/g, '\\|')
    .trim();
}

function parseRawInput(rawText) {
  return String(rawText || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(BRD-[A-Z0-9-]+)\s*[:|]\s*(.+)$/i);
      if (!match) return null;

      return {
        brdId: match[1].toUpperCase(),
        requirement: normalizeRequirement(match[2]),
      };
    })
    .filter(Boolean);
}

function parseSpecTable(content) {
  const rows = [];

  for (const line of String(content || '').split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    if (line.includes('BRD_ID') || line.includes('---')) continue;

    const cols = line.split('|').map(col => col.trim()).filter(Boolean);
    if (cols.length !== 4) continue;

    rows.push({
      brdId: cols[0],
      requirement: cols[1],
      testCaseId: cols[2],
      lastUpdated: cols[3],
    });
  }

  return rows;
}

function getNextTestCaseId(rows) {
  const max = rows.reduce((currentMax, row) => {
    const value = Number(String(row.testCaseId || '').replace(/^TC-/i, ''));
    return Number.isFinite(value) ? Math.max(currentMax, value) : currentMax;
  }, 100);

  return `TC-${max + 1}`;
}

function buildMarkdown(rows) {
  const header = [
    '# Living Specification',
    '',
    '| BRD_ID | Requirement | Test_Case_ID | Last_Updated |',
    '|--------|-------------|--------------|--------------|',
  ].join('\n');

  const body = rows
    .map(row => `| ${row.brdId} | ${row.requirement} | ${row.testCaseId} | ${row.lastUpdated} |`)
    .join('\n');

  return `${header}\n${body}\n`;
}

function buildMapping(rows) {
  const mapping = {};

  for (const row of rows) {
    mapping[row.brdId] = {
      requirement: row.requirement.replace(/\\\|/g, '|'),
      test_case_id: row.testCaseId,
      last_updated: row.lastUpdated,
    };
  }

  return mapping;
}

function syncRequirements(rawText) {
  fs.mkdirSync(path.dirname(SPEC_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(MAPPING_PATH), { recursive: true });

  const existingContent = fs.existsSync(SPEC_PATH)
    ? fs.readFileSync(SPEC_PATH, 'utf8')
    : '';

  const rows = parseSpecTable(existingContent);
  const incoming = parseRawInput(rawText);
  const today = getToday();

  for (const item of incoming) {
    const existing = rows.find(row => row.brdId === item.brdId);

    if (existing) {
      existing.requirement = item.requirement;
      existing.lastUpdated = today;
    } else {
      rows.push({
        brdId: item.brdId,
        requirement: item.requirement,
        testCaseId: getNextTestCaseId(rows),
        lastUpdated: today,
      });
    }
  }

  rows.sort((a, b) => a.brdId.localeCompare(b.brdId, undefined, { numeric: true }));

  fs.writeFileSync(SPEC_PATH, buildMarkdown(rows), 'utf8');
  fs.writeFileSync(MAPPING_PATH, JSON.stringify(buildMapping(rows), null, 2), 'utf8');

  return buildMapping(rows);
}

if (require.main === module) {
  const rawText = process.argv.slice(2).join('\n');
  syncRequirements(rawText);
}

module.exports = {
  syncRequirements,
  parseRawInput,
  parseSpecTable,
  getNextTestCaseId,
  buildMapping,
};