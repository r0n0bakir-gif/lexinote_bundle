"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SaveState =
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function decodePayload(hash: string) {
  const raw = hash.startsWith("#payload=") ? hash.slice("#payload=".length) : "";
  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

export default function CaptureBridgePage() {
  const [state, setState] = useState<SaveState>({
    status: "loading",
    message: "Saving captured word to LexiNote...",
  });
  const [captureMeta, setCaptureMeta] = useState<{ deckName?: string; queueAiEnrichment?: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const payload = decodePayload(window.location.hash);
      setCaptureMeta(payload ? { deckName: payload.deckName, queueAiEnrichment: payload.queueAiEnrichment } : null);
      if (!payload?.germanWord) {
        setState({
          status: "error",
          message: "No capture payload was found. Return to the dictionary page and try again.",
        });
        return;
      }

      try {
        const response = await fetch("/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok || !data?.ok) {
          if (response.status === 401) {
            setState({
              status: "error",
              message: "Sign in to LexiNote first, then try capture again from the extension.",
            });
            return;
          }

          setState({
            status: "error",
            message: data?.error || "Could not save this captured word.",
          });
          return;
        }

        setState({
          status: "success",
          message: `Saved: ${data.word.german_word || data.word.germanWord}${data.deckName ? ` to ${data.deckName}` : ""}`,
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Could not reach the capture API from inside LexiNote.",
          });
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <div className="w-full rounded-[30px] border border-[rgba(97,77,63,0.16)] bg-[rgba(255,249,241,0.92)] p-8 text-[#241d19] shadow-[0_24px_60px_rgba(28,20,16,0.18)] backdrop-blur-sm">
          <div className="text-xs uppercase tracking-[0.22em] text-[#9a7b67]">LexiNote capture</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Extension handoff</h1>
          <p className="mt-3 text-base leading-7 text-[#75675d]">{state.message}</p>

          <div
            className={`mt-6 rounded-[24px] px-5 py-4 text-sm ${
              state.status === "success"
                ? "border border-[#b9d9cb] bg-[#eef9f4] text-[#3c6f5f]"
                : state.status === "error"
                  ? "border border-[#e8b5aa] bg-[#fff3ef] text-[#9b4f42]"
                  : "border border-[rgba(97,77,63,0.12)] bg-[rgba(255,255,255,0.72)] text-[#6c5d52]"
            }`}
          >
            {state.status === "loading"
              ? "Processing capture..."
              : state.status === "success"
                ? captureMeta?.queueAiEnrichment
                  ? "Your word is saved and AI enrichment has been queued."
                  : "Your word is now in LexiNote."
                : "Fix the issue above, then retry from the extension popup."}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/words"
              className="inline-flex items-center justify-center rounded-full bg-[#ea8f6a] px-5 py-3 text-sm font-medium text-[#fff9f4] shadow-[0_10px_20px_rgba(209,108,68,0.25)]"
            >
              Open notebook
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-[rgba(97,77,63,0.2)] bg-[rgba(255,250,244,0.7)] px-5 py-3 text-sm font-medium text-[#3a2d26]"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
