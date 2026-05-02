const { getAIConfig, getMissingKeyHint } = require('./aiConfig');
const { generateText } = require('./aiClient');

const aiConfig = getAIConfig('healer');

function truncateDomSnapshot(domSnapshot, maxLength = 12000) {
  const snapshot = String(domSnapshot || '');
  if (snapshot.length <= maxLength) {
    return snapshot;
  }

  return `${snapshot.slice(0, maxLength)}\n<!-- truncated -->`;
}

async function findClosestSemanticMatch({
  selector,
  domSnapshot,
}) {
  if (!aiConfig.apiKey) {
    return {
      reason: getMissingKeyHint(aiConfig.provider),
      suggestion: null,
    };
  }

  const prompt = `
You are a test locator healer.
Goal: find the closest semantic replacement selector when the original selector cannot be found.

Original selector:
${selector}

DOM snapshot:
${truncateDomSnapshot(domSnapshot)}

Return JSON only with this shape:
{
  "suggestion": "string or null",
  "reason": "short reason"
}

Rules:
- Prefer stable semantic selectors (role, label, text, test id).
- Do not return brittle nth-child/css chains unless no better option exists.
- If no good replacement exists, suggestion must be null.
`.trim();

  try {
    const raw = (await generateText({ task: 'healer', prompt })).trim();
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());

    return {
      reason: parsed.reason || 'Closest semantic match suggested by AI healer',
      suggestion: parsed.suggestion || null,
    };
  } catch (error) {
    return {
      reason: `AI healing failed: ${error.message}`,
      suggestion: null,
    };
  }
}

async function analyzeLocator({
  page,
  selector,
  visibilityTimeoutMs = 1200,
}) {
  if (!page || !selector) {
    throw new Error('analyzeLocator requires page and selector');
  }

  const locator = page.locator(selector);
  const count = await locator.count();

  if (count === 1) {
    const isVisible = await locator
      .first()
      .isVisible({ timeout: visibilityTimeoutMs })
      .catch(() => false);

    if (!isVisible) {
      return {
        issueType: 'retry',
        confidence: 0.85,
        count,
        visible: false,
        summary: 'Count == 1 but hidden. This is likely animation/hydration lag.',
        action: 'retry',
      };
    }

    return {
      issueType: 'logic',
      confidence: 0.9,
      count,
      visible: true,
      summary: 'Count == 1 and visible. Locator is fine; app logic is likely wrong.',
      action: 'fail-as-logic-issue',
    };
  }

  if (count === 0) {
    const domSnapshot = await page.content();
    const semanticMatch = await findClosestSemanticMatch({ selector, domSnapshot });

    return {
      issueType: 'locator',
      confidence: 0.8,
      count,
      visible: false,
      summary: 'Count == 0. Locator issue. Try closest semantic AI match.',
      action: 'replace-locator',
      semanticMatch,
    };
  }

  return {
    issueType: 'locator',
    confidence: 0.7,
    count,
    visible: null,
    summary: 'Count > 1. Locator is ambiguous and should be refined.',
    action: 'refine-locator',
  };
}

module.exports = {
  analyzeLocator,
  findClosestSemanticMatch,
};
