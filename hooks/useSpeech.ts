import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechSpeed = 0.75 | 1 | 1.25;

export const SPEECH_SPEEDS: { label: string; value: SpeechSpeed }[] = [
  { label: "0.75×", value: 0.75 },
  { label: "1×",    value: 1    },
  { label: "1.25×", value: 1.25 },
];

// WHY: Prefer de-DE (Germany) but accept any German-language voice
// (de-AT = Austrian, de-CH = Swiss) so the app works on systems where
// the exact de-DE pack isn't installed.
const GERMAN_LANG_PREFIX = "de";

function getBestGermanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  // Priority 1: exact de-DE match
  const exact = voices.find((v) => v.lang === "de-DE");
  if (exact) return exact;
  // Priority 2: any German variant
  const any = voices.find((v) => v.lang.startsWith(GERMAN_LANG_PREFIX));
  return any ?? null;
}

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  // WHY: speed preference persists across sessions via localStorage so a user
  // who always studies at 0.75× doesn't need to reset it every visit.
  const [speed, setSpeed] = useState<SpeechSpeed>(() => {
    if (typeof window === "undefined") return 1;
    const stored = parseFloat(localStorage.getItem("lexinote_speech_speed") ?? "1");
    return ([0.75, 1, 1.25].includes(stored) ? stored : 1) as SpeechSpeed;
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    function loadVoices() {
      const available = window.speechSynthesis.getVoices();
      if (available.length) setVoices(available);
    }

    loadVoices();
    // WHY: voiceschanged fires asynchronously in most browsers (especially
    // Chromium) — voices are not available synchronously on first render.
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const germanVoice = getBestGermanVoice(voices);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      // WHY: Cancel any in-progress utterance before starting a new one.
      // Without this, queueing multiple speak() calls (e.g. rapid card changes)
      // piles up utterances and they play back-to-back confusingly.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-DE";
      if (germanVoice) utterance.voice = germanVoice;
      utterance.rate = speed;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported, germanVoice, speed]
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  function changeSpeed(next: SpeechSpeed) {
    setSpeed(next);
    localStorage.setItem("lexinote_speech_speed", String(next));
  }

  return { supported, speak, cancel, speed, changeSpeed, germanVoice };
}
