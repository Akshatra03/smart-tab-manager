// suggestionEngine.js
// Scores tabs and returns a sorted list of close suggestions.

const INACTIVE_MS = 24 * 60 * 60 * 1000;  // 24 hours
const STALE_MS    = 72 * 60 * 60 * 1000;  // 3 days

/**
 * Scores a single tab from 0–100.
 * Higher score = stronger suggestion to close.
 */
function scoreTab(tab, notes) {
  let score = 0;
  const ageMs = Date.now() - tab.timestamp;

  // Age scoring
  if (ageMs > STALE_MS)    score += 50;
  else if (ageMs > INACTIVE_MS) score += 25;

  // Uncategorized tabs are likely low value
  if (tab.context === "Uncategorized") score += 20;

  // Social media and entertainment tabs are easy to reopen
  if (["Social media", "Entertainment"].includes(tab.context)) score += 15;

  // If user added a note — they care about this tab, reduce score
  if (notes[tab.tabId]) score -= 30;

  // Never go below 0
  return Math.max(0, score);
}

/**
 * Returns tabs suggested for closing, sorted by score descending.
 * Only returns tabs with score >= 30.
 */
export function getSuggestions(tabs, notes) {
  return tabs
    .map(tab => ({ ...tab, score: scoreTab(tab, notes) }))
    .filter(tab => tab.score >= 30)
    .sort((a, b) => b.score - a.score);
}