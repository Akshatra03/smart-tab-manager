const app = document.getElementById("app");

// ── URL normalizer ──
const STRIP_PARAMS = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref','fbclid','gclid'];

function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    STRIP_PARAMS.forEach(p => url.searchParams.delete(p));
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    url.hash = '';
    return url.toString().toLowerCase();
  } catch {
    return rawUrl.toLowerCase();
  }
}

// ── Duplicate detector ──
function getDuplicateTabIds(tabs) {
  const urlMap = new Map();

  for (const tab of tabs) {
    const key = normalizeUrl(tab.url);
    if (!urlMap.has(key)) urlMap.set(key, []);
    urlMap.get(key).push(tab.tabId);
  }

  const duplicateIds = new Set();
  for (const tabIds of urlMap.values()) {
    if (tabIds.length > 1) {
      // Mark all except the first one as duplicates
      tabIds.slice(1).forEach(id => duplicateIds.add(id));
    }
  }

  return duplicateIds;
}

// ── Activity helpers ──
function classifyTabActivity(tab) {
  const ageMs    = Date.now() - tab.timestamp;
  const INACTIVE = 24 * 60 * 60 * 1000;
  const STALE    = 72 * 60 * 60 * 1000;
  if (ageMs > STALE)    return "stale";
  if (ageMs > INACTIVE) return "inactive";
  return "active";
}

function getTabAge(tab) {
  const ageMs   = Date.now() - tab.timestamp;
  const minutes = Math.floor(ageMs / (1000 * 60));
  const hours   = Math.floor(ageMs / (1000 * 60 * 60));
  const days    = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  return `${days}d ago`;
}

function getBadgeHtml(activity, isDuplicate) {
  let badges = "";
  if (isDuplicate)             badges += `<span class="badge badge-duplicate">Duplicate</span>`;
  if (activity === "stale")    badges += `<span class="badge badge-stale">Stale</span>`;
  if (activity === "inactive") badges += `<span class="badge badge-inactive">Inactive</span>`;
  return badges;
}

// ── Suggestion engine ──
function scoreTab(tab, notes, isDuplicate) {
  let score = 0;
  const ageMs    = Date.now() - tab.timestamp;
  const INACTIVE = 24 * 60 * 60 * 1000;
  const STALE    = 72 * 60 * 60 * 1000;

  if (ageMs > STALE)         score += 50;
  else if (ageMs > INACTIVE) score += 25;

  if (tab.context === "Uncategorized")                          score += 20;
  if (["Social media", "Entertainment"].includes(tab.context)) score += 15;
  if (isDuplicate)                                              score += 40;
  if (notes[tab.tabId])                                        score -= 30;

  return Math.max(0, score);
}

function getSuggestions(tabs, notes, duplicateIds) {
  return tabs
    .map(tab => ({
      ...tab,
      score: scoreTab(tab, notes, duplicateIds.has(tab.tabId))
    }))
    .filter(tab => tab.score >= 30)
    .sort((a, b) => b.score - a.score);
}

function getSuggestionReason(tab, notes, isDuplicate) {
  const ageMs    = Date.now() - tab.timestamp;
  const INACTIVE = 24 * 60 * 60 * 1000;
  const STALE    = 72 * 60 * 60 * 1000;

  if (isDuplicate)      return "Same URL already open in another tab";
  if (ageMs > STALE)    return `Not visited in ${getTabAge(tab)} · stale`;
  if (ageMs > INACTIVE) return `Not visited in ${getTabAge(tab)} · inactive`;
  if (tab.context === "Uncategorized") return "No clear purpose detected";
  if (["Social media", "Entertainment"].includes(tab.context)) return "Easy to reopen when needed";
  return "Low priority tab";
}

// ── Fetch tabs and notes in parallel ──
Promise.all([
  new Promise(resolve =>
    chrome.runtime.sendMessage({ type: "GET_ALL_TABS" }, r => resolve(r?.tabs ?? []))
  ),
  new Promise(resolve =>
    chrome.runtime.sendMessage({ type: "GET_NOTES" }, r => resolve(r?.notes ?? {}))
  )
]).then(([tabs, notes]) => {
  if (tabs.length === 0) {
    app.innerHTML = `<div class="empty">No tabs tracked yet.<br>Browse a few pages first.</div>`;
    return;
  }

  const duplicateIds = getDuplicateTabIds(tabs);
  const suggestions  = getSuggestions(tabs, notes, duplicateIds);
  const inactiveCount = tabs.filter(t => classifyTabActivity(t) !== "active").length;
  document.getElementById("stat-total").textContent    = tabs.length;
  document.getElementById("stat-inactive").textContent = inactiveCount;
  document.getElementById("stat-toclose").textContent  = suggestions.length;

  let html = "";

  // ── Suggestions section ──
  html += `<div class="suggestions-section">`;
  html += `<div class="suggestions-header">💡 Suggested to close (${suggestions.length})</div>`;

  if (suggestions.length === 0) {
    html += `<div class="no-suggestions">All tabs look useful — nothing to close.</div>`;
  } else {
    for (const tab of suggestions) {
      const isDuplicate = duplicateIds.has(tab.tabId);
      const reason      = getSuggestionReason(tab, notes, isDuplicate);
      html += `
        <div class="suggestion-item" id="suggestion-${tab.tabId}">
          <div class="suggestion-info">
            <div class="suggestion-title">${escapeHtml(tab.title || "Untitled")}</div>
            <div class="suggestion-reason">${escapeHtml(reason)}</div>
          </div>
          <button class="close-btn" data-tabid="${tab.tabId}">Close</button>
        </div>
      `;
    }
  }
  html += `</div>`;

  // ── All tabs grouped by context ──
  const groups = {};
  for (const tab of tabs) {
    const key = tab.context || "Uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(tab);
  }

  for (const [context, tabList] of Object.entries(groups)) {
    html += `<div class="tab-group">`;
    html += `<div class="group-label">${context} (${tabList.length})</div>`;

    for (const tab of tabList) {
      const existingNote = notes[tab.tabId] || "";
      const noteLabel    = existingNote ? "✏️ Edit note" : "＋ Add note";
      const activity     = classifyTabActivity(tab);
      const isDuplicate  = duplicateIds.has(tab.tabId);
      const age          = getTabAge(tab);
      const badgeHtml    = getBadgeHtml(activity, isDuplicate);

      html += `
        <div class="tab-item" data-tabid="${tab.tabId}">
          <div class="tab-title">${escapeHtml(tab.title || "Untitled")}</div>
        <div class="tab-meta">
            <span class="tab-domain">${escapeHtml(tab.domain)}</span>
            <span class="tab-age">${age}</span>
            ${tab.source === "ai" ? `<span class="badge badge-ai">AI</span>` : ""}
            ${badgeHtml}
          </div>

          ${tab.summary
            ? `<div class="tab-summary">${escapeHtml(tab.summary)}</div>`
            : ""
          }

        
          ${existingNote
            ? `<div class="note-visible" id="note-visible-${tab.tabId}">📝 ${escapeHtml(existingNote)}</div>`
            : `<div class="note-visible" id="note-visible-${tab.tabId}"></div>`
          }

          <button class="note-btn" data-tabid="${tab.tabId}">${noteLabel}</button>

          <div class="note-area" id="note-area-${tab.tabId}">
            <textarea
              class="note-input"
              id="note-input-${tab.tabId}"
              placeholder="Why did you open this tab?"
            >${escapeHtml(existingNote)}</textarea>
            <button class="note-save-btn" data-tabid="${tab.tabId}">Save</button>
          </div>
        </div>
      `;
    }

    html += `</div>`;
  }

  app.innerHTML = html;

  // ── Close button → actually close the tab ──
  app.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tabId = parseInt(btn.dataset.tabid);

      chrome.tabs.remove(tabId, () => {
        const suggestionEl = document.getElementById(`suggestion-${tabId}`);
        if (suggestionEl) suggestionEl.remove();

        const tabEl = app.querySelector(`.tab-item[data-tabid="${tabId}"]`);
        if (tabEl) tabEl.remove();

        const remaining = app.querySelectorAll(".suggestion-item").length;
        const header    = app.querySelector(".suggestions-header");
        if (header) header.textContent = `💡 Suggested to close (${remaining})`;

        if (remaining === 0) {
          const section = app.querySelector(".suggestions-section");
          if (section) section.innerHTML =
            `<div class="suggestions-header">💡 Suggested to close (0)</div>
             <div class="no-suggestions">All tabs look useful — nothing to close.</div>`;
        }
      });
    });
  });

  // ── Click tab item → switch to that tab ──
  app.querySelectorAll(".tab-item").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("note-btn"))      return;
      if (e.target.classList.contains("note-save-btn")) return;
      if (e.target.classList.contains("note-input"))    return;
      const tabId = parseInt(el.dataset.tabid);
      chrome.tabs.update(tabId, { active: true });
    });
  });

  // ── Toggle note area ──
  app.querySelectorAll(".note-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tabId    = btn.dataset.tabid;
      const noteArea = document.getElementById(`note-area-${tabId}`);
      noteArea.classList.toggle("open");
    });
  });

  // ── Save note ──
  app.querySelectorAll(".note-save-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tabId    = parseInt(btn.dataset.tabid);
      const input    = document.getElementById(`note-input-${tabId}`);
      const noteText = input.value.trim();

      chrome.runtime.sendMessage({ type: "SAVE_NOTE", tabId, noteText }, () => {
        const noteBtn = app.querySelector(`.note-btn[data-tabid="${tabId}"]`);
        noteBtn.textContent = noteText ? "✏️ Edit note" : "＋ Add note";

        const noteVisible = document.getElementById(`note-visible-${tabId}`);
        noteVisible.textContent = noteText ? `📝 ${noteText}` : "";

        const noteArea = document.getElementById(`note-area-${tabId}`);
        noteArea.classList.remove("open");
      });
    });
  });
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

document.getElementById("search").addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  document.querySelectorAll(".tab-item").forEach(el => {
    const text = el.textContent.toLowerCase();
    el.classList.toggle("hidden", query.length > 0 && !text.includes(query));
  });
});


