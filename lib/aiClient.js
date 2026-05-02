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
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxOutputTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(`Groq API error (${response.status}): ${body && body.error && body.error.message ? body.error.message : 'Unknown error'}`);
    }

    const text = normalizeGroqText(body);
    if (!text) {
      throw new Error('Groq returned an empty response body.');
    }

    return text;
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
