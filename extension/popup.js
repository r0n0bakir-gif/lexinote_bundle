// ─── Connection health check ──────────────────────────────────────────────────

// WHY: We ping the configured app URL with mode:'no-cors' so the request
// succeeds (resolves without throwing) whenever the server is actually running,
// regardless of CORS policy. It only throws a TypeError on a genuine network
// failure (app not running, wrong port, DNS error). This gives us a reliable
// "is the app up?" signal without needing a dedicated /api/health endpoint.
async function checkConnection(appBaseUrl) {
  try {
    await fetch(appBaseUrl, {
      method: "HEAD",
      mode: "no-cors",
      signal: AbortSignal.timeout(3000), // WHY: 3 s is long enough for localhost but short enough not to feel broken.
    });
    return { reachable: true };
  } catch {
    return { reachable: false };
  }
}

function showConnectionError(appBaseUrl) {
  const banner = document.getElementById("connection-error");
  banner.textContent =
    `⚠️ Cannot connect to LexiNote at ${appBaseUrl}. ` +
    `Check that your app is running, or update the URL in the settings below.`;
  banner.classList.add("visible");
}

function hideConnectionError() {
  const banner = document.getElementById("connection-error");
  banner.classList.remove("visible");
  banner.textContent = "";
}

// ─── Setup banner (shown when opened as a tab on first install) ───────────────

function maybeShowSetupBanner() {
  // WHY: background.js appends ?setup=1 when opening popup.html as a full tab
  // on first install. In normal popup mode this param is absent, so the banner
  // stays hidden and does not distract returning users.
  const params = new URLSearchParams(window.location.search);
  if (params.get("setup") === "1") {
    document.getElementById("setup-banner").classList.add("visible");
  }
}

// ─── Status line ─────────────────────────────────────────────────────────────

function setStatus(message, isError = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.style.color = isError ? "#ffb4b4" : "#d7f7c2";
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function getSettingsFromForm() {
  return {
    appBaseUrl: document.getElementById("appBaseUrl").value.trim(),
    preferredDeck: document.getElementById("preferredDeck").value.trim(),
    queueAiEnrichment: document.getElementById("queueAiEnrichment").checked,
  };
}

function applySettingsToForm(settings) {
  document.getElementById("appBaseUrl").value = settings.appBaseUrl || "";
  document.getElementById("preferredDeck").value =
    settings.preferredDeck || "Quick Capture";
  document.getElementById("queueAiEnrichment").checked = Boolean(
    settings.queueAiEnrichment
  );
}

// ─── Extension messaging ──────────────────────────────────────────────────────

async function captureFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  return chrome.tabs.sendMessage(tab.id, { type: "LEXINOTE_CAPTURE_PAGE" });
}

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({
    type: "LEXINOTE_GET_CAPTURE_SETTINGS",
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Could not load capture settings.");
  }

  applySettingsToForm(response.settings);
  return response.settings;
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

// ─── Button handlers ──────────────────────────────────────────────────────────

document.getElementById("saveSettingsBtn").onclick = async () => {
  try {
    const settings = await saveSettings();
    setStatus("Settings saved. Checking connection…");

    // WHY: Re-run connection check immediately after saving so the user gets
    // instant feedback on whether the URL they entered is actually reachable.
    const { reachable } = await checkConnection(settings.appBaseUrl);
    if (reachable) {
      hideConnectionError();
      setStatus("Settings saved. LexiNote is reachable. ✓");
    } else {
      showConnectionError(settings.appBaseUrl);
      setStatus("Settings saved, but app is not reachable.", true);
    }
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error ? error.message : "Could not save settings.",
      true
    );
  }
};

document.getElementById("captureBtn").onclick = async () => {
  try {
    setStatus("Capturing word…");
    const settings = await saveSettings();
    const res = await captureFromActiveTab();

    if (!res?.payload?.germanWord) {
      setStatus(
        "No German word found on this page. Select one or open a dictionary result page.",
        true
      );
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

    setStatus(
      `Sent "${res.payload.germanWord}" to ${settings.preferredDeck || "Quick Capture"}.`
    );
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error
        ? error.message
        : "Could not send the word to LexiNote.",
      true
    );
  }
};

// ─── Initialise ───────────────────────────────────────────────────────────────

maybeShowSetupBanner();

// WHY: Load settings first, then run connection check against the stored URL.
// Running both sequentially (not in parallel) guarantees the form is populated
// before the health check result is displayed — avoids a flash of empty fields.
loadSettings()
  .then(async (settings) => {
    const { reachable } = await checkConnection(settings.appBaseUrl);
    if (!reachable) {
      showConnectionError(settings.appBaseUrl);
    }
  })
  .catch((error) => {
    console.error(error);
    setStatus(
      error instanceof Error
        ? error.message
        : "Could not load extension settings.",
      true
    );
  });
