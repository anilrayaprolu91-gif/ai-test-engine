// Generates a structured natural-language test plan from a BRD using centralized AI config.
// Test plans are stored in plan/ (or custom output dir) and tracked in spec-mapping.json.
// These are NOT Playwright test scripts — they document intent only.
//
// Usage:
//   node scripts/create-test-plan.js --brd=BRD-01 --url=https://example.com --goal="Verify password reset"
//   node scripts/create-test-plan.js --brd=BRD-01 --agent="playwright/cli planner" --output-dir=plan

const fs = require('fs');
const path = require('path');
const { getGenerationContext, linkTestPlan } = require('../lib/specParser');
const { getAIConfig, getMissingKeyHint } = require('../lib/aiConfig');
const { generateText } = require('../lib/aiClient');

const aiConfig = getAIConfig('plan');
if (!aiConfig.apiKey) {
  console.error(getMissingKeyHint(aiConfig.provider));
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const brdArg = args.find(a => a.startsWith('--brd='));
  const urlArg = args.find(a => a.startsWith('--url='));
  const goalArg = args.find(a => a.startsWith('--goal='));
  const agentArg = args.find(a => a.startsWith('--agent='));
  const outputDirArg = args.find(a => a.startsWith('--output-dir='));
  const specFileArg = args.find(a => a.startsWith('--spec-file='));

  return {
    brdId: brdArg ? brdArg.split('=').slice(1).join('=').toUpperCase() : null,
    url: urlArg ? urlArg.split('=').slice(1).join('=') : '',
    goal: goalArg ? goalArg.split('=').slice(1).join('=') : '',
    plannerAgent: agentArg ? agentArg.split('=').slice(1).join('=') : 'playwright/cli planner',
    outputDir: outputDirArg ? outputDirArg.split('=').slice(1).join('=') : 'plan',
    specFile: specFileArg ? specFileArg.split('=').slice(1).join('=') : '',
  };
}

async function generateTestPlan({ brdId, requirement, url, goal, plannerAgent }) {
  const prompt = `
You are the ${plannerAgent} agent. Generate a structured test plan document for the following business requirement.

Rules:
- Write natural-language test cases only. Do NOT generate any code or Playwright scripts.
- Each test case must have: Title, Preconditions, Steps, Expected Result.
- Use Gherkin scenario style (Given/When/Then) where it adds clarity.
- Cover happy path, edge cases, and negative cases.
- Aim for 3–6 test scenarios.

BRD_ID: ${brdId}
Requirement: ${requirement}
${url ? `Application URL: ${url}` : ''}
${goal ? `Test Goal: ${goal}` : ''}

Output format (strict Markdown):

# Test Plan: ${brdId}

## Overview
<brief description of what this plan covers>

## Scope
<what is in scope vs out of scope>

## Test Scenarios

### Scenario 1: <title>
**Type:** Happy Path | Edge Case | Negative
**Preconditions:** <list>
**Steps:**
1. <step>
2. <step>
**Expected Result:** <outcome>

<repeat for each scenario>
`.trim();

  return generateText({
    task: 'plan',
    prompt,
  });
}

function stripCodeFences(text) {
  return String(text || '')
    .replace(/^```[a-zA-Z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

async function main() {
  const { brdId, url, goal, plannerAgent, outputDir, specFile } = parseArgs(process.argv);

  if (!brdId) {
    console.error('Usage: node scripts/create-test-plan.js --brd=BRD-01 [--url=https://...] [--goal="..."] [--agent="playwright/cli planner"] [--output-dir=plan]');
    process.exit(1);
  }

  const context = getGenerationContext(brdId);

  console.log(`Generating test plan for ${brdId}: ${context.requirement}`);
  if (specFile) {
    console.log(`Source spec: ${specFile}`);
  }
  console.log(`Planner agent: ${plannerAgent}`);

  const planMarkdown = stripCodeFences(
    await generateTestPlan({
      brdId: context.brdId,
      requirement: context.requirement,
      url,
      goal,
      plannerAgent,
    })
  );

  const header = [
    `@planner: ${plannerAgent}`,
    '@planner_output: true',
    `@brd: ${context.brdId}`,
    `@test_case_id: ${context.testCaseId}`,
    url ? `@url: ${url}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const finalMarkdown = `${header}\n\n${planMarkdown}`;

  const outputPath = path.resolve(outputDir || 'plan');
  const filename = `${Date.now()}-${context.brdId.toLowerCase()}-plan.md`;
  const outputFile = path.join(outputPath, filename);

  fs.mkdirSync(outputPath, { recursive: true });
  fs.writeFileSync(outputFile, finalMarkdown, 'utf8');

  linkTestPlan({
    brdId: context.brdId,
    file: outputFile,
    title: `Test Plan: ${context.brdId} - ${context.requirement}`,
  });

  console.log(`Test plan created: ${outputFile}`);
  console.log(`Linked ${context.brdId} -> ${filename}`);
}

main().catch(err => {
  console.error('create-test-plan failed:', err.message);
  process.exit(1);
});
