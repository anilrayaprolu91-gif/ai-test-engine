// Node.js script to convert Markdown specs to Playwright tests using Gemini SDK and POM
// Usage: node scripts/convertSpec.js <specFile.md>

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');


// Configure Gemini API key (set in .env or as env var)
const dotenvResult = require('dotenv').config();
console.log('Loaded .env:', dotenvResult.parsed ? 'yes' : 'No .env found');
console.log('process.env.GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '[set]' : '[not set]');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set in environment');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function convertMarkdownToTest(markdown, accessibilityTree) {
  const prompt = `Convert the following Markdown spec into a Playwright test using the Page Object Model. Use the provided accessibility tree for selectors/context.\n\n---\nMarkdown Spec:\n${markdown}\n\n---\nAccessibility Tree:\n${accessibilityTree}\n\nOutput only valid TypeScript code for a Playwright test file, using POM best practices.`;
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function getAccessibilityTree(url) {
  // Launch Playwright and get the accessibility tree for the given URL
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const tree = await page.accessibility.snapshot();
  await browser.close();
  return JSON.stringify(tree, null, 2);
}

async function listModels() {
  try {
    const models = await genAI.listModels();
    console.log('Available models:');
    for (const m of models.models) {
      console.log(`- ${m.name} (supported methods: ${m.supportedGenerationMethods?.join(', ')})`);
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

async function main() {
  const [,, specFile] = process.argv;
  if (!specFile) {
    console.error('Usage: node scripts/convertSpec.js <specFile.md>');
    process.exit(1);
  }
  const specPath = path.resolve('specs', specFile);
  if (!fs.existsSync(specPath)) {
    console.error(`Spec file not found: ${specPath}`);
    process.exit(1);
  }
  const markdown = fs.readFileSync(specPath, 'utf-8');

  // Optionally, extract a URL from the Markdown or prompt user
  const urlMatch = markdown.match(/@url:\s*(\S+)/);
  const url = urlMatch ? urlMatch[1] : null;
  let accessibilityTree = '';
  if (url) {
    accessibilityTree = await getAccessibilityTree(url);
  } else {
    accessibilityTree = 'No URL provided; accessibility tree unavailable.';
  }

  let tsCode = await convertMarkdownToTest(markdown, accessibilityTree);
  // Remove Markdown code block markers if present
  tsCode = tsCode.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
  const outFile = path.resolve('tests', specFile.replace(/\.md$/, '.spec.ts'));
  fs.writeFileSync(outFile, tsCode.trimStart());
  console.log(`Generated test: ${outFile}`);
}

// List models if script is run with --list-models
if (process.argv.includes('--list-models')) {
  listModels().then(() => process.exit(0));
} else if (!process.argv.some(arg => arg.startsWith('--'))) {
  main();
}

