// frontend/src/hooks/useSpeechRecognition.ts
//
// Thin wrapper around the browser's Web Speech API for STT.
// Chrome/Edge/Safari support `webkitSpeechRecognition`. Firefox does not
// (as of 2026). Callers should check `isSupported` and gracefully degrade.
//
// Usage:
//   const { isSupported, isListening, transcript, interim, error,
//           start, stop, reset } = useSpeechRecognition({ lang: "en-US" });
//
// - `transcript` is the cumulative finalized text since the last reset.
// - `interim` is the live in-progress phrase (changes as the user speaks).
// - Calling `start()` triggers the browser permission prompt on first use.

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Minimal Web Speech API typings
// ---------------------------------------------------------------------------
// TS DOM lib doesn't ship these, so we declare just what we use.

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((this: SpeechRecognitionLike, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionLike, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseSpeechRecognitionOptions {
  /** BCP 47 language tag. Defaults to "en-US". */
  lang?: string;
  /** If true, recognition keeps going across pauses until manually stopped. */
  continuous?: boolean;
}

export interface UseSpeechRecognitionResult {
  /** True if the browser supports webkitSpeechRecognition / SpeechRecognition. */
  isSupported: boolean;
  /** True while the mic is active. */
  isListening: boolean;
  /** Cumulative finalized transcript since the last reset. */
  transcript: string;
  /** Live in-progress phrase (changes as the user speaks). */
  interim: string;
  /** Last error code from the API ("not-allowed", "no-speech", etc), or null. */
  error: string | null;
  /** Begin recognition. Triggers permission prompt on first use. */
  start: () => void;
  /** Stop recognition. The final transcript is preserved. */
  stop: () => void;
  /** Clear transcript, interim, and error. */
  reset: () => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionResult {
  const { lang = "en-US", continuous = true } = options;

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  // Lazily build the recognition instance the first time we need it.
  const ensureInstance = useCallback((): SpeechRecognitionLike | null => {
    if (recognitionRef.current) return recognitionRef.current;
    if (typeof window === "undefined") return null;

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return null;

    const r = new Ctor();
    r.lang = lang;
    r.continuous = continuous;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    r.onend = () => {
      setIsListening(false);
      setInterim("");
    };
    r.onerror = (ev) => {
      setError(ev.error || "unknown");
      setIsListening(false);
      setInterim("");
    };
    r.onresult = (ev) => {
      let nextInterim = "";
      let appended = "";
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const result = ev.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) appended += text;
        else nextInterim += text;
      }
      if (appended) {
        setTranscript((prev) => (prev ? `${prev} ${appended}`.trim() : appended.trim()));
      }
      setInterim(nextInterim.trim());
    };

    recognitionRef.current = r;
    return r;
  }, [lang, continuous]);

  const start = useCallback(() => {
    const r = ensureInstance();
    if (!r) {
      setError("not-supported");
      return;
    }
    try {
      r.start();
    } catch (e) {
      // start() throws if already running. Swallow and let onstart/onend reflect truth.
      if (e instanceof Error && !/already started/i.test(e.message)) {
        setError(e.message);
      }
    }
  }, [ensureInstance]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      // no-op
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  // Cleanup on unmount: abort any active session so we don't leak the mic.
  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (!r) return;
      try {
        r.abort();
      } catch {
        // no-op
      }
    };
  }, []);

  return { isSupported, isListening, transcript, interim, error, start, stop, reset };
}
