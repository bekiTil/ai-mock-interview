// frontend/src/hooks/useSpeechSynthesis.ts
//
// Wrapper around window.speechSynthesis for TTS playback.
//
// Usage:
//   const { isSupported, isSpeaking, voices, voiceURI, setVoiceURI,
//           speak, cancel } = useSpeechSynthesis();
//
//   speak("Hello there.");      // queues + plays
//   cancel();                    // stops immediately
//
// We pick a default voice on mount: the first English voice that contains
// "Samantha" / "Google US English" / "Microsoft Aria" — those tend to sound
// the most natural across Mac/Chrome/Edge. Otherwise the system default.

import { useCallback, useEffect, useRef, useState } from "react";

const PREFERRED_VOICE_HINTS = [
  "Samantha",                 // Mac default, very natural
  "Google US English",        // Chrome
  "Microsoft Aria Online",    // Edge
  "Microsoft Jenny Online",   // Edge
  "Karen",                    // iOS English (AU)
];

export interface UseSpeechSynthesisResult {
  /** True if speechSynthesis exists in this browser. */
  isSupported: boolean;
  /** True while an utterance is playing. */
  isSpeaking: boolean;
  /** All available voices (may be empty until voiceschanged fires). */
  voices: SpeechSynthesisVoice[];
  /** voiceURI of the currently selected voice. */
  voiceURI: string | null;
  /** Set the voice by URI. Future speak() calls use this voice. */
  setVoiceURI: (uri: string) => void;
  /** Cancel anything playing, then speak `text` end-to-end. */
  speak: (text: string) => void;
  /** Stop immediately. Safe to call if nothing is speaking. */
  cancel: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Keep latest voice selection in a ref so `speak()` is stable.
  const voiceURIRef = useRef<string | null>(null);
  voiceURIRef.current = voiceURI;

  // Load voices. They populate asynchronously in some browsers (Chrome).
  useEffect(() => {
    if (!isSupported) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const list = synth.getVoices();
      if (!list.length) return;

      setVoices(list);

      // Pick a default if we haven't already.
      if (voiceURIRef.current) return;
      const englishVoices = list.filter((v) => v.lang.toLowerCase().startsWith("en"));
      const pool = englishVoices.length ? englishVoices : list;

      const preferred =
        pool.find((v) =>
          PREFERRED_VOICE_HINTS.some((hint) =>
            v.name.toLowerCase().includes(hint.toLowerCase()),
          ),
        ) ?? pool.find((v) => v.default) ?? pool[0];

      if (preferred) {
        setVoiceURIState(preferred.voiceURI);
      }
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, [isSupported]);

  const setVoiceURI = useCallback((uri: string) => {
    setVoiceURIState(uri);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const synth = window.speechSynthesis;
      // Always cancel anything queued so we never overlap.
      synth.cancel();

      const utt = new SpeechSynthesisUtterance(trimmed);
      const uri = voiceURIRef.current;
      if (uri) {
        const v = synth.getVoices().find((cand) => cand.voiceURI === uri);
        if (v) utt.voice = v;
      }
      utt.rate = 1.02;   // slightly above default — feels less sleepy
      utt.pitch = 1.0;
      utt.volume = 1.0;

      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);

      synth.speak(utt);
    },
    [isSupported],
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  // Cleanup: cancel on unmount.
  useEffect(() => {
    return () => {
      if (!isSupported) return;
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  return {
    isSupported,
    isSpeaking,
    voices,
    voiceURI,
    setVoiceURI,
    speak,
    cancel,
  };
}
