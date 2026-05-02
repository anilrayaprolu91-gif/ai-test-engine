# AI Test Engine - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites

- Node.js v16 or higher
- Git
- Gemini API key (free tier available)

### 1. Setup

```bash
# Clone/open the repo
cd d:\ai-test-engine

# Install dependencies
npm install

# Create required.env with API key
echo GEMINI_API_KEY=your-key-here > required.env

# Optional: switch provider/profile from the same required.env file
# AI_PROVIDER=gemini   # or groq
# AI_PROFILE=quality   # or fast
# GROQ_API_KEY=your-groq-key-here
```

### 2. Add Requirements

```bash
# Add your first requirements
npm run sync:requirements -- "BRD-01: User can login | BRD-02: User can logout"
```

### 3. View Results

```bash
# See the living specification
cat specs/spec.md

# See the JSON mapping
cat output/spec-mapping.json
```

### 4. Generate Tests

```bash
# Create a test spec file (e.g., login.md)
# Then generate test:
node scripts/convertSpec.js login.md --brd=BRD-01

# Or generate all local specs in one shot
npm run generate:local
```

### AI Configuration (Single File Toggle)

All AI generation settings are now centralized and can be toggled from `required.env`.

```bash
# Provider switch
AI_PROVIDER=gemini   # or groq
AI_PROFILE=quality   # or fast

# Keys
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key

# Optional per-task overrides
# AI_PLAN_MODEL=...
# AI_CONVERT_MODEL=...
# AI_HEALER_MODEL=...
```

Notes:

- `plan:create` uses task `plan`
- `convertSpec` uses task `convert`
- `healer` uses task `healer`
- Default centralized mapping is in `lib/aiConfig.js`

## Planner-to-Generator Flow (Playwright CLI)

Use the planner document as the canonical input for generation:

```bash
# 1) Create planner document from BRD
npm run plan:create -- --brd=BRD-01 --url=https://example.com --goal="Verify password reset"

# 2) Generate Playwright tests from planner output documents
npm run generate:from-plans
```

Notes:

- Planner documents are written to `test-plans/`.
- The generator reads metadata tags from planner docs (`@brd`, `@url`) and converts them into tests.
- You can also target one planner document:

```bash
node scripts/generate-local-tests.js --spec=<plan-file>.md --source=test-plans
```

### Local-Only Testing (No GitHub API)

If you want UI testing without creating files in GitHub:

```bash
# in required.env
VITE_SPEC_DELIVERY_MODE=local
```

In local mode, the dashboard downloads a `.md` spec file instead of calling GitHub.
Move the downloaded file to `specs/`, then run:

```bash
node scripts/convertSpec.js <downloaded-file>.md --brd=BRD-01
```

### 5. Run Tests

```bash
# Run all generated tests
npm test

# View detailed report
npm run test:report
```

---

## 📖 Full Documentation

See **`ARCHITECTURE.md`** for complete architecture and concepts.

---

## 🔗 Key Files

| File                           | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `specs/spec.md`                | Living Specification (the "brain") |
| `output/spec-mapping.json`     | JSON mirror of spec.md             |
| `scripts/sync-requirements.js` | Adds/updates requirements          |
| `scripts/convertSpec.js`       | AI test generator                  |
| `lib/healer.js`                | Confidence-score self-healer logic |
| `lib/specParser.js`            | Data reader/linker                 |
| `package.json`                 | Project configuration              |

---

## 💡 Key Concepts

- **BRD** = Business Requirement (e.g., BRD-01)
- **TC** = Test Case (e.g., TC-101)
- **spec.md** = Single source of truth
- **Traceability** = Link requirements → tests → results

---

## ❓ Common Questions

**Q: Where do I edit requirements?**
A: Add them via `npm run sync:requirements -- "BRD-XX: Text"`

**Q: How do tests get created?**
A: Gemini AI generates them from your spec files.

**Q: What if a test fails?**
A: Use `npm test` to see which TC failed, then trace back to the BRD in `spec.md`.

**Q: Can I manually edit generated tests?**
A: You can, but they'll be overwritten if you regenerate.

**Q: Where are the API keys stored?**
A: In `required.env` (NEVER commit this to Git).

---

## 📞 Need Help?

- See `ARCHITECTURE.md` for detailed documentation
- Check the examples in `tests/generated/`
- Read comments in each script file

---

## 🎯 Typical Workflow

```
1. Add requirement
   npm run sync:requirements -- "BRD-01: Description"

2. Write test spec (e.g., login.md with @brd: BRD-01, @url: ...)

3. Generate test
   node scripts/convertSpec.js login.md --brd=BRD-01

4. Run tests
   npm test

5. If fails, trace BRD → fix → regenerate
   npm run sync:requirements -- "BRD-01: Updated"
   node scripts/convertSpec.js login.md --brd=BRD-01
   npm test
```

---

## Healer Logic

The self-healer follows a confidence-score decision tree for locators:

1. Unique locator check: run locator count.
2. Count == 1 but hidden: retry issue (animation/hydration lag).
3. Count == 0: locator issue; use Gemini closest semantic match.
4. Count == 1 and visible: logic issue; fail with clear app-behavior message.

The generator now instructs produced tests to use this flow through `lib/healer.js`.

Batch Heal and Re-verify (CI/CD):

1. Create failure analysis JSON from your analyze step.
2. Run batch healer to apply Category B locator fixes.
3. Re-run only impacted tests via Playwright grep.
4. Auto-commit healed changes with `[AI-HEALED]` when green.
5. Escalate unresolved failures to `QA_Manual_Review`.

Commands:

```bash
# Local run (uses output/analyze-failures.json by default)
npm run heal:batch -- --dry-run

# CI run with explicit input and auto-commit
node scripts/batch-heal.js output/analyze-failures.json --commit
```

---

**Last Updated:** 2026-04-29
**Version:** 1.0
