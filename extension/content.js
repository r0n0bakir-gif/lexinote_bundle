function getSource() {
  const host = window.location.hostname;
  if (host.includes("linguee")) return "linguee";
  if (host.includes("pons")) return "pons";
  if (host.includes("verbformen")) return "verbformen";
  return "manual";
}

function cleanText(value) {
  return (value || "")
    .replace(/\s+/g, " ")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[|]/g, " ")
    .trim();
}

function getRawTextLines(root = document.body) {
  return (root?.innerText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function pickFirstText(selectors, root = document) {
  for (const selector of selectors) {
    const node = root.querySelector(selector);
    const text = cleanText(node?.textContent || node?.value || "");
    if (text) return text;
  }
  return "";
}

function pickTexts(selectors, limit = 40, root = document) {
  const values = [];

  for (const selector of selectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    for (const node of nodes) {
      const text = cleanText(node?.textContent || "");
      if (text && !values.includes(text)) {
        values.push(text);
      }
      if (values.length >= limit) {
        return values;
      }
    }
  }

  return values;
}

function getTextLines(root = document.body) {
  return getRawTextLines(root).map((line) => cleanText(line)).filter(Boolean);
}

function getSelectedWord() {
  return cleanText(window.getSelection()?.toString());
}

function getSearchParam(...keys) {
  const params = new URLSearchParams(window.location.search);
  for (const key of keys) {
    const value = cleanText(params.get(key));
    if (value) return value;
  }
  return "";
}

function getElementsByText(tagName, matcher) {
  return Array.from(document.querySelectorAll(tagName)).filter((node) =>
    matcher(cleanText(node.textContent || ""))
  );
}

function containsGermanMarkers(text) {
  const value = cleanText(text).toLowerCase();
  const germanWords = [
    " der ",
    " die ",
    " das ",
    " und ",
    " oder ",
    " ein ",
    " eine ",
    " einer ",
    " eines ",
    " einem ",
    " einen ",
    " den ",
    " dem ",
    " des ",
    " mit ",
    " für ",
    " ohne ",
    " bei ",
    " wird ",
    " sind ",
    " sein ",
    " haben ",
    " etwas ",
    " durch ",
    " zur ",
    " zum ",
  ];

  return germanWords.some((marker) => (` ${value} `).includes(marker)) || /[äöüß]/i.test(value);
}

function looksLikeMetaText(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return true;

  const metaWords = [
    "adjective",
    "adjektiv",
    "verb",
    "noun",
    "substantiv",
    "positive",
    "comparative",
    "superlative",
    "regular",
    "irregular",
    "comparable",
    "incomparable",
    "participle",
    "separable",
    "inseparable",
    "haben",
    "sein",
    "only singular",
    "dative",
    "plural",
    "endings",
    "terms of use",
    "privacy policy",
    "resources",
    "work sheets",
    "materials",
    "download on the app store",
    "get it on google play",
    "our website as an app",
    "handy on the go",
    "help us",
    "example sentences for",
  ];

  return metaWords.some((word) => text.includes(word));
}

function scoreEnglishGloss(text) {
  const value = cleanText(text);
  if (!value) return -100;
  if (looksLikeMetaText(value)) return -100;
  if (containsGermanMarkers(value)) return -60;
  if (!/[a-z]/i.test(value)) return -50;
  if (value.length < 4 || value.length > 140) return -30;

  let score = 0;
  if (/,/.test(value)) score += 30;
  if (/^[a-z ,\-()/]+$/i.test(value)) score += 20;
  if (/\b(change|modify|processing|execution|completion|revision|adapt|alter|debt|boring|abrasion|amend|revise)\b/i.test(value)) score += 40;
  if (/\b(the|to|for|of|and|or)\b/i.test(value)) score += 10;
  if (value.split(",").length >= 2) score += 20;
  if (value.split(",").length >= 4) score += 40;
  if (value.length <= 70) score += 10;
  if (/[.;:]/.test(value)) score -= 20;
  if (!/,/.test(value) && !/\b(change|modify|processing|execution|completion|revision|adapt|alter|debt|boring|abrasion|amend|revise)\b/i.test(value)) score -= 25;
  if (/^[A-Z][a-z]+(?: [A-Z][a-z]+)+$/.test(value)) score -= 35;
  if (/help and faq/i.test(value)) score -= 100;
  if (/terms of use/i.test(value)) score -= 100;
  if (/example sentences for/i.test(value)) score -= 100;

  return score;
}

function isLikelyGermanExample(value, germanWord) {
  const text = cleanText(value);
  if (!text || looksLikeMetaText(text)) return false;
  if (text.length < 12 || text.length > 220) return false;
  if (!containsGermanMarkers(text) && !text.toLowerCase().includes(germanWord.toLowerCase())) return false;
  return true;
}

function findPanelByHeading(headingText) {
  const headings = getElementsByText("div", (text) => text === headingText || text.startsWith(headingText));
  for (const heading of headings) {
    let node = heading.parentElement;
    for (let i = 0; i < 4 && node; i += 1) {
      const panelText = cleanText(node.textContent || "");
      if (panelText.includes(headingText)) {
        return node;
      }
      node = node.parentElement;
    }
  }
  return null;
}

function getUkFlagLine(lines) {
  const candidates = lines
    .filter((line) => /^[\u{1F1EC}\u{1F1E7}🇬🇧]/u.test(line.trim()))
    .map((line) => cleanText(line))
    .filter((line) => line && !looksLikeMetaText(line));

  return candidates.find((line) => line.includes(",")) || candidates[0] || "";
}

function getLingueePayload() {
  const germanWord =
    getSelectedWord() ||
    getSearchParam("query", "source") ||
    pickFirstText([
      "#queryinput",
      "input[name='query']",
      ".lemma.featured .dictLink",
      ".lemma .dictLink",
      "h1",
    ]);

  const translation = pickFirstText([
    ".isForeignTerm .tag_trans",
    ".lemma .tag_trans",
    ".translation .tag_trans",
  ]);

  return { germanWord, translation };
}

function getPonsPayload() {
  const germanWord =
    getSelectedWord() ||
    getSearchParam("q", "query") ||
    pickFirstText([
      "input[type='search']",
      "input[name='q']",
      ".search-input__input",
      ".headword",
      "h1",
    ]);

  const translation = pickFirstText([
    ".translation",
    ".target",
    ".rom.first",
    ".dl-horizontal dd",
  ]);

  return { germanWord, translation };
}

function getVerbformenPayload() {
  const germanWord =
    getSelectedWord() ||
    getSearchParam("w", "word") ||
    pickFirstText([
      "input[name='w']",
      "#searchfield",
      ".rWord",
      ".vStm .vfLbl",
      "h1",
    ]);

  const mainCard = document.querySelector(".rBox");
  const mainCardRawLines = getRawTextLines(mainCard || document.body);
  const primaryBlocks = mainCard ? pickTexts(["a", "div", "p", "li", "span"], 120, mainCard) : [];
  const textBlocks = [...primaryBlocks, ...pickTexts(["a", "div", "p", "li", "span"], 250)];
  const pageLines = getTextLines(mainCard || document.body);
  const wordIndex = pageLines.findIndex((line) => line.toLowerCase().includes(germanWord.toLowerCase()));
  const nearbyLines =
    wordIndex >= 0
      ? pageLines.slice(wordIndex, Math.min(pageLines.length, wordIndex + 12))
      : [];

  const ukFlagTranslation = getUkFlagLine(mainCardRawLines) || getUkFlagLine(getRawTextLines(document.body));

  const translationCandidates = [...nearbyLines, ...textBlocks]
    .map((text) => ({ text, score: scoreEnglishGloss(text) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const translation = ukFlagTranslation || translationCandidates[0]?.text || "";

  const examplesPanel = findPanelByHeading("Examples");
  const exampleLines = examplesPanel ? pickTexts(["li", "div", "p", "a"], 40, examplesPanel) : [];
  const exampleRawLines = examplesPanel ? getRawTextLines(examplesPanel) : [];

  const exampleSentence = exampleLines.find((line) => isLikelyGermanExample(line, germanWord)) || "";

  const exampleTranslationFromFlag = getUkFlagLine(exampleRawLines);

  const exampleTranslation =
    exampleTranslationFromFlag ||
    exampleLines
      .map((line) => ({ text: line, score: scoreEnglishGloss(line) }))
      .filter((item) => item.score > 0 && item.text !== translation)
      .sort((a, b) => b.score - a.score)[0]?.text || "";

  return {
    germanWord,
    translation,
    exampleSentence,
    exampleTranslation,
  };
}

function getPayload() {
  const source = getSource();
  const basePayload =
    source === "linguee"
      ? getLingueePayload()
      : source === "pons"
        ? getPonsPayload()
        : source === "verbformen"
          ? getVerbformenPayload()
          : { germanWord: getSelectedWord(), translation: "" };

  const germanWord = cleanText(basePayload.germanWord);
  const translation = cleanText(basePayload.translation);
  const exampleSentence = cleanText(basePayload.exampleSentence);
  const exampleTranslation = cleanText(basePayload.exampleTranslation);

  return {
    germanWord,
    translation: translation || null,
    exampleSentence: exampleSentence || null,
    exampleTranslation: exampleTranslation || null,
    source,
    sourceUrl: window.location.href,
    selectedText: getSelectedWord() || germanWord,
    pageTitle: cleanText(document.title),
  };
}

const launcherId = "lexinote-capture-launcher";
const buttonId = "lexinote-capture-button";
const statusId = "lexinote-capture-status";
let statusTimeoutId = null;

function updateCaptureStatus(message, tone = "default") {
  const status = document.getElementById(statusId);
  if (!status) return;

  status.textContent = message;
  status.dataset.visible = "true";
  status.dataset.tone = tone;

  if (statusTimeoutId) {
    clearTimeout(statusTimeoutId);
  }

  statusTimeoutId = window.setTimeout(() => {
    status.dataset.visible = "false";
  }, 2600);
}

function updateFloatingButtonLabel() {
  const button = document.getElementById(buttonId);
  if (!button) return;

  const selectedWord = getSelectedWord();
  const fallbackWord = cleanText(
    getPayload().germanWord || (document.querySelector("h1")?.textContent || "")
  );
  const preview = selectedWord || fallbackWord;

  button.textContent = preview ? `Save "${preview}"` : "Save to LexiNote";
}

async function openPayloadInLexiNote(payload) {
  const response = await chrome.runtime.sendMessage({
    type: "LEXINOTE_OPEN_CAPTURE",
    payload,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Could not open LexiNote.");
  }

  return response;
}

async function handleFloatingCapture() {
  const payload = getPayload();

  if (!payload.germanWord) {
    updateCaptureStatus("No German word found yet. Select one first or open a dictionary result page.", "error");
    return;
  }

  try {
    updateCaptureStatus("Opening LexiNote...");
    await openPayloadInLexiNote(payload);
    updateCaptureStatus(`Sent "${payload.germanWord}" to LexiNote.`);
  } catch (error) {
    console.error(error);
    updateCaptureStatus(error instanceof Error ? error.message : "Could not send this word.", "error");
  }
}

function ensureCaptureLauncher() {
  if (document.getElementById(launcherId) || !document.body) return;

  const launcher = document.createElement("div");
  launcher.id = launcherId;

  const status = document.createElement("div");
  status.id = statusId;
  status.dataset.visible = "false";
  status.dataset.tone = "default";

  const button = document.createElement("button");
  button.id = buttonId;
  button.type = "button";
  button.addEventListener("click", handleFloatingCapture);

  launcher.appendChild(status);
  launcher.appendChild(button);
  document.body.appendChild(launcher);

  updateFloatingButtonLabel();
}

function initCaptureLauncher() {
  ensureCaptureLauncher();
  updateFloatingButtonLabel();

  document.addEventListener("selectionchange", updateFloatingButtonLabel);
  window.addEventListener("focus", updateFloatingButtonLabel);
}

chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.type === "LEXINOTE_CAPTURE_PAGE") {
    const payload = getPayload();
    sendResponse({
      ok: Boolean(payload.germanWord),
      payload,
    });
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCaptureLauncher, { once: true });
} else {
  initCaptureLauncher();
}
