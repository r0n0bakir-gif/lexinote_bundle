const DEFAULT_CAPTURE_SETTINGS = {
  appBaseUrl: "http://localhost:3000",
  preferredDeck: "Quick Capture",
  queueAiEnrichment: true,
};

function normalizeAppBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_CAPTURE_SETTINGS.appBaseUrl;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return DEFAULT_CAPTURE_SETTINGS.appBaseUrl;
  }
}

async function getCaptureSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_CAPTURE_SETTINGS);

  return {
    appBaseUrl: normalizeAppBaseUrl(stored.appBaseUrl),
    preferredDeck: String(stored.preferredDeck || DEFAULT_CAPTURE_SETTINGS.preferredDeck).trim() || DEFAULT_CAPTURE_SETTINGS.preferredDeck,
    queueAiEnrichment: Boolean(stored.queueAiEnrichment),
  };
}

async function saveCaptureSettings(nextSettings) {
  const normalized = {
    appBaseUrl: normalizeAppBaseUrl(nextSettings?.appBaseUrl),
    preferredDeck: String(nextSettings?.preferredDeck || DEFAULT_CAPTURE_SETTINGS.preferredDeck).trim() || DEFAULT_CAPTURE_SETTINGS.preferredDeck,
    queueAiEnrichment:
      typeof nextSettings?.queueAiEnrichment === "boolean"
        ? nextSettings.queueAiEnrichment
        : DEFAULT_CAPTURE_SETTINGS.queueAiEnrichment,
  };

  await chrome.storage.local.set(normalized);
  return normalized;
}

async function openLexiNoteTarget(targetUrl) {
  const { lexiNoteTabId } = await chrome.storage.local.get("lexiNoteTabId");

  if (typeof lexiNoteTabId === "number") {
    try {
      const updated = await chrome.tabs.update(lexiNoteTabId, { url: targetUrl, active: true });
      return updated;
    } catch {}
  }

  const created = await chrome.tabs.create({ url: targetUrl, active: true });
  if (typeof created.id === "number") {
    await chrome.storage.local.set({ lexiNoteTabId: created.id });
  }
  return created;
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getCaptureSettings();
  await chrome.storage.local.set(settings);
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
        sendResponse({ ok: false, error: error instanceof Error ? error.message : "Failed to load settings." });
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
        sendResponse({ ok: false, error: error instanceof Error ? error.message : "Failed to save settings." });
      }
    })();
    return true;
  }

  if (message?.type === "LEXINOTE_OPEN_CAPTURE") {
    (async () => {
      try {
        const settings = message.settings ? await saveCaptureSettings(message.settings) : await getCaptureSettings();
        const payload = {
          ...message.payload,
          deckName: settings.preferredDeck,
          queueAiEnrichment: settings.queueAiEnrichment,
        };
        const targetUrl = `${settings.appBaseUrl}/capture-bridge#payload=${encodeURIComponent(JSON.stringify(payload))}`;
        await openLexiNoteTarget(targetUrl);
        sendResponse({ ok: true, settings, targetUrl });
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : "Failed to open LexiNote." });
      }
    })();
    return true;
  }

  return false;
});
