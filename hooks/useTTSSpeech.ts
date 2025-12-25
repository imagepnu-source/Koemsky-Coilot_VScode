// hooks/useTTSSpeech.ts
// TTS 재생 로직 관리 훅

import { useState, useRef } from "react";

type SpeakOptions = {
  onDone?: () => void;
  repeatOverride?: number;
};

export function useTTSSpeech(
  volume: number,
  englishRate: number,
  koreanRate: number,
  englishVoiceName: string,
  koreanVoiceName: string,
  repeatCount: number
) {
  const [speaking, setSpeaking] = useState(false);
  const playModeRef = useRef<"idle" | "scene" | "all">("idle");
  const loopSceneRef = useRef(false);

  const speakMessage = (
    msg: string,
    mode: "en" | "ko" = "en",
    options?: SpeakOptions
  ) => {
    const trimmed = msg.trim();
    if (!trimmed || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    playModeRef.current = "idle";
    loopSceneRef.current = false;

    try {
      const synth = window.speechSynthesis;

      const doSpeak = (remaining: number) => {
        const utter = new SpeechSynthesisUtterance(trimmed);
        utter.volume = volume >= 0 && volume <= 1 ? volume : 1;
        utter.rate = mode === "en" 
          ? (englishRate > 0 ? englishRate : 1)
          : (koreanRate > 0 ? koreanRate : 1);

        try {
          const allVoices = synth.getVoices?.() || [];
          let targetVoice: SpeechSynthesisVoice | undefined;

          if (mode === "en") {
            if (englishVoiceName && englishVoiceName !== "default") {
              targetVoice = allVoices.find((v) => v.name === englishVoiceName);
            }
            if (!targetVoice) {
              targetVoice = allVoices.find((v) => v.lang?.toLowerCase().startsWith("en"));
            }
          } else {
            if (koreanVoiceName && koreanVoiceName !== "default") {
              targetVoice = allVoices.find((v) => v.name === koreanVoiceName);
            }
            if (!targetVoice) {
              targetVoice = allVoices.find((v) => v.lang?.toLowerCase().startsWith("ko"));
            }
          }

          if (targetVoice) {
            utter.voice = targetVoice;
            if (targetVoice.lang) utter.lang = targetVoice.lang;
          } else {
            utter.lang = mode === "en" ? "en-US" : "ko-KR";
          }
        } catch {
          // ignore
        }

        setSpeaking(true);
        utter.onend = () => {
          if (remaining > 1) {
            doSpeak(remaining - 1);
          } else {
            setSpeaking(false);
            options?.onDone?.();
          }
        };
        utter.onerror = () => {
          setSpeaking(false);
          options?.onDone?.();
        };

        synth.speak(utter);
      };

      const baseCount = repeatCount > 0 ? repeatCount : 1;
      const finalCount = options?.repeatOverride ?? baseCount;
      doSpeak(finalCount);
    } catch (e) {
      console.warn("[TTS] Failed to play message:", e);
      setSpeaking(false);
    }
  };

  const handleStop = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    playModeRef.current = "idle";
    loopSceneRef.current = false;
    setSpeaking(false);
  };

  return {
    speaking,
    speakMessage,
    handleStop,
    playModeRef,
    loopSceneRef,
  };
}
