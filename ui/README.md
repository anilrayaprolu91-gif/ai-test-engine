# AI Test Engine Dashboard UI

This UI is a Vite + React + TypeScript dashboard for viewing BRD sync health, generated test status, and pipeline context.

## Prerequisites

- Node.js v18+
- Root project dependencies installed (`npm install` at repository root)
- UI dependencies installed (`npm install` in this folder)

## Local Development

```bash
# from repository root
cd ui
npm install
npm run dev
```

Default dev server: `http://localhost:5173`

## Build and Quality

```bash
# build production assets
npm run build

# lint
npm run lint

# preview built assets
npm run preview
```

## Dashboard Data Inputs

The UI reads sync health from `public/sync-status.json`.

Expected JSON shape:

```json
{
  "buildId": "build-2026-05-10.1",
  "updatedAt": "2026-05-10T00:00:00.000Z",
  "results": [
    {
      "brdId": "BRD-01",
      "requirement": "User must be able to reset password via email.",
      "testCaseId": "TC-101",
      "status": "passing"
    }
  ]
}
```

Generate or refresh this file from the repository root:

```bash
npm run sync:status
```

For CI with failure context:

```bash
npm run sync:status:ci
```

## Notes

- The UI is consumed by the root pre-push validation (`npm run check:prepush`).
- Keep `public/sync-status.json` updated in pipelines so dashboard data stays current.

**Last Updated:** 2026-05-10
