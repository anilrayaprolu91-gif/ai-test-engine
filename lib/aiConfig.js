const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', 'required.env') });

const AI_SETTINGS = {
  activeProvider: process.env.AI_PROVIDER || 'gemini',
  activeProfile: process.env.AI_PROFILE || 'quality',

  // Shared defaults for every task unless overridden below.
  defaults: {
    temperature: 0.2,
    maxOutputTokens: 2048,
  },

  // Task-specific defaults.
  tasks: {
    plan: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
    convert: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
    healer: {
      temperature: 0,
      maxOutputTokens: 256,
    },
  },

  // Provider-specific API keys and models.
  providers: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      profiles: {
        quality: {
          plan: 'gemini-2.0-flash',
          convert: 'gemini-2.0-flash',
          healer: 'gemini-2.5-flash',
        },
        fast: {
          plan: 'gemini-2.0-flash-lite',
          convert: 'gemini-2.0-flash-lite',
          healer: 'gemini-2.0-flash-lite',
        },
      },
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      baseUrl: 'https://api.groq.com/openai/v1',
      profiles: {
        quality: {
          plan: 'llama-3.3-70b-versatile',
          convert: 'llama-3.1-8b-instant',
          healer: 'llama-3.1-8b-instant',
        },
        fast: {
          plan: 'llama-3.1-8b-instant',
          convert: 'llama-3.1-8b-instant',
          healer: 'llama-3.1-8b-instant',
        },
      },
    },
  },
};

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickTaskModel({ provider, profile, task }) {
  const providerConfig = AI_SETTINGS.providers[provider];
  const profileConfig = providerConfig && providerConfig.profiles[profile];
  if (!profileConfig) {
    return null;
  }

  return profileConfig[task] || profileConfig.convert || null;
}

function getAIConfig(task) {
  const resolvedTask = task || 'convert';
  const provider = String(AI_SETTINGS.activeProvider || 'gemini').toLowerCase();
  const profile = String(AI_SETTINGS.activeProfile || 'quality').toLowerCase();

  const providerConfig = AI_SETTINGS.providers[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}. Supported: ${Object.keys(AI_SETTINGS.providers).join(', ')}`);
  }

  const taskDefaults = AI_SETTINGS.tasks[resolvedTask] || AI_SETTINGS.defaults;
  const envTaskPrefix = `AI_${resolvedTask.toUpperCase()}`;

  const model =
    process.env[`${envTaskPrefix}_MODEL`] ||
    process.env.AI_MODEL ||
    pickTaskModel({ provider, profile, task: resolvedTask });

  const temperature = parseNumber(
    process.env[`${envTaskPrefix}_TEMPERATURE`] || process.env.AI_TEMPERATURE,
    taskDefaults.temperature,
  );

  const maxOutputTokens = parseNumber(
    process.env[`${envTaskPrefix}_MAX_TOKENS`] || process.env.AI_MAX_TOKENS,
    taskDefaults.maxOutputTokens,
  );

  return {
    task: resolvedTask,
    provider,
    profile,
    apiKey: providerConfig.apiKey,
    baseUrl: providerConfig.baseUrl,
    model,
    temperature,
    maxOutputTokens,
  };
}

function getMissingKeyHint(provider) {
  return provider === 'groq'
    ? 'GROQ_API_KEY is not set. Add it to required.env or switch AI_PROVIDER=gemini.'
    : 'GEMINI_API_KEY is not set. Add it to required.env or switch AI_PROVIDER=groq.';
}

module.exports = {
  AI_SETTINGS,
  getAIConfig,
  getMissingKeyHint,
};
