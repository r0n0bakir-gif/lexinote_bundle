function setStatus(message, isError = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.style.color = isError ? "#ffb4b4" : "#d7f7c2";
}

function getSettingsFromForm() {
  return {
    appBaseUrl: document.getElementById("appBaseUrl").value.trim(),
    preferredDeck: document.getElementById("preferredDeck").value.trim(),
    queueAiEnrichment: document.getElementById("queueAiEnrichment").checked,
  };
}

function applySettingsToForm(settings) {
  document.getElementById("appBaseUrl").value = settings.appBaseUrl || "";
  document.getElementById("preferredDeck").value = settings.preferredDeck || "Quick Capture";
  document.getElementById("queueAiEnrichment").checked = Boolean(settings.queueAiEnrichment);
}

async function captureFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  return chrome.tabs.sendMessage(tab.id, { type: "LEXINOTE_CAPTURE_PAGE" });
}

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: "LEXINOTE_GET_CAPTURE_SETTINGS" });
  if (!response?.ok) {
    throw new Error(response?.error || "Could not load capture settings.");
  }

  applySettingsToForm(response.settings);
}

async function saveSettings() {
  const response = await chrome.runtime.sendMessage({
    type: "LEXINOTE_SAVE_CAPTURE_SETTINGS",
    settings: getSettingsFromForm(),
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Could not save settings.");
  }

  applySettingsToForm(response.settings);
  return response.settings;
}

document.getElementById("saveSettingsBtn").onclick = async () => {
  try {
    await saveSettings();
    setStatus("Settings saved.");
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Could not save settings.", true);
  }
};

document.getElementById("captureBtn").onclick = async () => {
  try {
    setStatus("Capturing word...");
    const settings = await saveSettings();
    const res = await captureFromActiveTab();

    if (!res?.payload?.germanWord) {
      setStatus("No German word found on this page. Select one or open a dictionary result page.", true);
      return;
    }

    const openResponse = await chrome.runtime.sendMessage({
      type: "LEXINOTE_OPEN_CAPTURE",
      payload: res.payload,
      settings,
    });

    if (!openResponse?.ok) {
      throw new Error(openResponse?.error || "Could not open LexiNote.");
    }

    setStatus(`Opened LexiNote and sent this word to ${settings.preferredDeck || "Quick Capture"}.`);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Could not send the word to LexiNote.", true);
  }
};

loadSettings().catch((error) => {
  console.error(error);
  setStatus(error instanceof Error ? error.message : "Could not load extension settings.", true);
});
