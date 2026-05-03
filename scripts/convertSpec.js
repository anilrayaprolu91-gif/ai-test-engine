// Node.js script to convert Markdown specs to Playwright tests using centralized AI client and traceability mapping
// Usage:
//   node scripts/convertSpec.js <file.md> --brd=BRD-01
//   node scripts/convertSpec.js <file.md>
//   node scripts/convertSpec.js <planner-file.md> --input-dir=plan
// Supported metadata inside the markdown:
//   @brd: BRD-01
//   BRD_ID: BRD-01
//   @url: https://example.com

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { getGenerationContext, linkGeneratedTest } = require('../lib/specParser');
const { getAIConfig, getMissingKeyHint } = require('../lib/aiConfig');
const { generateText, listModels } = require('../lib/aiClient');

const aiConfig = getAIConfig('convert');
if (!aiConfig.apiKey) {
  console.error(getMissingKeyHint(aiConfig.provider));
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const specFile = args.find(arg => !arg.startsWith('--'));
  const brdArg = args.find(arg => arg.startsWith('--brd='));
  const inputDirArg = args.find(arg => arg.startsWith('--input-dir='));
  const agentArg = args.find(arg => arg.startsWith('--agent='));
  const listModels = args.includes('--list-models');
  const fromPlans = args.includes('--from-plans');

  return {
    specFile,
    brdId: brdArg ? brdArg.split('=')[1].toUpperCase() : null,
    inputDir: fromPlans
      ? 'plan'
      : inputDirArg
        ? inputDirArg.split('=').slice(1).join('=')
        : 'spec',
    generatorAgent: agentArg ? agentArg.split('=').slice(1).join('=') : 'playwright/cli test generator',
    listModels,
  };
}

function resolveInputFile(fileName, inputDir) {
  const candidates = [];

  if (path.isAbsolute(fileName)) {
    candidates.push(fileName);
  } else {
    if (inputDir) {
      candidates.push(path.resolve(inputDir, fileName));
    }

    candidates.push(path.resolve('spec', fileName));
    candidates.push(path.resolve('specs', fileName));
    candidates.push(path.resolve('plan', fileName));
    candidates.push(path.resolve('test-plans', fileName));
    candidates.push(path.resolve(fileName));
  }

  const found = candidates.find(candidate => fs.existsSync(candidate));
  return found || null;
}

function extractMetadata(markdown) {
  const brdMatch =
    markdown.match(/@brd:\s*(BRD-[A-Z0-9-]+)/i) ||
    markdown.match(/BRD_ID:\s*(BRD-[A-Z0-9-]+)/i);

  const urlMatch = markdown.match(/@url:\s*(\S+)/i);

  return {
    brdId: brdMatch ? brdMatch[1].toUpperCase() : null,
    url: urlMatch ? urlMatch[1] : null,
  };
}

function stripCodeFences(code) {
  return String(code || '')
    .replace(/^```[a-zA-Z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trimStart();
}

function ensureHealerAndTraceability(tsCode, context) {
  let code = String(tsCode || '');

  const hasHealerCall = code.includes('analyzeLocator(');
  if (!hasHealerCall) {
    throw new Error('Generated test is missing healer call analyzeLocator(...).');
  }

  const hasHealerImport =
    code.includes("from '../../lib/healer'") ||
    code.includes("from \"../../lib/healer\"") ||
    code.includes("require('../../lib/healer')") ||
    code.includes('require("../../lib/healer")');

  if (!hasHealerImport) {
    code = `const { analyzeLocator } = require('../../lib/healer');\n${code}`;
  }

  if (!code.includes(context.testCaseId)) {
    throw new Error(`Generated test is missing linked Test_Case_ID ${context.testCaseId}.`);
  }

  return code;
}

async function getPlaywrightPageContext(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Capture accessibility tree when available; some runtimes expose no accessibility API.
    const tree = page.accessibility && typeof page.accessibility.snapshot === 'function'
      ? await page.accessibility.snapshot()
      : { note: 'Accessibility snapshot unavailable in this runtime.' };

    // Extract interactive elements and build Playwright locator suggestions
    const elements = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('button, a, input, select, textarea, [role]').forEach(el => {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role') || null;
        const ariaLabel = el.getAttribute('aria-label') || '';
        const placeholder = el.getAttribute('placeholder') || '';
        const textContent = (el.textContent || '').trim().slice(0, 80);
        const testId = el.getAttribute('data-testid') || '';
        const inputType = tag === 'input' ? (el.getAttribute('type') || 'text') : null;
        const elId = el.getAttribute('id') || '';
        const labelText = elId
          ? (document.querySelector(`label[for="${elId}"]`) || {}).textContent || ''
          : '';

        const key = `${tag}:${ariaLabel || textContent || placeholder || testId || elId}`;
        if (!key.endsWith(':') && !seen.has(key)) {
          seen.add(key);
          results.push({ tag, role, ariaLabel, placeholder, textContent, testId, inputType, labelText: labelText.trim() });
        }
      });

      return results.slice(0, 50);
    });

    const locatorSuggestions = elements
      .map(el => {
        if (el.testId) return `page.getByTestId('${el.testId}')`;
        if (el.labelText) return `page.getByLabel('${el.labelText}')`;
        if (el.placeholder && (el.tag === 'input' || el.tag === 'textarea'))
          return `page.getByPlaceholder('${el.placeholder}')`;
        if (el.ariaLabel) {
          const r = el.role || (el.tag === 'button' ? 'button' : el.tag === 'a' ? 'link' : null);
          return r
            ? `page.getByRole('${r}', { name: '${el.ariaLabel}' })`
            : `page.getByLabel('${el.ariaLabel}')`;
        }
        if (el.textContent && (el.tag === 'button' || el.tag === 'a' || el.role === 'button' || el.role === 'link')) {
          const r = el.tag === 'a' || el.role === 'link' ? 'link' : 'button';
          return `page.getByRole('${r}', { name: '${el.textContent}' })`;
        }
        return null;
      })
      .filter(Boolean);

    return {
      accessibilityTree: JSON.stringify(tree, null, 2),
      locatorSuggestions,
    };
  } finally {
    await browser.close();
  }
}

async function generatePageObject({ pageContext, context, url, generatorAgent }) {
  const locatorHints = pageContext.locatorSuggestions.length > 0
    ? `\nDetected locators from the live page — use these for the getter implementations:\n${pageContext.locatorSuggestions.map(l => `  ${l}`).join('\n')}`
    : '';

  const className = context.brdId.replace(/[^A-Z0-9]/gi, '') + 'Page';

  const prompt = `
Generate a Playwright Page Object class in TypeScript for the following page.
Output TypeScript code ONLY — no markdown, no explanations, no code fences.

Agent identity:
- You are the ${generatorAgent} agent.

Rules:
- Class name: ${className}
- Constructor receives a Playwright Page instance.
- Expose a goto() method that navigates to: ${url || '/'}
- Expose typed getter properties for each interactive element found on the page.
  Each getter must return the Playwright Locator (e.g. get submitButton() { return this.page.getByRole('button', { name: 'Submit' }); })
- Expose action methods for common user flows inferred from the requirement (e.g. fillLoginForm, clickSubmit, getErrorMessage).
- Action methods must be async and use the getter locators — never raw page queries inside action methods.
- Do NOT include any test() or describe() blocks.
- Do NOT import from '@playwright/test'. Import Page and Locator from 'playwright'.

BRD_ID: ${context.brdId}
Requirement: ${context.requirement}
${locatorHints}

Accessibility Tree (for additional element context):
${pageContext.accessibilityTree}
`.trim();

  const code = await generateText({
    task: 'convert',
    prompt,
  });
  return { code, className };
}

async function convertMarkdownToTest({ markdown, pageContext, context, pageObjectClassName, pageObjectRelativePath, generatorAgent }) {
  const locatorHints = pageContext.locatorSuggestions.length > 0
    ? `\nDetected Playwright locators from live page (for reference only — prefer Page Object methods):\n${pageContext.locatorSuggestions.map(l => `  ${l}`).join('\n')}`
    : '';

  const prompt = `
Convert the following Markdown spec into a valid Playwright TypeScript test file.
Output TypeScript code ONLY — no markdown, no explanations, no code fences.

Agent identity:
- You are the ${generatorAgent} agent.

━━━ PAGE OBJECT MODEL (MANDATORY) ━━━
- Import the Page Object: import { ${pageObjectClassName} } from '${pageObjectRelativePath}';
- In test.beforeEach, instantiate it: const po = new ${pageObjectClassName}(page); await po.goto();
- ALL interactions MUST go through Page Object methods and getters — never call page.getByRole / page.locator etc. directly inside test() blocks.
- If the Page Object is missing an action you need, call po.page.getByRole(...) as a fallback but add a TODO comment.

━━━ STRUCTURE (MANDATORY) ━━━
- Wrap ALL tests in: test.describe('${context.brdId}: ${context.requirement}', () => { ... })
- Use test.beforeEach(async ({ page }) => { ... }) to instantiate the Page Object and navigate.
- Each test() title MUST include the Test_Case_ID: ${context.testCaseId}
- Add annotations at the start of each test:
    test.info().annotations.push({ type: 'BRD_ID', description: '${context.brdId}' });
    test.info().annotations.push({ type: 'Test_Case_ID', description: '${context.testCaseId}' });

━━━ ASSERTIONS (use the right matcher) ━━━
- await expect(page).toHaveURL(...)        — after navigation
- await expect(page).toHaveTitle(...)      — page title
- await expect(locator).toBeVisible()      — element presence
- await expect(locator).toHaveText('...')  — text match
- await expect(locator).toBeEnabled()      — interactive state
- await expect(locator).toHaveValue('...') — form field value
- await expect(locator).toBeChecked()      — checkbox/radio

━━━ STABILITY RULES (IMPORTANT) ━━━
- Prefer resilient semantic locators (role, label, stable visible text) over fragile alt-text assertions.
- Do NOT use page.getByAltText(...) for generic homepage sanity unless the requirement explicitly validates image/alt content.
- For "page loads correctly" checks, prioritize: toHaveURL, toHaveTitle, and at least one stable visible UI anchor.
- If text may vary by punctuation/casing, prefer case-insensitive regex over exact full-string equality.

━━━ HEALER INTEGRATION (KEEP AS-IS) ━━━
- Import: import { analyzeLocator } from '../../lib/healer';
- Before interacting with each critical locator: const result = await analyzeLocator({ page, selector });
- Decision tree:
  1) result.count == 1 && !result.visible => hidden, retry once before failing
  2) result.count == 0 => broken locator, use result.semanticMatch?.suggestion if available
  3) result.count == 1 && result.visible  => logic issue, fail with clear message

━━━ TRACEABILITY ━━━
- BRD_ID: ${context.brdId}
- Test_Case_ID: ${context.testCaseId} (reuse exactly, do NOT invent a new one)
- Requirement: ${context.requirement}

Markdown Spec:
${markdown}
${locatorHints}

Accessibility Tree (additional context):
${pageContext.accessibilityTree}
`.trim();

  return generateText({
    task: 'convert',
    prompt,
  });
}

async function printModels() {
  try {
    const models = await listModels('convert');
    console.log(`Available models for provider: ${aiConfig.provider}`);
    for (const model of models) {
      console.log(`- ${model}`);
    }
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

async function main() {
  const { specFile, brdId: brdIdFromArgs, inputDir, generatorAgent } = parseArgs(process.argv);

  if (!specFile) {
    console.error('Usage: node scripts/convertSpec.js <file.md> [--brd=BRD-01] [--input-dir=spec|plan] [--agent="playwright/cli test generator"]');
    process.exit(1);
  }

  const specPath = resolveInputFile(specFile, inputDir);
  if (!fs.existsSync(specPath)) {
    console.error(`Input file not found for ${specFile}. Tried input-dir=${inputDir}, spec/, specs/, plan/, and test-plans/.`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(specPath, 'utf8');
  console.log(`Using input file: ${specPath}`);
  const metadata = extractMetadata(markdown);
  const brdId = brdIdFromArgs || metadata.brdId;

  if (!brdId) {
    console.error('BRD_ID not found. Pass --brd=BRD-01 or add "@brd: BRD-01" to the spec file.');
    process.exit(1);
  }

  const context = getGenerationContext(brdId);

  let pageContext = {
    accessibilityTree: 'No URL provided; accessibility tree unavailable.',
    locatorSuggestions: [],
  };
  if (metadata.url) {
    console.log(`Extracting Playwright page context from: ${metadata.url}`);
    pageContext = await getPlaywrightPageContext(metadata.url);
    console.log(`Found ${pageContext.locatorSuggestions.length} locator suggestions.`);
  }

  // Step 1 — generate Page Object
  console.log('Generating Page Object...');
  const { code: rawPoCode, className: pageObjectClassName } = await generatePageObject({
    pageContext,
    context,
    url: metadata.url || '',
    generatorAgent,
  });
  const poCode = stripCodeFences(rawPoCode);

  const pagesDir = path.resolve('tests', 'pages');
  fs.mkdirSync(pagesDir, { recursive: true });
  const poFile = path.join(pagesDir, `${pageObjectClassName}.ts`);
  fs.writeFileSync(poFile, poCode, 'utf8');
  console.log(`Generated Page Object: ${poFile}`);

  // Relative import path from tests/generated/ to tests/pages/
  const pageObjectRelativePath = `../pages/${pageObjectClassName}`;

  // Step 2 — generate spec that uses the Page Object
  console.log('Generating test spec...');
  let tsCode = await convertMarkdownToTest({
    markdown,
    pageContext,
    context,
    pageObjectClassName,
    pageObjectRelativePath,
    generatorAgent,
  });

  tsCode = stripCodeFences(tsCode);
  tsCode = ensureHealerAndTraceability(tsCode, context);

  const outputDir = path.resolve('tests', 'generated');
  const outputFile = path.join(outputDir, `${context.testCaseId}.spec.ts`);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, tsCode, 'utf8');

  linkGeneratedTest({
    brdId: context.brdId,
    file: outputFile,
    title: context.title,
    pageObjectFile: poFile,
  });

  console.log(`Generated test spec: ${outputFile}`);
  console.log(`Linked ${context.brdId} -> ${context.testCaseId}`);
  console.log(`Page Object: ${poFile}`);
}

const args = parseArgs(process.argv);

if (args.listModels) {
  printModels().then(() => process.exit(0));
} else {
  main().catch(error => {
    console.error('convertSpec failed:', error.message);
    process.exit(1);
  });
}

