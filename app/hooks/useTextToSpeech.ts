"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTextToSpeechResult {
  isSpeaking: boolean;
  charIndex: number | null; // (for karaoke).
  speak: (text: string) => void;
  stop: () => void;
}

/**
 * Tiny wrapper around `window.speechSynthesis` for on-demand TTS playback
 * (e.g. the speaker button on an assistant message).
 */
export function useTextToSpeech(): UseTextToSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [charIndex, setCharIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
    setCharIndex(null);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    const u = new SpeechSynthesisUtterance(trimmed);
    u.rate = 1;
    u.pitch = 1;
    utteranceRef.current = u;
    setIsSpeaking(true);
    setCharIndex(0);
    u.onboundary = (e) => {
      if (typeof e.charIndex === "number") setCharIndex(e.charIndex);
    };
    u.onend = () => {
      if (utteranceRef.current !== u) return;
      utteranceRef.current = null;
      setIsSpeaking(false);
      setCharIndex(null);
    };
    u.onerror = () => {
      if (utteranceRef.current !== u) return;
      utteranceRef.current = null;
      setIsSpeaking(false);
      setCharIndex(null);
    };
    try {
      window.speechSynthesis.speak(u);
    } catch {
      utteranceRef.current = null;
      setIsSpeaking(false);
      setCharIndex(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (utteranceRef.current && typeof window !== "undefined") {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return { isSpeaking, charIndex, speak, stop };
}
