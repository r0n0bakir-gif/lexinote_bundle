// WHY: Default changed from localhost:3000 to 127.0.0.1:3001 to match the
// actual dev server address configured in package.json ("next dev --hostname
// 127.0.0.1 --port 3001"). Using the wrong default caused silent capture
// failures for all first-time users — the single highest-churn bug in the app.
const DEFAULT_CAPTURE_SETTINGS = {
  appBaseUrl: "http://127.0.0.1:3001",
  preferredDeck: "Quick Capture",
  queueAiEnrichment: true,
};

function normalizeAppBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_CAPTURE_SETTINGS.appBaseUrl;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    // WHY: Strip trailing slash so URL concatenation is always predictable
    // (e.g. appBaseUrl + "/capture-bridge" never becomes "//capture-bridge").
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return DEFAULT_CAPTURE_SETTINGS.appBaseUrl;
  }
}

async function getCaptureSettings() {
  // WHY: chrome.storage.sync persists settings across devices for the same
  // Chrome profile — ideal for a URL the user wants consistent everywhere.
  // Fallback to DEFAULT_CAPTURE_SETTINGS keys ensures missing keys get defaults.
  const stored = await chrome.storage.sync.get(DEFAULT_CAPTURE_SETTINGS);

  return {
    appBaseUrl: normalizeAppBaseUrl(stored.appBaseUrl),
    preferredDeck:
      String(stored.preferredDeck || DEFAULT_CAPTURE_SETTINGS.preferredDeck).trim() ||
      DEFAULT_CAPTURE_SETTINGS.preferredDeck,
    queueAiEnrichment: Boolean(stored.queueAiEnrichment),
  };
}

async function saveCaptureSettings(nextSettings) {
  const normalized = {
    appBaseUrl: normalizeAppBaseUrl(nextSettings?.appBaseUrl),
    preferredDeck:
      String(nextSettings?.preferredDeck || DEFAULT_CAPTURE_SETTINGS.preferredDeck).trim() ||
      DEFAULT_CAPTURE_SETTINGS.preferredDeck,
    queueAiEnrichment:
      typeof nextSettings?.queueAiEnrichment === "boolean"
        ? nextSettings.queueAiEnrichment
        : DEFAULT_CAPTURE_SETTINGS.queueAiEnrichment,
  };

  await chrome.storage.sync.set(normalized);
  return normalized;
}

async function openLexiNoteTarget(targetUrl) {
  // WHY: Tab ID is stored in local (not sync) storage because it is device-
  // specific — a tab open on one machine has no meaning on another device.
  const { lexiNoteTabId } = await chrome.storage.local.get("lexiNoteTabId");

  if (typeof lexiNoteTabId === "number") {
    try {
      const updated = await chrome.tabs.update(lexiNoteTabId, {
        url: targetUrl,
        active: true,
      });
      return updated;
    } catch {
      // WHY: Tab may have been closed since we last stored its ID. Fall through
      // to create a new tab rather than crashing the capture flow.
    }
  }

  const created = await chrome.tabs.create({ url: targetUrl, active: true });
  if (typeof created.id === "number") {
    await chrome.storage.local.set({ lexiNoteTabId: created.id });
  }
  return created;
}

chrome.runtime.onInstalled.addListener(async (details) => {
  // Initialize settings storage with defaults on every install/update.
  const settings = await getCaptureSettings();
  await chrome.storage.sync.set(settings);

  // WHY: On first install only, open the popup as a full tab so the user is
  // immediately prompted to verify the LexiNote URL. Chrome MV3 does not allow
  // chrome.action.openPopup() programmatically, so opening popup.html as a tab
  // is the standard workaround. This prevents the #1 silent failure: the user
  // never realizing the URL needs to be configured.
  if (details.reason === "install") {
    await chrome.tabs.create({
      url: chrome.runtime.getURL("popup.html") + "?setup=1",
      active: true,
    });
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const stored = await chrome.storage.local.get("lexiNoteTabId");
  if (stored.lexiNoteTabId === tabId) {
    await chrome.storage.local.remove("lexiNoteTabId");
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "LEXINOTE_GET_CAPTURE_SETTINGS") {
    (async () => {
      try {
        const settings = await getCaptureSettings();
        sendResponse({ ok: true, settings });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to load settings.",
        });
      }
    })();
    return true;
  }

  if (message?.type === "LEXINOTE_SAVE_CAPTURE_SETTINGS") {
    (async () => {
      try {
        const settings = await saveCaptureSettings(message.settings);
        sendResponse({ ok: true, settings });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to save settings.",
        });
      }
    })();
    return true;
  }

  if (message?.type === "LEXINOTE_OPEN_CAPTURE") {
    (async () => {
      try {
        const settings = message.settings
          ? await saveCaptureSettings(message.settings)
          : await getCaptureSettings();

        const payload = {
          ...message.payload,
          deckName: settings.preferredDeck,
          queueAiEnrichment: settings.queueAiEnrichment,
        };

        const targetUrl = `${settings.appBaseUrl}/capture-bridge#payload=${encodeURIComponent(
          JSON.stringify(payload)
        )}`;

        await openLexiNoteTarget(targetUrl);
        sendResponse({ ok: true, settings, targetUrl });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to open LexiNote.",
        });
      }
    })();
    return true;
  }

  return false;
});
