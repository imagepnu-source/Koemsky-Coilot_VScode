// hooks/useTTSVoices.ts
// TTS 음성 목록 관리 훅

import { useState, useEffect, useRef, useMemo } from "react";

export function useTTSVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [englishVoiceName, setEnglishVoiceName] = useState("default");
  const [koreanVoiceName, setKoreanVoiceName] = useState("default");
  const voiceInitializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const list = synth.getVoices();
      if (list && list.length) {
        setVoices(list);

        if (!voiceInitializedRef.current) {
          // 기본 영어 음성 선택 (Zira 우선)
          let chosenEn = list.find(
            (v) => /zira/i.test(v.name) && v.lang?.toLowerCase().startsWith("en")
          );
          if (!chosenEn) chosenEn = list.find((v) => /zira/i.test(v.name));
          if (!chosenEn) chosenEn = list.find((v) => v.lang?.toLowerCase().startsWith("en-us"));
          if (chosenEn) setEnglishVoiceName(chosenEn.name);

          // 기본 한글 음성 선택
          const chosenKo = list.find((v) => v.lang?.toLowerCase().startsWith("ko"));
          if (chosenKo) setKoreanVoiceName(chosenKo.name);

          voiceInitializedRef.current = true;
        }
      }
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const englishVoices = useMemo(
    () => voices.filter((v) => v.lang?.toLowerCase().startsWith("en")),
    [voices]
  );

  const koreanVoices = useMemo(
    () => voices.filter((v) => v.lang?.toLowerCase().startsWith("ko")),
    [voices]
  );

  return {
    voices,
    englishVoices,
    koreanVoices,
    englishVoiceName,
    setEnglishVoiceName,
    koreanVoiceName,
    setKoreanVoiceName,
    voiceInitializedRef,
  };
}
