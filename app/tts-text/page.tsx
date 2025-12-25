"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type BookSection = {
  id: number;
  title: string;
  sentences: string[];
};

const STORAGE_KEY_TEXT = "ttsText_text";
const STORAGE_KEY_SECTION_ID = "ttsText_selectedSectionId";
const STORAGE_KEY_SENTENCE_INDEX = "ttsText_currentSentenceIndex";
const STORAGE_KEY_VOLUME = "ttsText_volume";
const STORAGE_KEY_ENGLISH_RATE = "ttsText_englishRate";
const STORAGE_KEY_FILE_NAME = "ttsText_fileName";

type ParsedBook = {
  title: string | null;
  sections: BookSection[];
};

function parseBookText(raw: string): ParsedBook {
  const sections: BookSection[] = [];
  let bookTitle: string | null = null;

  if (!raw.trim()) return { title: null, sections };

  const text = raw.replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  const headerRegex = /^\s*(LESSON\s+(\d+)\.)\s*(.*)$/i;

  let currentSentences: string[] = [];
  let currentLessonNumber: number | null = null;
  let currentLessonHeaderText: string | null = null;
  let currentLessonTitleSuffix: string | null = null;
  let expectTitleOnNextLine = false;
  let lastLessonNumber = 0;

  const pushCurrentSectionIfNeeded = () => {
    if (currentSentences.length === 0) {
      return;
    }
    const id = sections.length + 1;
    let baseTitle: string;
    if (currentLessonHeaderText) {
      baseTitle = currentLessonHeaderText;
    } else {
      const lessonNo = currentLessonNumber ?? id;
      baseTitle = `Lesson ${lessonNo}.`;
    }
    const fullTitle = currentLessonTitleSuffix
      ? `${baseTitle} ${currentLessonTitleSuffix}`
      : baseTitle;
    sections.push({ id, title: fullTitle, sentences: currentSentences });
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. 빈 줄 삭제 (Empty/Blank lines removal)
    if (!trimmed) {
      continue;
    }

    // 2. Title: 처리 (Lesson 에 포함시키지 않음)
    const titleMatch = /^Title:\s*(.*)$/i.exec(trimmed);
    if (titleMatch) {
      const body = titleMatch[1].trim();
      bookTitle = body ? `Title: ${body}` : "Title:";
      continue;
    }

    const headerMatch = headerRegex.exec(line);
    if (headerMatch) {
      const lessonNum = Number(headerMatch[2]);
      if (!Number.isFinite(lessonNum) || lessonNum <= lastLessonNumber) {
        // 이미 지나간 번호는 일반 문장으로 유입되도록 함
        // (else 절에 걸리지 않으므로 아래로 떨어짐)
      } else {
        // 이전 Lesson 저장
        pushCurrentSectionIfNeeded();
        currentSentences = [];
        currentLessonHeaderText = headerMatch[1].trim();
        currentLessonNumber = lessonNum;
        lastLessonNumber = lessonNum;
        const inlineSuffix = headerMatch[3]?.trim();
        if (inlineSuffix && inlineSuffix.length > 0) {
          currentLessonTitleSuffix = inlineSuffix;
          expectTitleOnNextLine = false;
        } else {
          currentLessonTitleSuffix = null;
          expectTitleOnNextLine = true;
        }
        continue;
      }
    }

    if (expectTitleOnNextLine && trimmed) {
      currentLessonTitleSuffix = trimmed;
      expectTitleOnNextLine = false;
      continue;
    }

    if (/^-{3,}\s*$/.test(trimmed)) {
      continue;
    }

    currentSentences.push(line);
  }

  pushCurrentSectionIfNeeded();

  return { title: bookTitle, sections };
}

export default function TTSTextPage() {
  const [text, setText] = useState("");
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [sections, setSections] = useState<BookSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [englishVoiceName, setEnglishVoiceName] = useState("default");
  const [englishRate, setEnglishRate] = useState(1);
  const [volume, setVolume] = useState(1);

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [repeatMode, setRepeatMode] = useState(false);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [hoverPopup, setHoverPopup] = useState<
    | {
      word: string;
      phonetic?: string;
      englishDefs?: string[];
      koreanDefs?: string[];
      x: number;
      y: number;
    }
    | null
  >(null);
  const playStateRef = useRef<{ stop: boolean }>({ stop: false });
  const repeatModeRef = useRef(false);
  const blankTimeoutRef = useRef<number | null>(null);
  const currentSentenceIndexRef = useRef(0);
  const playSessionIdRef = useRef(0);
  const autoPlayFromStartRef = useRef(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverWordRef = useRef<string | null>(null);
  const hoverPosRef = useRef<{ x: number; y: number } | null>(null);
  const wordLoopRef = useRef<{ active: boolean; word: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const voiceInitializedRef = useRef(false);

  const currentSection = useMemo(() => {
    if (!sections.length) return null;
    if (selectedSectionId == null) return sections[0];
    return sections.find((s) => s.id === selectedSectionId) ?? sections[0];
  }, [sections, selectedSectionId]);

  // 현재 하이라이트된 문장이 항상 보이도록 자동 스크롤
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    if (!currentSection || !currentSection.sentences.length) return;
    if (currentSentenceIndex < 0) return;

    const container = scrollContainerRef.current;
    const lineEl = container.querySelector<HTMLSpanElement>(
      `[data-tts-line="${currentSentenceIndex}"]`,
    );
    if (!lineEl) return;

    try {
      lineEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch {
      // 일부 브라우저에서 behavior 옵션이 지원되지 않는 경우를 대비
      lineEl.scrollIntoView({ block: "nearest" });
    }
  }, [currentSentenceIndex, currentSection?.id]);

  // currentSentenceIndex 상태와 ref 를 항상 같이 유지하는 helper
  const setCurrentSentenceIndexSafe = (next: number) => {
    currentSentenceIndexRef.current = next;
    setCurrentSentenceIndex(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY_SENTENCE_INDEX, String(next));
      } catch {
        // ignore
      }
    }
  };

  // repeatMode 최신 값 유지 (재생 콜백에서 사용)
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // 최초 로드시 localStorage 에서 복원
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      console.log("[TTSText] init: reading settings from localStorage");
      const savedText = window.localStorage.getItem(STORAGE_KEY_TEXT) ?? "";
      const savedSectionIdRaw = window.localStorage.getItem(
        STORAGE_KEY_SECTION_ID,
      );
      const savedSentenceIndexRaw = window.localStorage.getItem(
        STORAGE_KEY_SENTENCE_INDEX,
      );
      const savedVolumeRaw = window.localStorage.getItem(STORAGE_KEY_VOLUME);
      const savedEnglishRateRaw = window.localStorage.getItem(
        STORAGE_KEY_ENGLISH_RATE,
      );
      const savedFileNameRaw = window.localStorage.getItem(STORAGE_KEY_FILE_NAME);

      console.log("[TTSText] init raw:", {
        savedTextLength: savedText.length,
        savedSectionIdRaw,
        savedSentenceIndexRaw,
        savedVolumeRaw,
        savedEnglishRateRaw,
        savedFileNameRaw,
      });

      if (savedText.trim()) {
        setText(savedText);
        const parsed = parseBookText(savedText);
        setBookTitle(parsed.title);
        setSections(parsed.sections);
        if (parsed.sections.length > 0) {
          let targetSectionId: number | null = null;
          const numericSectionId = savedSectionIdRaw
            ? Number(savedSectionIdRaw)
            : NaN;
          if (!Number.isNaN(numericSectionId)) {
            const exists = parsed.sections.some((s) => s.id === numericSectionId);
            targetSectionId = exists ? numericSectionId : parsed.sections[0].id;
          } else {
            targetSectionId = parsed.sections[0].id;
          }
          setSelectedSectionId(targetSectionId);

          const numericSentenceIndex = savedSentenceIndexRaw
            ? Number(savedSentenceIndexRaw)
            : NaN;
          if (!Number.isNaN(numericSentenceIndex)) {
            const maxIndex =
              targetSectionId != null
                ? (parsed.sections.find((s) => s.id === targetSectionId)?.sentences
                  .length ?? 0) - 1
                : -1;
            if (numericSentenceIndex >= 0 && numericSentenceIndex <= maxIndex) {
              setCurrentSentenceIndexSafe(numericSentenceIndex);
            }
          }
        }
      }

      if (savedFileNameRaw) {
        setFileName(savedFileNameRaw);
      }

      if (savedVolumeRaw != null) {
        const vol = Number(savedVolumeRaw);
        if (!Number.isNaN(vol) && vol >= 0 && vol <= 1) {
          console.log("[TTSText] init: restore volume", vol);
          setVolume(vol);
        }
      }

      if (savedEnglishRateRaw != null) {
        const rate = Number(savedEnglishRateRaw);
        if (!Number.isNaN(rate) && rate > 0 && rate <= 3) {
          console.log("[TTSText] init: restore englishRate", rate);
          setEnglishRate(rate);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Section 변경 시 localStorage 에 저장
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedSectionId == null) return;
    try {
      console.log("[TTSText] save selectedSectionId", selectedSectionId);
      window.localStorage.setItem(
        STORAGE_KEY_SECTION_ID,
        String(selectedSectionId),
      );
    } catch {
      // ignore
    }
  }, [selectedSectionId]);

  useEffect(() => {
    setCurrentSentenceIndexSafe(0);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setSpeaking(false);
    playStateRef.current.stop = true;
    setIsSequencePlaying(false);

    // PageDown 으로 섹션을 넘길 때, 재생 중이었다면 다음 섹션의 처음부터 자동 재생
    if (autoPlayFromStartRef.current && currentSection && currentSection.sentences.length) {
      autoPlayFromStartRef.current = false;
      startPlayFromIndex(0);
    } else {
      autoPlayFromStartRef.current = false;
    }
  }, [selectedSectionId, sections.length]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const list = synth.getVoices();
      if (list && list.length) {
        setVoices(list);

        if (!voiceInitializedRef.current) {
          let chosenEn: SpeechSynthesisVoice | undefined;

          chosenEn = list.find(
            (v) =>
              /zira/i.test(v.name) &&
              v.lang &&
              v.lang.toLowerCase().startsWith("en"),
          );
          if (!chosenEn) {
            chosenEn = list.find(
              (v) => v.lang && v.lang.toLowerCase().startsWith("en-us"),
            );
          }
          if (!chosenEn) {
            chosenEn = list.find(
              (v) => v.lang && v.lang.toLowerCase().startsWith("en"),
            );
          }

          if (chosenEn) {
            setEnglishVoiceName(chosenEn.name);
          }

          voiceInitializedRef.current = true;
        }
      }
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // 섹션을 delta(±1) 만큼 이동 (버튼/키보드 공통 사용)
  const changeSectionByDelta = (delta: number) => {
    if (!sections.length || !currentSection) return;

    const currentIndex = sections.findIndex((s) => s.id === currentSection.id);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= sections.length) return;

    // 재생 중에 섹션을 바꾸면 새 섹션 처음부터 자동 재생
    if (!playStateRef.current.stop) {
      autoPlayFromStartRef.current = true;
    }

    setSelectedSectionId(sections[nextIndex].id);
  };

  // 키보드 단축키: Space = Play/Stop 토글, ↑/↓ = 이전/다음 문장, PageUp/Down = 섹션 이동
  const handleSectionKeyDown = (e: React.KeyboardEvent) => {
    if (!sections.length) return;

    const target = e.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      const isFormTag = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      // 입력창 안에서도 PageUp/PageDown 은 섹션 이동에 사용하고,
      // 나머지 키(Space, 화살표 등)는 원래 입력 동작을 방해하지 않도록 무시
      if (isFormTag && e.key !== "PageUp" && e.key !== "PageDown") {
        return;
      }
      // contentEditable 등은 나중에 필요하면 추가
    }

    // Space: Play / Stop 토글 (연속 재생 기준)
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (!currentSection || !currentSection.sentences.length) return;

      if (!playStateRef.current.stop) {
        // 현재 연속 재생 중이면 Stop
        handleStop();
      } else {
        // 멈춘 상태면 Play 시퀀스 시작
        handlePlaySequence();
      }
      return;
    }

    // ↑ / ↓ : 이전 / 다음 문장 (버튼 <, > 와 동일)
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handlePrevSentence();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      handleNextSentence();
      return;
    }

    // PageUp / PageDown 으로 Section 이동
    if (e.key === "PageDown") {
      e.preventDefault();
      changeSectionByDelta(1);
      return;
    }
    if (e.key === "PageUp") {
      e.preventDefault();
      if (!currentSection || !sections.length) return;
      const currentIndex = sections.findIndex((s) => s.id === currentSection.id);
      if (currentIndex <= 0) {
        // Lesson 1 에서 PageUp: 같은 Lesson 의 처음 문장으로 이동
        const wasPlaying = !playStateRef.current.stop;
        setCurrentSentenceIndexSafe(0);

        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            window.speechSynthesis.cancel();
          } catch {
            // ignore
          }
        }
        setSpeaking(false);
        playStateRef.current.stop = true;
        if (blankTimeoutRef.current != null) {
          clearTimeout(blankTimeoutRef.current);
          blankTimeoutRef.current = null;
        }
        setIsSequencePlaying(false);

        if (wasPlaying && currentSection.sentences.length) {
          startPlayFromIndex(0);
        }
      } else {
        changeSectionByDelta(-1);
      }
      return;
    }
  };

  const englishVoices = useMemo(() => {
    if (!voices.length) return [];
    return voices.filter(
      (v) => v.lang && v.lang.toLowerCase().startsWith("en"),
    );
  }, [voices]);

  const handleClear = () => {
    setText("");
    setSections([]);
    setSelectedSectionId(null);
    setFileName(null);
    setCurrentSentenceIndexSafe(0);
    playStateRef.current.stop = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setSpeaking(false);
    setIsSequencePlaying(false);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY_TEXT);
        window.localStorage.removeItem(STORAGE_KEY_SECTION_ID);
        window.localStorage.removeItem(STORAGE_KEY_SENTENCE_INDEX);
        window.localStorage.removeItem(STORAGE_KEY_FILE_NAME);
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleParse = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      alert("읽을 텍스트를 입력해 주세요.");
      return;
    }
    const parsed = parseBookText(trimmed);
    if (!parsed.sections.length) {
      alert("유효한 Lesson 을 찾지 못했습니다. LESSON 1. 형식을 확인해 주세요.");
      return;
    }
    setBookTitle(parsed.title);
    setSections(parsed.sections);
    setSelectedSectionId(parsed.sections[0].id);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY_TEXT, text);
        window.localStorage.setItem(
          STORAGE_KEY_SECTION_ID,
          String(parsed.sections[0].id),
        );
        window.localStorage.setItem(
          STORAGE_KEY_SENTENCE_INDEX,
          String(0),
        );
      } catch {
        // ignore storage errors
      }
    }
  };

  // 파일 열기 (로컬 텍스트 파일 선택)
  const handleOpenFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      const trimmed = content.trim();
      if (!trimmed) {
        alert("파일에 읽을 텍스트가 없습니다.");
        return;
      }

      setFileName(file.name);
      setText(content);
      const parsed = parseBookText(trimmed);
      if (!parsed.sections.length) {
        alert("유효한 Lesson 을 찾지 못했습니다. LESSON 1. 형식을 확인해 주세요.");
        setSections([]);
        setSelectedSectionId(null);
        return;
      }
      setBookTitle(parsed.title);
      setSections(parsed.sections);
      setSelectedSectionId(parsed.sections[0].id);
      setCurrentSentenceIndexSafe(0);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY_TEXT, content);
          window.localStorage.setItem(
            STORAGE_KEY_SECTION_ID,
            String(parsed.sections[0].id),
          );
          window.localStorage.setItem(
            STORAGE_KEY_SENTENCE_INDEX,
            String(0),
          );
          window.localStorage.setItem(STORAGE_KEY_FILE_NAME, file.name);
        } catch {
          // ignore
        }
      }
    };
    reader.readAsText(file);
  };

  // 최신: localStorage 에 저장된 마지막 텍스트/설정을 다시 불러오기
  const handleOpenRecent = () => {
    if (typeof window === "undefined") return;
    try {
      const savedText = window.localStorage.getItem(STORAGE_KEY_TEXT) ?? "";
      if (!savedText.trim()) {
        alert("저장된 최신 텍스트가 없습니다.");
        return;
      }
      const savedSectionIdRaw = window.localStorage.getItem(
        STORAGE_KEY_SECTION_ID,
      );
      const savedSentenceIndexRaw = window.localStorage.getItem(
        STORAGE_KEY_SENTENCE_INDEX,
      );
      const savedFileNameRaw = window.localStorage.getItem(STORAGE_KEY_FILE_NAME);

      setText(savedText);
      const parsed = parseBookText(savedText);
      setBookTitle(parsed.title);
      setSections(parsed.sections);

      if (parsed.sections.length > 0) {
        let targetSectionId: number | null = null;
        const numericSectionId = savedSectionIdRaw
          ? Number(savedSectionIdRaw)
          : NaN;
        if (!Number.isNaN(numericSectionId)) {
          const exists = parsed.sections.some((s) => s.id === numericSectionId);
          targetSectionId = exists ? numericSectionId : parsed.sections[0].id;
        } else {
          targetSectionId = parsed.sections[0].id;
        }
        setSelectedSectionId(targetSectionId);

        const numericSentenceIndex = savedSentenceIndexRaw
          ? Number(savedSentenceIndexRaw)
          : NaN;
        if (!Number.isNaN(numericSentenceIndex)) {
          const maxIndex =
            targetSectionId != null
              ? (parsed.sections.find((s) => s.id === targetSectionId)?.sentences
                .length ?? 0) - 1
              : -1;
          if (
            numericSentenceIndex >= 0 &&
            numericSentenceIndex <= maxIndex
          ) {
            setCurrentSentenceIndexSafe(numericSentenceIndex);
          } else {
            setCurrentSentenceIndexSafe(0);
          }
        } else {
          setCurrentSentenceIndexSafe(0);
        }
      } else {
        setSelectedSectionId(null);
        setCurrentSentenceIndexSafe(0);
      }

      setFileName(savedFileNameRaw || null);
    } catch {
      // ignore
    }
  };

  // 단어 발음용: 현재 설정된 영어 보이스로 한 번만 읽기 (OnAir 상태와는 별개)
  const speakWordOnce = (word: string, onDone?: () => void) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(trimmed);
      utter.volume = volume >= 0 && volume <= 1 ? volume : 1;
      utter.rate = englishRate > 0 ? englishRate : 1;

      try {
        const allVoices = synth.getVoices?.() || [];
        let targetVoice: SpeechSynthesisVoice | undefined;
        if (englishVoiceName && englishVoiceName !== "default") {
          targetVoice = allVoices.find((v) => v.name === englishVoiceName);
        }
        if (!targetVoice) {
          targetVoice = allVoices.find(
            (v) => v.lang && v.lang.toLowerCase().startsWith("en"),
          );
        }
        if (targetVoice) {
          utter.voice = targetVoice;
          if (targetVoice.lang) {
            utter.lang = targetVoice.lang;
          }
        } else {
          utter.lang = "en-US";
        }
      } catch {
        // ignore
      }

      utter.onend = () => {
        if (onDone) onDone();
      };
      utter.onerror = () => {
        if (onDone) onDone();
      };

      synth.speak(utter);
    } catch {
      if (onDone) onDone();
    }
  };

  const startWordPronounceLoop = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;

    // 문장 연속 재생 중에는 단어 발음 루프를 시작하지 않음 (먼저 Stop 필요)
    if (!playStateRef.current.stop) {
      return;
    }

    if (
      wordLoopRef.current &&
      wordLoopRef.current.active &&
      wordLoopRef.current.word === trimmed
    ) {
      return;
    }

    wordLoopRef.current = { active: true, word: trimmed };

    const speakOnce = () => {
      const loop = wordLoopRef.current;
      if (!loop || !loop.active || loop.word !== trimmed) return;

      speakWordOnce(trimmed, () => {
        const again = wordLoopRef.current;
        if (again && again.active && again.word === trimmed) {
          speakOnce();
        }
      });
    };

    speakOnce();
  };

  const stopWordPronounceLoop = () => {
    if (wordLoopRef.current) {
      wordLoopRef.current.active = false;
    }
  };



  const lookupWordDetail = async (
    word: string,
  ): Promise<{ phonetic?: string; englishDefs: string[]; koreanDefs: string[] }> => {
    const result: { phonetic?: string; englishDefs: string[]; koreanDefs: string[] } = {
      englishDefs: [],
      koreanDefs: [],
    };

    const lower = word.toLowerCase();

    // 1. Google Translate Unofficial (GTX) for Rich Dictionary
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&dt=bd&q=${encodeURIComponent(
          lower,
        )}`,
      );
      if (res.ok) {
        const data = await res.json();
        // data[0][0][0] = Primary translation
        // data[1] = Dictionary entries [[partOfSpeech, [terms...]], ...]

        if (data[1] && Array.isArray(data[1])) {
          const koDefs: string[] = [];
          for (const entry of data[1]) {
            const pos = entry[0];
            const terms = entry[1];
            if (pos && Array.isArray(terms) && terms.length > 0) {
              const joined = terms.slice(0, 4).join(", ");
              // "noun" -> "명사" mapping
              let posKo = pos;
              if (pos === "noun") posKo = "명사";
              else if (pos === "verb") posKo = "동사";
              else if (pos === "adjective") posKo = "형용사";
              else if (pos === "adverb") posKo = "부사";
              else if (pos === "preposition") posKo = "전치사";
              else if (pos === "conjunction") posKo = "접속사";
              else if (pos === "pronoun") posKo = "대명사";
              else if (pos === "interjection") posKo = "감탄사";

              koDefs.push(`[${posKo}] ${joined}`);
            }
          }
          result.koreanDefs = koDefs;
        } else if (data[0] && data[0][0] && data[0][0][0]) {
          result.koreanDefs = [data[0][0][0]];
        }
      }
    } catch {
      // ignore
    }

    // 2. English Dictionary (Free Dictionary API) for Phonetic
    if (!result.phonetic) {
      try {
        const res = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
            lower,
          )}`,
        );
        if (res.ok) {
          const data: any = await res.json();
          const entry =
            Array.isArray(data) && data.length > 0 ? data[0] : undefined;
          if (entry) {
            const phonetic =
              entry.phonetic ||
              (Array.isArray(entry.phonetics)
                ? entry.phonetics.find((p: any) => p.text)?.text
                : undefined);
            if (phonetic) result.phonetic = phonetic;

            if (result.koreanDefs.length === 0 && Array.isArray(entry.meanings)) {
              const defs: string[] = [];
              for (const m of entry.meanings) {
                if (!m.definitions) continue;
                for (const d of m.definitions) {
                  if (d.definition) defs.push(d.definition);
                }
              }
              result.englishDefs = defs.slice(0, 2);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return result;
  };

  const handleStop = () => {
    if (blankTimeoutRef.current != null) {
      clearTimeout(blankTimeoutRef.current);
      blankTimeoutRef.current = null;
    }
    playStateRef.current.stop = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    stopWordPronounceLoop();
    setSpeaking(false);
    setIsSequencePlaying(false);
  };

  const speakMessage = (msg: string, onDone?: () => void) => {
    const trimmed = msg.trim();
    if (!trimmed) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(trimmed);
      utter.volume = volume >= 0 && volume <= 1 ? volume : 1;
      utter.rate = englishRate > 0 ? englishRate : 1;

      try {
        const allVoices = synth.getVoices?.() || [];
        let targetVoice: SpeechSynthesisVoice | undefined;
        if (englishVoiceName && englishVoiceName !== "default") {
          targetVoice = allVoices.find((v) => v.name === englishVoiceName);
        }
        if (!targetVoice) {
          targetVoice = allVoices.find(
            (v) => v.lang && v.lang.toLowerCase().startsWith("en"),
          );
        }
        if (targetVoice) {
          utter.voice = targetVoice;
          if (targetVoice.lang) {
            utter.lang = targetVoice.lang;
          }
        } else {
          utter.lang = "en-US";
        }
      } catch {
        // ignore
      }

      setSpeaking(true);
      utter.onend = () => {
        setSpeaking(false);
        if (onDone) onDone();
      };
      utter.onerror = () => {
        setSpeaking(false);
        if (onDone) onDone();
      };

      synth.speak(utter);
    } catch {
      setSpeaking(false);
      if (onDone) onDone();
    }
  };

  const startPlayFromIndex = (startIndex: number) => {
    if (!currentSection || !currentSection.sentences.length) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // 새로운 재생 세션 시작: 이전 세션에서 남아있던 콜백/타이머는 모두 무시
    const sessionId = ++playSessionIdRef.current;

    if (blankTimeoutRef.current != null) {
      clearTimeout(blankTimeoutRef.current);
      blankTimeoutRef.current = null;
    }
    playStateRef.current.stop = false;
    setIsSequencePlaying(true);

    const sentences = currentSection.sentences;

    const playFrom = (index: number) => {
      // 더 이상 유효하지 않은 세션이면 아무 것도 하지 않음
      if (sessionId !== playSessionIdRef.current) {
        return;
      }

      if (index < 0 || index >= sentences.length) {
        setSpeaking(false);
        playStateRef.current.stop = true;
        setIsSequencePlaying(false);
        return;
      }

      setCurrentSentenceIndexSafe(index);
      const currentText = sentences[index];

      // 빈 줄이면 0.2초 쉬고 자동으로 다음 문장으로 이동
      if (!currentText || currentText.trim().length === 0) {
        if (blankTimeoutRef.current != null) {
          clearTimeout(blankTimeoutRef.current);
          blankTimeoutRef.current = null;
        }
        blankTimeoutRef.current = window.setTimeout(() => {
          if (sessionId !== playSessionIdRef.current) {
            return;
          }
          if (playStateRef.current.stop) {
            return;
          }
          if (repeatModeRef.current) {
            playFrom(index);
          } else {
            const nextIndex = index + 1;
            if (nextIndex < sentences.length) {
              playFrom(nextIndex);
            } else {
              setSpeaking(false);
              playStateRef.current.stop = true;
              setIsSequencePlaying(false);
            }
          }
        }, 200);
        return;
      }

      speakMessage(currentText, () => {
        if (sessionId !== playSessionIdRef.current) {
          return;
        }
        if (playStateRef.current.stop) {
          return;
        }

        if (repeatModeRef.current) {
          playFrom(index);
        } else {
          const nextIndex = index + 1;
          if (nextIndex < sentences.length) {
            playFrom(nextIndex);
          } else {
            setSpeaking(false);
            playStateRef.current.stop = true;
            setIsSequencePlaying(false);
          }
        }
      });
    };
    playFrom(startIndex);
  };

  const handlePlaySequence = () => {
    if (!currentSection || !currentSection.sentences.length) return;
    const sentences = currentSection.sentences;
    // Section 마지막 문장에서 Play 를 누르면 처음(0번)부터 다시 시작
    const startIndex =
      currentSentenceIndexRef.current >= sentences.length - 1
        ? 0
        : currentSentenceIndexRef.current;
    startPlayFromIndex(startIndex);
  };

  const handlePrevSentence = () => {
    if (!currentSection || !currentSection.sentences.length) return;
    // 이전에 연속 재생(Play/Repeat) 중이었는지 여부를 기억
    const wasPlaying = !playStateRef.current.stop;

    const nextIndex = Math.max(0, currentSentenceIndexRef.current - 1);

    setCurrentSentenceIndexSafe(nextIndex);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setSpeaking(false);
    playStateRef.current.stop = true;

    if (blankTimeoutRef.current != null) {
      clearTimeout(blankTimeoutRef.current);
      blankTimeoutRef.current = null;
    }

    setIsSequencePlaying(false);

    // Play 상태였다면, 이전 문장으로 이동 후 그 문장부터 다시 연속 재생
    if (wasPlaying) {
      startPlayFromIndex(nextIndex);
    }
  };

  const handleNextSentence = () => {
    if (!currentSection || !currentSection.sentences.length) return;
    // 이전에 연속 재생(Play/Repeat) 중이었는지 여부를 기억
    const wasPlaying = !playStateRef.current.stop;
    const nextIndex = Math.min(
      currentSection.sentences.length - 1,
      currentSentenceIndexRef.current + 1,
    );

    setCurrentSentenceIndexSafe(nextIndex);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setSpeaking(false);
    playStateRef.current.stop = true;

    if (blankTimeoutRef.current != null) {
      clearTimeout(blankTimeoutRef.current);
      blankTimeoutRef.current = null;
    }

    setIsSequencePlaying(false);

    // Play 상태였다면, 다음 문장으로 이동 후 그 문장부터 다시 연속 재생
    if (wasPlaying) {
      startPlayFromIndex(nextIndex);
    }
  };

  const isOnAir = speaking || isSequencePlaying;

  return (
    <main
      className="h-screen w-full flex flex-col items-center bg-slate-50 py-4 overflow-hidden"
      onKeyDown={handleSectionKeyDown}
    >
      <div className="w-full max-w-2xl bg-white rounded shadow p-4 space-y-4 h-full flex flex-col">
        <h1 className="text-lg font-semibold">TTS (텍스트 읽어주기)</h1>
        {/* 파일 탭: 열기 / 최신 / 닫기 */}
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">파일</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-sm"
              onClick={handleOpenFileClick}
            >
              열기
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-sm"
              onClick={handleOpenRecent}
            >
              최신
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-sm"
              onClick={handleClear}
            >
              닫기
            </Button>
          </div>
          <div className="text-xs text-gray-500 truncate max-w-[200px] text-right">
            {fileName ? `현재 파일: ${fileName}` : "현재 열린 파일 없음"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="border rounded p-2 space-y-2 flex-1 flex flex-col min-h-0">
          <div className="flex flex-col items-end gap-1 text-sm text-gray-600 mb-1">
            <div className="flex items-center gap-2">
              <span>볼륨:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  const vol = Number.isNaN(v) ? 0 : v;
                  console.log("[TTSText] slider change volume", v, "->", vol);
                  setVolume(vol);
                  if (typeof window !== "undefined") {
                    try {
                      console.log("[TTSText] slider save volume", vol);
                      window.localStorage.setItem(
                        STORAGE_KEY_VOLUME,
                        String(vol),
                      );
                    } catch {
                      // ignore
                    }
                  }
                }}
                className="w-40"
              />
              <span className="w-10 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>영어배속:</span>
              <select
                className="border rounded px-1 py-0.5 text-sm"
                value={englishRate}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  const rate = Number.isNaN(v) ? 1 : v;
                  console.log("[TTSText] select change englishRate", v, "->", rate);
                  setEnglishRate(rate);
                  if (typeof window !== "undefined") {
                    try {
                      console.log("[TTSText] select save englishRate", rate);
                      window.localStorage.setItem(
                        STORAGE_KEY_ENGLISH_RATE,
                        String(rate),
                      );
                    } catch {
                      // ignore
                    }
                  }
                }}
              >
                {[0.6, 0.8, 1, 1.2, 1.5].map((r) => (
                  <option key={r} value={r}>
                    {r.toFixed(1)}x
                  </option>
                ))}
              </select>
              <span>영어 보이스:</span>
              {englishVoices.length > 0 ? (
                <select
                  className="border rounded px-1 py-0.5 text-sm max-w-[200px]"
                  value={englishVoiceName}
                  onChange={(e) => setEnglishVoiceName(e.target.value)}
                >
                  <option value="default">기본 영어 음성</option>
                  {englishVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="border rounded px-1 py-0.5 text-sm max-w-[200px] text-gray-400 bg-gray-50"
                  value="default"
                  disabled
                >
                  <option value="default">기본 영어 (브라우저 기본)</option>
                </select>
              )}
            </div>
          </div>

          {bookTitle && (
            <div className="text-center font-bold text-[20px] mt-2 mb-2">
              {bookTitle}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Lesson:</span>
              {sections.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {sections.slice(0, 42).map((s, idx) => {
                    const isActive = currentSection && currentSection.id === s.id;
                    return (
                      <Button
                        key={s.id}
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() => setSelectedSectionId(s.id)}
                      >
                        {idx + 1}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <span className="text-xs text-gray-400">
                  (먼저 파일을 열거나 최신을 눌러 주세요)
                </span>
              )}
            </div>
          </div>

          {currentSection ? (
            <>
              {/* 첫 줄: OnAir 를 상단 오른쪽 끝에 배치 */}
              <div className="mb-1 flex justify-end">
                <span
                  className={
                    "inline-flex items-center justify-center px-5 py-2 rounded-full text-sm font-semibold " +
                    (isOnAir
                      ? "bg-red-600 text-white"
                      : "bg-black text-gray-400")
                  }
                >
                  OnAir
                </span>
              </div>

              {/* 둘째 줄: Lesson 제목을 오른쪽 텍스트 창 시작 위치에 맞춰 배치 (약간 위로 올리고, 25px 정도 오른쪽으로 이동) */}
              <div className="mt-[-5px] mb-1 flex items-center">
                <div className="w-24" />
                <div className="flex-1 text-sm font-semibold text-gray-700 pl-[25px]">
                  {currentSection.title}
                </div>
              </div>

              <div className="flex gap-4 flex-1 min-h-0">
                <div className="flex flex-col gap-2 w-24">
                  <Button
                    size="sm"
                    className="h-8 px-3 text-sm"
                    onClick={handlePlaySequence}
                    disabled={!currentSection.sentences.length}
                  >
                    Play
                  </Button>

                  <Button
                    size="sm"
                    className="h-8 px-3 text-sm"
                    variant={repeatMode ? "default" : "outline"}
                    onClick={() => setRepeatMode((prev) => !prev)}
                  >
                    반복 {repeatMode ? "ON" : "OFF"}
                  </Button>

                  <Button
                    size="sm"
                    className="h-8 px-3 text-sm"
                    onClick={handlePrevSentence}
                    disabled={currentSentenceIndex <= 0}
                  >
                    &lt;
                  </Button>

                  <Button
                    size="sm"
                    className="h-8 px-3 text-sm"
                    onClick={handleNextSentence}
                    disabled={
                      currentSentenceIndex >=
                      currentSection.sentences.length - 1
                    }
                  >
                    &gt;
                  </Button>
                  {/* 섹션 이동 버튼 (<< = PageUp, >> = PageDown) + Stop */}
                  <div className="mt-6 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 px-3 text-sm"
                        disabled={
                          !currentSection ||
                          sections.findIndex((s) => s.id === currentSection.id) <= 0
                        }
                        onClick={() => changeSectionByDelta(-1)}
                      >
                        {"<<"}
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-sm"
                        disabled={
                          !currentSection ||
                          sections.findIndex((s) => s.id === currentSection.id) ===
                          sections.length - 1
                        }
                        onClick={() => changeSectionByDelta(1)}
                      >
                        {">>"}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 px-3 text-sm"
                      onClick={handleStop}
                      disabled={!speaking}
                    >
                      Stop
                    </Button>
                  </div>
                </div>

                {/* 오른쪽: 전체 문장 출력 (줄바꿈 그대로 보존 + 단어 사전/발음) */}
                <div
                  ref={scrollContainerRef}
                  className="flex-1 border rounded px-3 py-2 bg-slate-50 text-sm whitespace-pre-wrap leading-relaxed overflow-y-auto"
                >
                  <pre className="whitespace-pre-wrap leading-relaxed text-sm">
                    {currentSection.sentences.map((sentence, idx) => (
                      <React.Fragment key={idx}>
                        <span
                          className={
                            idx === currentSentenceIndex
                              ? "bg-yellow-200 px-0.5"
                              : ""
                          }
                          data-tts-line={idx}
                          onDoubleClick={() => {
                            if (!currentSection || !currentSection.sentences.length) return;
                            const targetIndex = idx;
                            const wasPlaying = !playStateRef.current.stop;

                            setCurrentSentenceIndexSafe(targetIndex);

                            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                              try {
                                window.speechSynthesis.cancel();
                              } catch {
                                // ignore
                              }
                            }
                            setSpeaking(false);
                            playStateRef.current.stop = true;
                            if (blankTimeoutRef.current != null) {
                              clearTimeout(blankTimeoutRef.current);
                              blankTimeoutRef.current = null;
                            }
                            setIsSequencePlaying(false);

                            // 재생 중이었으면, 더블클릭한 줄부터 다시 연속 재생
                            if (wasPlaying) {
                              startPlayFromIndex(targetIndex);
                            }
                          }}
                        >
                          {sentence === ""
                            ? " "
                            : sentence.split(/(\s+)/).map((part, pIdx) => {
                              if (part.match(/^\s+$/)) {
                                return part;
                              }
                              const clean = part.replace(/[^A-Za-z']/g, "");
                              if (!clean) {
                                return (
                                  <span key={pIdx}>
                                    {part}
                                  </span>
                                );
                              }
                              return (
                                <span
                                  key={pIdx}
                                  className="cursor-pointer hover:bg-yellow-100"
                                  onMouseEnter={(e) => {
                                    if (hoverTimerRef.current) {
                                      clearTimeout(hoverTimerRef.current);
                                    }
                                    hoverWordRef.current = clean;
                                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                                    hoverPosRef.current = {
                                      x: rect.left + window.scrollX,
                                      y: rect.bottom + window.scrollY + 30,
                                    };
                                    hoverTimerRef.current = setTimeout(async () => {
                                      if (hoverWordRef.current !== clean) return;
                                      const detail = await lookupWordDetail(clean);
                                      const pos = hoverPosRef.current;
                                      if (!pos || hoverWordRef.current !== clean) return;
                                      setHoverPopup({
                                        word: clean,
                                        phonetic: detail.phonetic,
                                        englishDefs: detail.englishDefs,
                                        koreanDefs: detail.koreanDefs,
                                        x: pos.x,
                                        y: pos.y,
                                      });
                                    }, 100);
                                  }}
                                  onMouseLeave={() => {
                                    if (hoverTimerRef.current) {
                                      clearTimeout(hoverTimerRef.current);
                                      hoverTimerRef.current = null;
                                    }
                                    hoverWordRef.current = null;
                                    hoverPosRef.current = null;
                                    setHoverPopup(null);
                                  }}
                                  onMouseDown={(e) => {
                                    if (e.button === 0) {
                                      e.preventDefault();
                                      startWordPronounceLoop(clean);
                                    }
                                  }}
                                  onMouseUp={(e) => {
                                    if (e.button === 0) {
                                      e.preventDefault();
                                      stopWordPronounceLoop();
                                    }
                                  }}
                                >
                                  {part}
                                </span>
                              );
                            })}
                        </span>
                        {"\n"}
                      </React.Fragment>
                    ))}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">
              아직 나눠진 Lesson 이 없습니다. 상단에서 텍스트 파일을 열거나
              "최신" 버튼을 눌러 주세요.
            </div>
          )}
        </div>
      </div>
      {hoverPopup && (
        <div
          className="fixed z-40 bg-white border rounded shadow-md p-3 text-sm max-w-xs"
          style={{ left: hoverPopup.x, top: hoverPopup.y }}
        >
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="font-semibold">{hoverPopup.word}</span>
            <a
              href={`https://en.dict.naver.com/#/search?query=${encodeURIComponent(
                hoverPopup.word,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="text-white bg-[#03C75A] hover:bg-[#02b351] px-3 py-1 rounded text-xs font-bold no-underline shadow-sm transition-colors"
            >
              Naver Dictionary
            </a>
          </div>
          {hoverPopup.phonetic && (
            <div className="text-sm text-gray-500 mb-1">[{hoverPopup.phonetic}]</div>
          )}
          {hoverPopup.koreanDefs && hoverPopup.koreanDefs.length > 0 && (
            <div className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">
              {hoverPopup.koreanDefs.map((d, i) => (
                <div key={i} className="mb-0.5">{d}</div>
              ))}
            </div>
          )}
          {/* 영영 정의는 한국어 정의가 없을 때만 보여주거나, 보조적으로 보여줌. 여기서는 깔끔하게 한국어 위주로 */}
          {(!hoverPopup.koreanDefs || hoverPopup.koreanDefs.length === 0) &&
            hoverPopup.englishDefs &&
            hoverPopup.englishDefs.length > 0 && (
              <div className="text-sm text-gray-500 whitespace-pre-wrap">
                {hoverPopup.englishDefs.slice(0, 3).map((d, i) => (
                  <div key={i}>{`${i + 1}. ${d}`}</div>
                ))}
              </div>
            )}
        </div>
      )
      }
    </main >
  );
}