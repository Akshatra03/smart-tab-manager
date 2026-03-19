// All storage read/write goes through here.
// Using chrome.storage.local — simple and built into Chrome, no setup needed.

/**
 * Save a tab record.
 * If the same tabId already exists, it gets replaced (tab navigated to new page).
 */
export async function saveTab(tabRecord) {
  const { tabs = [] } = await chrome.storage.local.get("tabs");

  // Remove existing entry for this tabId if it exists
  const filtered = tabs.filter(t => t.tabId !== tabRecord.tabId);

  // Add the new record
  filtered.push(tabRecord);

  await chrome.storage.local.set({ tabs: filtered });
}

/**
 * Return all stored tab records.
 */
export async function getAllTabs() {
  const { tabs = [] } = await chrome.storage.local.get("tabs");
  return tabs;
}

/**
 * Delete a tab record by tabId.
 * Called when a tab is closed in Chrome.
 */
export async function removeTab(tabId) {
  const { tabs = [] } = await chrome.storage.local.get("tabs");
  const filtered = tabs.filter(t => t.tabId !== tabId);
  await chrome.storage.local.set({ tabs: filtered });
}
/**
 * Save a note for a specific tabId.
 */
export async function saveNote(tabId, noteText) {
  const { notes = {} } = await chrome.storage.local.get("notes");
  notes[tabId] = noteText;
  await chrome.storage.local.set({ notes });
}

/**
 * Get all saved notes.
 * Returns an object like: { 123: "research for project", 456: "buy later" }
 */
export async function getNotes() {
  const { notes = {} } = await chrome.storage.local.get("notes");
  return notes;
}