const apiKeyInput = document.getElementById("api-key");
const saveBtn     = document.getElementById("save-btn");
const status      = document.getElementById("status");

chrome.storage.local.get("groq_api_key", ({ groq_api_key }) => {
  if (groq_api_key) {
    apiKeyInput.value = groq_api_key;
    status.textContent = "✅ API key already saved.";
  }
});

saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    status.textContent = "Please enter an API key.";
    status.className = "status error";
    return;
  }

  if (!key.startsWith("gsk_")) {
    status.textContent = "That doesn't look like a valid Groq key. It should start with gsk_";
    status.className = "status error";
    return;
  }

  chrome.storage.local.set({ groq_api_key: key }, () => {
    status.textContent = "✅ API key saved successfully.";
    status.className = "status";
  });
});