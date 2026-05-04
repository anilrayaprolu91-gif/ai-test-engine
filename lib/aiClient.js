const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getAIConfig, getMissingKeyHint } = require('./aiConfig');

function normalizeGroqText(responseBody) {
  return (
    responseBody &&
    responseBody.choices &&
    responseBody.choices[0] &&
    responseBody.choices[0].message &&
    responseBody.choices[0].message.content
  ) || '';
}

function parseIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseRetryDelayMs(message) {
  const match = String(message || '').match(/try again in\s*(\d+(?:\.\d+)?)\s*(ms|msec|milliseconds|s|sec|secs|seconds)?/i);
  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const unit = String(match[2] || 'ms').toLowerCase();
  const isSeconds = unit === 's' || unit === 'sec' || unit === 'secs' || unit === 'seconds';
  const ms = isSeconds ? value * 1000 : value;
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms) : null;
}

function getRetryDelayMs({ message, attempt }) {
  const maxRetryDelayMs = parseIntegerEnv(process.env.AI_MAX_RETRY_DELAY_MS, 60000);
  const hintedMs = parseRetryDelayMs(message);
  if (hintedMs !== null) {
    return Math.min(Math.max(hintedMs, 50), maxRetryDelayMs);
  }

  const exponentialBackoffMs = 300 * (2 ** attempt);
  return Math.min(exponentialBackoffMs, maxRetryDelayMs);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateText({ task, prompt }) {
  const config = getAIConfig(task);

  if (!config.apiKey) {
    throw new Error(getMissingKeyHint(config.provider));
  }

  if (!config.model) {
    throw new Error(`No model configured for task "${config.task}". Set AI_${config.task.toUpperCase()}_MODEL or AI_MODEL.`);
  }

  if (config.provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        maxOutputTokens: config.maxOutputTokens,
        temperature: config.temperature,
      },
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  if (config.provider === 'groq') {
    const maxRetries = parseIntegerEnv(process.env.AI_MAX_RETRIES, 2);
    const taskFallbackModel = process.env[`AI_${config.task.toUpperCase()}_FALLBACK_MODEL`];
    const globalFallbackModel = process.env.AI_FALLBACK_MODEL;
    const fallbackModel = taskFallbackModel || globalFallbackModel || null;

    let activeModel = config.model;
    let fallbackApplied = false;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: activeModel,
          temperature: config.temperature,
          max_tokens: config.maxOutputTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      let body = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }

      if (response.ok) {
        const text = normalizeGroqText(body);
        if (!text) {
          throw new Error('Groq returned an empty response body.');
        }
        return text;
      }

      const errorMessage = body && body.error && body.error.message ? body.error.message : 'Unknown error';
      const canRetry = response.status === 429 || response.status >= 500;
      const hasAttemptsRemaining = attempt < maxRetries;

      if (canRetry && hasAttemptsRemaining) {
        if (!fallbackApplied && fallbackModel && fallbackModel !== activeModel) {
          activeModel = fallbackModel;
          fallbackApplied = true;
        }

        await delay(getRetryDelayMs({ message: errorMessage, attempt }));
        continue;
      }

      throw new Error(
        `Groq API error (${response.status}) [model=${activeModel}, attempt=${attempt + 1}/${maxRetries + 1}]: ${errorMessage}`,
      );
    }
  }

  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

async function listModels(task) {
  const config = getAIConfig(task);
  if (!config.apiKey) {
    throw new Error(getMissingKeyHint(config.provider));
  }

  if (config.provider === 'gemini') {
    const response = await fetch(`${config.baseUrl}/models?key=${config.apiKey}`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(`Gemini model listing failed (${response.status}): ${body && body.error && body.error.message ? body.error.message : 'Unknown error'}`);
    }

    return (body.models || [])
      .filter(model => (model.supportedGenerationMethods || []).includes('generateContent'))
      .map(model => model.name.replace('models/', ''));
  }

  if (config.provider === 'groq') {
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(`Groq model listing failed (${response.status}): ${body && body.error && body.error.message ? body.error.message : 'Unknown error'}`);
    }

    return (body.data || []).map(model => model.id).filter(Boolean);
  }

  return [];
}

module.exports = {
  generateText,
  listModels,
};
