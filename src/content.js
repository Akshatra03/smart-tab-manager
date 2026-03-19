// Runs inside every webpage you visit.
// Collects basic page info and sends it to background.js.

const pageData = {
  title: document.title,
  url: window.location.href,
  domain: window.location.hostname,
  timestamp: Date.now()
};

chrome.runtime.sendMessage({
  type: "PAGE_LOADED",
  payload: pageData
});