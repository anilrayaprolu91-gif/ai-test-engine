# AI Test Engine - Complete Architecture & Knowledge Base

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [File-by-File Architecture](#file-by-file-architecture)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [How Each Component Works](#how-each-component-works)
5. [Step-by-Step Workflows](#step-by-step-workflows)
6. [Key Concepts for Beginners](#key-concepts-for-beginners)
7. [Command Reference](#command-reference)
8. [Healer Logic](#healer-logic)
9. [Handover Checklist](#handover-checklist)

---

## 🎯 System Overview

### What is AI Test Engine?

**AI Test Engine** is an intelligent testing system that:

- **Manages requirements** (called BRDs - Business Requirements Documents)
- **Automatically generates tests** from those requirements using AI
- **Links everything together** so when a test fails, you know exactly which requirement failed
- **Keeps a "Living Specification"** that stays in sync with your tests

### The Brain: `spec.md`

Think of `spec.md` as the **single source of truth**. It's a Markdown table that looks like:

```
| BRD_ID  | Requirement                    | Test_Case_ID | Last_Updated |
|---------|--------------------------------|--------------|--------------|
| BRD-01  | User can reset password        | TC-101       | 2026-04-29   |
| BRD-02  | Guest checkout works           | TC-102       | 2026-04-29   |
| BRD-03  | Order confirmation email sent  | TC-103       | 2026-04-29   |
```

Each row is **unique** and stays linked to:

- A requirement (what the app should do)
- A test case ID (the specific test that checks it)
- When it was last updated

---

## 📁 File-by-File Architecture

### 1. **`package.json`** - Project Configuration

**Location:** `d:\ai-test-engine\package.json`

**What it does:**

- Tells Node.js what this project is
- Lists all dependencies (libraries used)
- Defines scripts (commands you can run)

**Key sections:**

```json
{
  "name": "ai-test-engine",
  "version": "1.1.0",
  "description": "Living Specification and Playwright traceability utilities",
  "scripts": {
    "sync": "node scripts/sync-requirements.js",
    "sync:requirements": "node scripts/sync-requirements.js",
    "test": "playwright test",
    "test:report": "playwright show-report"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1", // AI engine (Gemini)
    "dotenv": "^17.4.2" // Reads .env file
  },
  "devDependencies": {
    "@playwright/test": "^1.59.1" // Browser automation
  }
}
```

**For beginners:** Think of `package.json` as a recipe card that tells Node.js:

- What this project needs to run
- What commands are available
- What version of each tool to use

**Common commands:**

```bash
npm install                          # Install all dependencies
npm run sync:requirements -- "..."   # Add/update requirements
npm test                             # Run all generated tests
npm run test:report                  # View test results
```

---

### 2. **`specs/spec.md`** - Living Specification (The Brain)

**Location:** `d:\ai-test-engine\specs\spec.md`

**What it does:**

- Stores all requirements in a **Markdown table**
- Is the **master reference** for all tests
- Gets updated whenever you add/modify requirements
- Never deletes old entries (living = always grows)

**Format:**

```markdown
# Living Specification

| BRD_ID | Requirement                                       | Test_Case_ID | Last_Updated |
| ------ | ------------------------------------------------- | ------------ | ------------ |
| BRD-01 | User must be able to reset password via email.    | TC-101       | 2026-04-28   |
| BRD-02 | Guest checkout should not require a phone number. | TC-102       | 2026-04-28   |
| BRD-03 | Users should receive an order confirmation email. | TC-103       | 2026-04-29   |
```

**Why it matters:**

- It's **human-readable** (anyone can read it)
- It's **version-controlled** (you can see history in Git)
- It's the **traceability matrix** (connects requirements to tests)
- It's **the source of truth** - everything else is derived from this

**Column meanings:**
| Column | Meaning |
|--------|---------|
| BRD_ID | Unique identifier for the business requirement (e.g., BRD-01) |
| Requirement | Human-readable description of what should be tested |
| Test_Case_ID | Unique test identifier (e.g., TC-101) - links to generated tests |
| Last_Updated | When this requirement was last added or modified |

---

### 3. **`output/spec-mapping.json`** - Structured Data Mirror

**Location:** `d:\ai-test-engine\output\spec-mapping.json`

**What it does:**

- **Mirrors** `spec.md` but in JSON format (computer-friendly)
- Used by code to look up requirements quickly
- Stores links to generated tests
- **NOT the source of truth** - `spec.md` is

**Format:**

```json
{
  "BRD-01": {
    "requirement": "User must be able to reset password via email.",
    "test_case_id": "TC-101",
    "last_updated": "2026-04-28",
    "generated_test": null
  },
  "BRD-02": {
    "requirement": "Guest checkout should not require a phone number.",
    "test_case_id": "TC-102",
    "last_updated": "2026-04-28",
    "generated_test": {
      "file": "tests/generated/TC-102.spec.ts",
      "title": "TC-102 - Guest checkout should not require a phone number.",
      "linked_at": "2026-04-29T10:30:00.000Z"
    }
  }
}
```

**For beginners:** JSON is like a filing cabinet:

- Each key (`BRD-01`, `BRD-02`) is a folder
- Inside each folder are the details about that requirement
- Programs can read this very quickly

**Key fields:**
| Field | Value | Purpose |
|-------|-------|---------|
| `requirement` | String | The requirement text |
| `test_case_id` | "TC-XXX" | Links to the test file |
| `last_updated` | Date | When synced |
| `generated_test` | Object or null | Where the test file lives |

---

### 4. **`scripts/sync-requirements.js`** - The Synchronizer

**Location:** `d:\ai-test-engine\scripts\sync-requirements.js`

**What it does:**

1. Takes raw requirement text as input
2. Parses it into structured data
3. **Updates** `spec.md` and `spec-mapping.json`
4. Assigns unique Test_Case_IDs to new requirements
5. Updates `Last_Updated` timestamp for changed requirements

**How it works (step-by-step):**

```
Input (raw text):
"BRD-01: User can reset password | BRD-02: Guest checkout"

↓

Parse (break it down):
[
  { brdId: "BRD-01", requirement: "User can reset password" },
  { brdId: "BRD-02", requirement: "Guest checkout" }
]

↓

Check existing (read spec.md):
Does BRD-01 exist? YES → Update it, set Last_Updated = today
Does BRD-02 exist? NO → Create new with TC-103 (auto-generated)

↓

Write output:
Update spec.md with new/modified rows
Update spec-mapping.json mirror
```

**Key functions:**

| Function                  | Input            | Output                        | Purpose                              |
| ------------------------- | ---------------- | ----------------------------- | ------------------------------------ |
| `parseRawInput(text)`     | Raw text         | Array of {brdId, requirement} | Splits text into BRD pairs           |
| `parseSpecTable(content)` | Markdown content | Array of rows                 | Reads existing spec.md               |
| `getNextTestCaseId(rows)` | Current rows     | "TC-104"                      | Finds highest TC number + 1          |
| `buildMarkdown(rows)`     | Row objects      | Markdown string               | Converts back to spec.md format      |
| `buildMapping(rows)`      | Row objects      | JSON object                   | Converts to spec-mapping.json format |
| `syncRequirements(text)`  | Raw text         | Updated mapping               | Main orchestrator                    |

**Example usage:**

```bash
# Add single requirement
npm run sync:requirements -- "BRD-04: Users can add items to cart"

# Add multiple (pipe separated)
npm run sync:requirements -- "BRD-04: Requirement 1 | BRD-05: Requirement 2"

# Update existing
npm run sync:requirements -- "BRD-01: Updated requirement text"
```

**What happens internally:**

```javascript
// 1. Load existing spec.md
const existingRows = [
  { brdId: "BRD-01", testCaseId: "TC-101", ... },
  { brdId: "BRD-02", testCaseId: "TC-102", ... }
];

// 2. Parse new input
const incoming = [
  { brdId: "BRD-01", requirement: "Updated text" }
];

// 3. Check if exists
const existing = existingRows.find(r => r.brdId === "BRD-01");
if (existing) {
  // UPDATE: Same BRD_ID found, so modify the row
  existing.requirement = "Updated text";
  existing.lastUpdated = "2026-04-29";
} else {
  // NEW: Never seen this BRD_ID, add new row
  existingRows.push({
    brdId: "BRD-03",
    requirement: "New requirement",
    testCaseId: "TC-103",  // Auto-generated!
    lastUpdated: "2026-04-29"
  });
}

// 4. Write back to disk
writeFile(spec.md);        // Update Markdown
writeFile(spec-mapping.json); // Update JSON
```

---

### 5. **`lib/specParser.js`** - Data Reader & Linker

**Location:** `d:\ai-test-engine\lib\specParser.js`

**What it does:**

- Reads `spec-mapping.json`
- Finds requirements by BRD_ID or Test_Case_ID
- **Links generated tests** back to requirements
- Provides data to the test generator

**Key functions:**

| Function                           | Input           | Output             | Purpose                          |
| ---------------------------------- | --------------- | ------------------ | -------------------------------- |
| `loadSpecMapping()`                | None            | JSON object        | Reads entire spec-mapping.json   |
| `getRequirementByBRD(brdId)`       | "BRD-01"        | Requirement object | Looks up requirement by BRD      |
| `getRequirementByTestCaseId(tcId)` | "TC-101"        | Requirement object | Reverse lookup by test ID        |
| `getGenerationContext(brdId)`      | "BRD-01"        | Context object     | Prepares data for test generator |
| `linkGeneratedTest({...})`         | BRD + file path | Updates JSON       | Records that test was generated  |
| `saveSpecMapping(mapping)`         | Modified JSON   | Writes to disk     | Saves changes back               |

**Example usage in code:**

```javascript
const { getGenerationContext, linkGeneratedTest } = require("./lib/specParser");

// Get ready to generate a test
const ctx = getGenerationContext("BRD-01");
console.log(ctx.brdId); // → "BRD-01"
console.log(ctx.testCaseId); // → "TC-101"
console.log(ctx.requirement); // → "User must be able to reset password..."
console.log(ctx.title); // → "TC-101 - User must be able..."

// After test is generated, link it back
linkGeneratedTest({
  brdId: "BRD-01",
  file: "tests/generated/TC-101.spec.ts",
  title: "TC-101 - User must be able to reset password via email.",
});

// Now spec-mapping.json shows:
// "BRD-01".generated_test = {
//   file: "tests/generated/TC-101.spec.ts",
//   title: "TC-101 - ...",
//   linked_at: "2026-04-29T..."
// }
```

**Flow diagram:**

```
getGenerationContext('BRD-01')
        ↓
loadSpecMapping()
        ↓
Find 'BRD-01' in JSON
        ↓
Return {
  brdId: 'BRD-01',
  testCaseId: 'TC-101',
  requirement: '...',
  title: 'TC-101 - ...'
}
```

---

### 6. **`scripts/convertSpec.js`** - AI Test Generator

**Location:** `d:\ai-test-engine\scripts\convertSpec.js`

**What it does:**

1. Reads a Markdown spec file
2. Extracts metadata (BRD_ID, URL)
3. Gets the **existing Test_Case_ID** from `spec-mapping.json` (does NOT create new)
4. Sends requirement + accessibility tree to **Gemini AI**
5. AI generates Playwright test code
6. Saves test as `TC-XXX.spec.ts`
7. Links it back in `spec-mapping.json`

**How it works (detailed flow):**

```
Input: node scripts/convertSpec.js login.md --brd=BRD-01

↓

1. PARSE ARGUMENTS
   specFile = "login.md"
   brdId = "BRD-01"

↓

2. LOAD SPEC FILE
   Read: specs/login.md
   Content is Markdown with steps/expectations

↓

3. EXTRACT METADATA
   Look for @brd: BRD-01 or BRD_ID: BRD-01
   Look for @url: https://example.com

↓

4. GET TRACEABILITY INFO
   Call getGenerationContext('BRD-01')
   Load from spec-mapping.json:
   {
     brdId: "BRD-01",
     testCaseId: "TC-101",     ← REUSE THIS
     requirement: "User must...",
     title: "TC-101 - User must..."
   }

↓

5. CAPTURE PAGE STRUCTURE
   If URL provided:
   - Launch Chromium browser
   - Navigate to URL
   - Capture accessibility tree (page structure)
   This helps AI understand what selectors to use

↓

6. BUILD AI PROMPT
   Create prompt with:
   - The requirement text
   - The test case ID (TC-101)
   - The page accessibility tree
   - Instructions to use Playwright syntax

↓

7. SEND TO GEMINI AI
   Call genAI.getGenerativeModel('gemini-3-flash-preview')
   Pass prompt
   Wait for response

↓

8. GEMINI GENERATES TEST
   AI returns TypeScript/JavaScript code like:
```

const { test, expect } = require('@playwright/test');
test('TC-101 - User must...', async ({ page }) => {
test.info().annotations.push(
{ type: 'BRD_ID', description: 'BRD-01' },
{ type: 'Test_Case_ID', description: 'TC-101' }
);
await page.goto(...);
// More steps...
});

````

↓

9. CLEAN CODE
Remove markdown code fences (```)
Trim whitespace

↓

10. SAVE TO FILE
 Create: tests/generated/TC-101.spec.ts
 Write generated code

↓

11. LINK IT BACK
 Call linkGeneratedTest({...})
 Update spec-mapping.json:
 "BRD-01".generated_test = {
   file: "tests/generated/TC-101.spec.ts",
   title: "TC-101 - User must...",
   linked_at: "2026-04-29T10:30:00Z"
 }

↓

Output:
✅ Test file created
✅ Linked in spec-mapping.json
✅ Ready to run
````

**Key functions:**

| Function                       | Purpose                                   |
| ------------------------------ | ----------------------------------------- |
| `parseArgs(argv)`              | Parses command-line arguments             |
| `extractMetadata(markdown)`    | Pulls `@brd` and `@url` from spec file    |
| `getAccessibilityTree(url)`    | Launches browser, captures page structure |
| `convertMarkdownToTest({...})` | Sends data to Gemini AI, gets test code   |
| `stripCodeFences(code)`        | Removes markdown backticks from AI output |
| `listModels()`                 | Shows available Gemini models             |
| `main()`                       | Orchestrates entire flow                  |

**Example Markdown spec file with metadata:**

```markdown
# Login Specification

@brd: BRD-01
@url: https://practicesoftwaretesting.com

## Feature: User Authentication

### Test Case: Successful Login

**Precondition:** User has valid credentials

**Steps:**

1. Navigate to login page
2. Enter valid email in email field
3. Enter valid password in password field
4. Click "Sign In" button

**Expected Result:**

- User should be logged in
- Dashboard page should load
- Welcome message should display user name
- Navigation menu should show logout option

### Validation Points

- Page title should contain "Dashboard"
- URL should be /dashboard
- User menu should display user name
```

**Usage examples:**

```bash
# Generate test using --brd argument
node scripts/convertSpec.js login.md --brd=BRD-01

# Generate test using @brd in markdown (if present)
node scripts/convertSpec.js login.md

# List available AI models
node scripts/convertSpec.js login.md --list-models
```

**Important:** **Does NOT create new Test_Case_IDs**

The key principle is:

```javascript
// ❌ WRONG (creates duplicate/confusion):
const newTCID = "TC-" + (maxTC + 1);

// ✅ RIGHT (maintains link):
const context = getGenerationContext(brdId);
const testCaseId = context.testCaseId; // Reuse existing TC-101
```

This ensures traceability is never broken.

---

### 7. **`tests/generated/`** - Generated Playwright Tests

**Location:** `d:\ai-test-engine\tests\generated\`

**What it contains:**

- Auto-generated Playwright test files
- Named as `TC-101.spec.ts`, `TC-102.spec.ts`, etc.
- Each test is **linked to a BRD requirement**

**Example generated test:**

```javascript
// tests/generated/TC-101.spec.ts
const { test, expect } = require("@playwright/test");

test("TC-101 - User must be able to reset password via email.", async ({
  page,
}) => {
  // Annotations link this test back to the requirement
  test
    .info()
    .annotations.push(
      { type: "BRD_ID", description: "BRD-01" },
      { type: "Test_Case_ID", description: "TC-101" },
    );

  // AI-generated steps based on spec.md requirement
  await page.goto("https://example.com");
  await page.click('[aria-label="Forgot Password"]');
  await page.fill('[name="email"]', "test@example.com");
  await page.click('button:has-text("Reset Password")');

  // Assertion from spec.md expected result
  await expect(page).toHaveTitle(/Email sent/);
});
```

**Key characteristics:**

- Test name includes Test_Case_ID
- Annotations include BRD_ID and Test_Case_ID
- Steps derived from spec.md requirement
- Assertions match expected results
- Uses resilient selectors (aria-labels, text matching)

**File naming pattern:**

```
TC-101.spec.ts  → Tests BRD-01 (mapped in spec-mapping.json)
TC-102.spec.ts  → Tests BRD-02
TC-103.spec.ts  → Tests BRD-03
```

**For beginners:**

- Each test file tests **ONE requirement**
- The annotations tie it back to the BRD
- When this test fails, you can trace it to the exact requirement
- Never manually edit these files (they're auto-generated)

---

### 8. **`.env`** - Environment Configuration

**Location:** `d:\ai-test-engine\.env`

**What it does:**

- Stores sensitive configuration
- NOT committed to Git (keep secrets safe)
- Read by `dotenv` package

**Contents:**

```env
GEMINI_API_KEY=your-api-key-here
```

**How to get GEMINI_API_KEY:**

1. Go to https://makersuite.google.com/app/apikeys
2. Create a new API key
3. Copy it
4. Paste into `.env`

**For beginners:**

- `.env` is like a locked drawer with passwords
- Never share or commit it
- Each developer should have their own

---

## 🔄 Data Flow Diagrams

### Workflow 1: Adding a New Requirement

```
Human writes:
"BRD-04: Users can add items to shopping cart"

        ↓ (npm run sync:requirements)

sync-requirements.js
├── parseRawInput("BRD-04: Users can...")
│   └── Extract: BRD-04, requirement text
├── parseSpecTable(spec.md)
│   └── Load existing 3 requirements (BRD-01, 02, 03)
├── getNextTestCaseId(rows)
│   └── Calculate: Max TC = 103, so new TC = 104
├── buildMarkdown()
│   └── Create new spec.md with BRD-04 row
├── buildMapping()
│   └── Create new spec-mapping.json with BRD-04

        ↓

Files Updated:
✅ specs/spec.md (new row added)
✅ output/spec-mapping.json (new entry)

        ↓

Result:
BRD-04 → TC-104
(Ready for test generation)
```

### Workflow 2: Generating a Test

```
Developer runs:
npm generateTest -- convertSpec.js login.md --brd=BRD-04

        ↓

convertSpec.js
├── parseArgs()
│   └── specFile="login.md", brdId="BRD-04"
├── extractMetadata(markdown)
│   └── Find @brd: BRD-04, @url: https://...
├── getGenerationContext('BRD-04')
│   └── Load spec-mapping.json
│   └── Find BRD-04 entry:
│       testCaseId: "TC-104" ← REUSE THIS
├── getAccessibilityTree(url)
│   └── Launch browser, navigate, capture page structure
├── convertMarkdownToTest({...})
│   └── Call Gemini AI
├── Save & Link
    ├── Write: tests/generated/TC-104.spec.ts
    └── Update spec-mapping.json

        ↓

Files Created/Updated:
✅ tests/generated/TC-104.spec.ts (NEW TEST)
✅ output/spec-mapping.json (LINK ADDED)

        ↓

Result:
BRD-04 → TC-104 → TC-104.spec.ts
(Test ready to run)
```

### Workflow 3: Running Tests & Failure Traceability

```
npm test
(Runs all tests in tests/generated/)

        ↓

Playwright runs each test:
├── TC-101.spec.ts ✅ PASS
├── TC-102.spec.ts ❌ FAIL
└── TC-103.spec.ts ✅ PASS

        ↓

If TC-102 FAILS:

Developer traces back:
TC-102 failed → Find TC-102 in spec.md
→ See it tests BRD-02 → Read requirement
→ "Guest checkout should not require a phone number"
→ Understand what went wrong

Result: Traceability achieved! 🎯
```

---

## 🧠 How Each Component Works

### Understanding the Sync Process

**The Problem:**

- Developers add requirements continuously
- Requirements change and evolve
- Tests need to stay in sync
- You need a way to update everything at once

**The Solution:** `scripts/sync-requirements.js`

**Inside the function step-by-step:**

```javascript
// Step 1: Load what already exists
const existingContent = fs.readFileSync(SPEC_PATH, "utf8");
const existingRows = parseSpecTable(existingContent);

// Step 2: Parse what's new coming in
const incoming = parseRawInput(rawText);

// Step 3: Merge (smart update logic)
for (const item of incoming) {
  const existing = existingRows.find((row) => row.brdId === item.brdId);

  if (existing) {
    // UPDATE: Same BRD_ID found
    existing.requirement = item.requirement;
    existing.lastUpdated = getToday();
  } else {
    // NEW: Never seen this BRD_ID before
    existingRows.push({
      brdId: item.brdId,
      requirement: item.requirement,
      testCaseId: getNextTestCaseId(existingRows), // Auto-generate
      lastUpdated: getToday(),
    });
  }
}

// Step 4: Write to disk
fs.writeFileSync(SPEC_PATH, buildMarkdown(existingRows));
fs.writeFileSync(MAPPING_PATH, JSON.stringify(buildMapping(existingRows)));
```

**Key insight:** Test_Case_IDs are **assigned once, never changed**

```
First sync:   BRD-01 → TC-101  (assigned)
Later sync:   BRD-01 → TC-101  (SAME, not TC-102)
```

---

## 📊 Step-by-Step Workflows

### Workflow A: First-Time Setup

**Estimated time:** 5-10 minutes

```bash
# Step 1: Install dependencies
npm install

# Step 2: Create .env with API key
echo GEMINI_API_KEY=sk-... > .env

# Step 3: Create first requirements
npm run sync:requirements -- "BRD-01: User can login | BRD-02: User can logout"

# Step 4: Verify
cat specs/spec.md
cat output/spec-mapping.json

# Result: System is ready! ✅
```

### Workflow B: Add New Requirement Mid-Project

**Estimated time:** 2-3 minutes

```bash
# Step 1: Add requirement
npm run sync:requirements -- "BRD-03: User can reset password"

# Step 2: Generate test
node scripts/convertSpec.js login.md --brd=BRD-03

# Step 3: Run tests
npm test

# Result: Test is ready! ✅
```

### Workflow C: Update Existing Requirement

**Estimated time:** 3-5 minutes

```bash
# Step 1: Update requirement
npm run sync:requirements -- "BRD-01: User can login via email or username"

# Step 2: Regenerate test
node scripts/convertSpec.js login.md --brd=BRD-01

# Step 3: Run tests
npm test

# Result: Test updated, link maintained! ✅
```

### Workflow D: Run Tests & Debug Failure

**Estimated time:** 5-10 minutes

```bash
# Step 1: Run tests
npm test

# Step 2: See which TC failed (e.g., TC-102)

# Step 3: Trace to BRD
grep "TC-102" specs/spec.md
# | BRD-02 | Guest checkout... | TC-102 | ...

# Step 4: Fix issue and regenerate
npm run sync:requirements -- "BRD-02: Updated description"
node scripts/convertSpec.js login.md --brd=BRD-02

# Result: Test should now pass! ✅
```

---

## 🎓 Key Concepts for Beginners

### Concept 1: Traceability Matrix

**What:** A table that connects requirements to tests to code.

**Why it matters:** When a test fails, you know **exactly** which requirement is broken.

```
Real-world example:

Spec says:          Test checks:           Test code:
"User can login"  → TC-101 test runs  →   Assert page.title = "Dashboard"
                                           If fails: BRD-01 is broken!
```

### Concept 2: Single Source of Truth

**What:** `spec.md` is the **one file** everyone trusts.

**Why it matters:**

- No confusion about what's required
- Everyone reads same source
- Changes propagate everywhere

### Concept 3: Test Case ID (TC-XXX) is the Link

**What:** A unique identifier that connects everything.

**Why it matters:** You can trace problems backwards.

```
Problem discovery:
Test fails → Look at TC-102 → Find "TC-102" in spec.md
→ See it tests BRD-02 → Read requirement
→ Understand what went wrong
```

### Concept 4: "Living" Specification

**What:** A spec that **grows and evolves** with the project.

**Why it matters:**

- Never delete rows (keep history in Git)
- Always update `last_updated` timestamp
- Future teams can see what changed when

### Concept 5: Automation > Manual

**What:** The sync and generator scripts do work automatically.

**Why it matters:**

- Reduces human error
- Keeps everything in sync automatically
- Faster to add new requirements

---

## 🚀 Command Reference

### NPM Commands

```bash
# Install dependencies (run once)
npm install

# Sync requirements (add/update)
npm run sync:requirements -- "BRD-01: Requirement text"
npm run sync:requirements -- "BRD-01: Text | BRD-02: Text"
npm run sync                # Alias for sync:requirements

# Run all generated tests
npm test

# Show test report/results
npm run test:report
```

### Node Script Commands

```bash
# Generate test for a BRD
node scripts/convertSpec.js <specFile.md> --brd=BRD-01

# Generate test (reads @brd from markdown)
node scripts/convertSpec.js <specFile.md>

# List available AI models
node scripts/convertSpec.js <specFile.md> --list-models

# View all requirements
node -e "console.log(JSON.stringify(require('./lib/specParser').loadSpecMapping(), null, 2))"
```

### Manual File Inspection

```bash
# View the "brain" (spec.md)
cat specs/spec.md

# View the JSON mapping
cat output/spec-mapping.json

# View generated tests
ls tests/generated/
cat tests/generated/TC-101.spec.ts
```

### Git Commands (to save changes)

```bash
# Check what changed
git status

# Add changes
git add .

# Commit with message
git commit -m "Add BRD-03 and generate TC-103"

# Push to remote
git push origin main

# View history
git log
```

---

## Healer Logic

The healer uses a confidence-score decision tree for locator failures:

1. Unique locator check: run locator count.
2. Count == 1 but hidden: retry issue (animation or hydration lag).
3. Count == 0: locator issue. Send DOM snapshot to Gemini for closest semantic match.
4. Count == 1 and visible: logic issue. Locator is valid, app behavior is wrong.

Implementation notes:

- Core logic is in `lib/healer.js` via `analyzeLocator`.
- Gemini semantic fallback is implemented in `findClosestSemanticMatch`.
- Generator prompt in `scripts/convertSpec.js` instructs tests to call healer before critical interactions.
- Generator now validates healer usage and linked Test_Case_ID before writing output.

---

## 📞 Handover Checklist

Before handing over to someone else, ensure:

**System Setup:**

- [ ] Node.js v16+ installed
- [ ] `npm install` has been run
- [ ] `.env` file exists with `GEMINI_API_KEY`
- [ ] `specs/` directory exists
- [ ] `output/` directory exists
- [ ] `tests/generated/` directory exists

**Files in Place:**

- [ ] `specs/spec.md` exists with at least 2-3 requirements
- [ ] `output/spec-mapping.json` mirrors `spec.md`
- [ ] `.gitignore` includes `.env` and `node_modules/`
- [ ] `package.json` has all scripts defined

**Knowledge Transfer:**

- [ ] They understand `spec.md` is the "brain"
- [ ] They know Test_Case_IDs are reused, not invented
- [ ] They can run `npm run sync:requirements -- "BRD-01: Text"`
- [ ] They can run `node scripts/convertSpec.js login.md --brd=BRD-01`
- [ ] They understand traceability: BRD → TC → Test File
- [ ] They know which files to edit
- [ ] They know which files NOT to edit (JSON, generated tests)

**Verification:**

- [ ] They can add a new requirement (BRD-04)
- [ ] They can generate a test for it (TC-104)
- [ ] They can run `npm test`
- [ ] They can trace a test failure back to a BRD

---

**Last Updated:** 2026-04-29
**Version:** 1.0
**Maintained by:** QA Architect Team
