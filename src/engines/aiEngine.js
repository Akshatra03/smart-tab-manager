import { getContext } from './contextEngine.js';

export async function getAIContext({ title, url, domain }) {
  const { groq_api_key } = await chrome.storage.local.get("groq_api_key");

  if (!groq_api_key) {
    return {
      context: getContext({ title, url, domain }),
      summary: null,
      source: "rules"
    };
  }

  try {
    const result = await callGroq({ title, url, domain, apiKey: groq_api_key });
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

async function callGroq({ title, url, domain, apiKey }) {
  const prompt = `You are a browser tab classifier. Given a webpage title and URL, return a JSON object with exactly two fields:
1. "context" — a short category label (max 4 words). Examples: "Development work", "Shopping", "Study / learning", "News / reading", "Social media", "Entertainment", "Email / communication".
2. "summary" — one sentence (max 12 words) describing WHY the user likely opened this tab.

Webpage title: ${title}
Webpage URL: ${url}

Respond with valid JSON only. No explanation. No markdown. Example:
{"context":"Development work","summary":"Reviewing a pull request for an authentication bug fix."}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 100,
      temperature: 0.3,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Groq API error ${response.status}`);
  }

  const data = await response.json();
  let raw = data.choices[0]?.message?.content?.trim();

  // Strip markdown fences if model wraps response
  raw = raw.replace(/```json|```/g, "").trim();

  const parsed = JSON.parse(raw);

  if (!parsed.context || !parsed.summary) {
    throw new Error("AI returned incomplete data");
  }

  return {
    context: parsed.context,
    summary: parsed.summary
  };
}