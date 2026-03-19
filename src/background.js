// background.js
// Now uses AI engine instead of rule-based context engine.
// Falls back to rules automatically if API key is missing or AI call fails.

import { saveTab, getAllTabs, removeTab, saveNote, getNotes } from './utils/storage.js';
import { getAIContext } from './engines/aiEngine.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // A webpage just loaded
  if (message.type === "PAGE_LOADED") {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    const { title, url, domain, timestamp } = message.payload;

    (async () => {
      // Get context + summary from AI (or rules if AI unavailable)
      const { context, summary, source } = await getAIContext({ title, url, domain });

      const tabRecord = {
        tabId,
        title,
        url,
        domain,
        timestamp,
        context,
        summary,   // new — AI-generated one-line reason
        source     // new — "ai" or "rules"
      };

      await saveTab(tabRecord);
      console.log(`✅ Tab saved [${source}]:`, tabRecord);
    })();
  }

  // Popup asking for all tabs
  if (message.type === "GET_ALL_TABS") {
    (async () => {
      const tabs = await getAllTabs();
      sendResponse({ tabs });
    })();
    return true;
  }

  // Popup saving a note
  if (message.type === "SAVE_NOTE") {
    (async () => {
      await saveNote(message.tabId, message.noteText);
      sendResponse({ success: true });
    })();
    return true;
  }

  // Popup asking for all notes
  if (message.type === "GET_NOTES") {
    (async () => {
      const notes = await getNotes();
      sendResponse({ notes });
    })();
    return true;
  }

});

// Tab closed in Chrome — remove from storage
chrome.tabs.onRemoved.addListener((tabId) => {
  removeTab(tabId);
});

// When Chrome starts, remove stored tabs that are no longer open
chrome.runtime.onStartup.addListener(async () => {
  const openTabs   = await chrome.tabs.query({});
  const openTabIds = new Set(openTabs.map(t => t.id));
  const stored     = await getAllTabs();
  const valid      = stored.filter(t => openTabIds.has(t.tabId));
  await chrome.storage.local.set({ tabs: valid });
  console.log(`🧹 Cleaned up stale tabs. ${stored.length - valid.length} removed.`);
});

// Also clean up when the extension first loads
(async () => {
  const openTabs   = await chrome.tabs.query({});
  const openTabIds = new Set(openTabs.map(t => t.id));
  const stored     = await getAllTabs();
  const valid      = stored.filter(t => openTabIds.has(t.tabId));
  await chrome.storage.local.set({ tabs: valid });
})();