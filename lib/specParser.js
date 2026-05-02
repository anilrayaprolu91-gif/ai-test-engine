const fs = require('fs');
const path = require('path');

const MAPPING_PATH = path.join(__dirname, '../output/spec-mapping.json');

function loadSpecMapping() {
  if (!fs.existsSync(MAPPING_PATH)) {
    throw new Error(`Missing mapping file: ${MAPPING_PATH}`);
  }

  return JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
}

function saveSpecMapping(mapping) {
  fs.writeFileSync(MAPPING_PATH, JSON.stringify(mapping, null, 2), 'utf8');
}

function getRequirementByBRD(brdId) {
  const mapping = loadSpecMapping();
  return mapping[String(brdId || '').toUpperCase()] || null;
}

function getRequirementByTestCaseId(testCaseId) {
  const mapping = loadSpecMapping();

  for (const [brdId, item] of Object.entries(mapping)) {
    if (item.test_case_id === testCaseId) {
      return {
        brd_id: brdId,
        ...item,
      };
    }
  }

  return null;
}

function getGenerationContext(brdId) {
  const normalized = String(brdId || '').toUpperCase();
  const item = getRequirementByBRD(normalized);

  if (!item) {
    throw new Error(`BRD not found: ${normalized}`);
  }

  return {
    brdId: normalized,
    testCaseId: item.test_case_id,
    requirement: item.requirement,
    title: `${item.test_case_id} - ${item.requirement}`,
  };
}

function linkGeneratedTest({ brdId, file, title, pageObjectFile }) {
  const normalized = String(brdId || '').toUpperCase();
  const mapping = loadSpecMapping();

  if (!mapping[normalized]) {
    throw new Error(`BRD not found: ${normalized}`);
  }

  mapping[normalized].generated_test = {
    file,
    title,
    page_object: pageObjectFile || null,
    linked_at: new Date().toISOString(),
  };

  saveSpecMapping(mapping);
  return mapping[normalized];
}

function linkGeneratedTestByTestCaseId({ testCaseId, file, title, pageObjectFile }) {
  const entry = getRequirementByTestCaseId(testCaseId);

  if (!entry) {
    throw new Error(`Test case not found: ${testCaseId}`);
  }

  return linkGeneratedTest({
    brdId: entry.brd_id,
    file,
    title,
    pageObjectFile,
  });
}

function linkTestPlan({ brdId, file, title }) {
  const normalized = String(brdId || '').toUpperCase();
  const mapping = loadSpecMapping();

  if (!mapping[normalized]) {
    throw new Error(`BRD not found: ${normalized}`);
  }

  mapping[normalized].test_plan = {
    file,
    title,
    linked_at: new Date().toISOString(),
  };

  saveSpecMapping(mapping);
  return mapping[normalized];
}

function getBRDsMissingTests() {
  const mapping = loadSpecMapping();

  return Object.entries(mapping)
    .filter(([, row]) => !row.generated_test)
    .map(([brdId, row]) => ({
      brdId,
      requirement: row.requirement || '',
      testCaseId: row.test_case_id || '',
      hasTestPlan: !!(row.test_plan && row.test_plan.file),
    }));
}

function listRequirements() {
  return loadSpecMapping();
}

module.exports = {
  loadSpecMapping,
  saveSpecMapping,
  getRequirementByBRD,
  getRequirementByTestCaseId,
  getGenerationContext,
  linkGeneratedTest,
  linkGeneratedTestByTestCaseId,
  linkTestPlan,
  getBRDsMissingTests,
  listRequirements,
};