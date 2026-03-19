// aiEngine.js
// Calls Anthropic Claude API to classify a tab and generate a human summary.
// Falls back to rule-based context engine if API key is missing or call fails.

import { getContext } from './contextEngine.js';

/**
 * Main function — tries AI first, falls back to rules if anything fails.
 * Always returns: { context, summary, source }
 */
export async function getAIContext({ title, url, domain }) {
  // Check if API key exists
  const { anthropic_api_key } = await chrome.storage.local.get("anthropic_api_key");

  if (!anthropic_api_key) {
    return {
      context: getContext({ title, url, domain }),
      summary: null,
      source: "rules"
    };
  }

  // Try calling Claude
  try {
    const result = await callClaude({ title, url, domain, apiKey: anthropic_api_key });
    return { ...result, source: "ai" };
  } catch (error) {
    console.warn("⚠️ AI context failed, falling back to rules:", error.message);
    return {
      context: getContext({ title, url, domain }),
      summary: null,
      source: "rules"
    };
  }
}

/**
 * Calls the Claude API and parses the response.
 * Returns: { context, summary }
 */
async function callClaude({ title, url, domain, apiKey }) {
  const prompt = `You are a browser tab classifier. Given a webpage's title and URL, return a JSON object with exactly two fields:
1. "context" — a short category label (max 4 words) describing what the user is doing. Examples: "Development work", "Shopping", "Study / learning", "News / reading", "Social media", "Entertainment", "Email / communication". If none fit, create a short one.
2. "summary" — one sentence (max 12 words) describing WHY the user likely opened this tab.

Webpage title: ${title}
Webpage URL: ${url}

Respond with valid JSON only. No explanation. No markdown. Example:
{"context":"Development work","summary":"Reviewing a pull request for an authentication bug fix."}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Claude API error ${response.status}`);
  }

  const data = await response.json();
  const raw  = data.content[0]?.text?.trim();

  // Parse JSON response
  const parsed = JSON.parse(raw);

  if (!parsed.context || !parsed.summary) {
    throw new Error("AI returned incomplete data");
  }

  return {
    context: parsed.context,
    summary: parsed.summary
  };
}