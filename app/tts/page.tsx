// app/tts/page.tsx (리팩토링 버전)
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { parseScript, type ParsedScene } from "@/lib/tts-parser";
import { lookupWordDetail, translateToKorean } from "@/lib/tts-dictionary";
import { useTTSVoices } from "@/hooks/useTTSVoices";
import { useTTSSpeech } from "@/hooks/useTTSSpeech";
import { WordHoverPopup } from "@/components/tts/WordHoverPopup";
import { TTSControls } from "@/components/tts/TTSControls";

type StudySession = {
  start: number;
  end: number;
};

type WordLogEntry = {
  word: string;
  phonetic?: string;
  meaning?: string;
  timestamp: string; // ISO string
};

type ColumnVisibility = {
  word: boolean;
  phonetic: boolean;
  meaning: boolean;
  time: boolean;
};

function stripExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx <= 0) return name;
  return name.slice(0, idx);
}

function downloadTextFile(filename: string, content: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildSentenceTranslationsFromScripts(
  englishScenes: ParsedScene[],
  koreanScenes: ParsedScene[],
): Record<string, string> {
  const map: Record<string, string> = {};
  const sceneCount = Math.min(englishScenes.length, koreanScenes.length);
  for (let si = 0; si < sceneCount; si++) {
    const eScene = englishScenes[si];
    const kScene = koreanScenes[si];
    const lineCount = Math.min(eScene.lines.length, kScene.lines.length);
    for (let li = 0; li < lineCount; li++) {
      const eLine = eScene.lines[li];
      const kLine = kScene.lines[li];
      const sentCount = Math.min(eLine.sentences.length, kLine.sentences.length);
      for (let s = 0; s < sentCount; s++) {
        const key = `${eLine.id}-${s}`;
        const value = (kLine.sentences[s] || "").trim();
        if (value) {
          map[key] = value;
        }
      }
    }
  }
  return map;
}

// 원문(.txt)과 번역(.krt)의 Scene/대사 구조가 1:1 로 맞는지 간단히 점검
function analyzeScriptAlignment(
  englishScenes: ParsedScene[],
  koreanScenes: ParsedScene[],
): { ok: boolean; message: string } {
  const issues: string[] = [];

  if (englishScenes.length !== koreanScenes.length) {
    issues.push(
      `Scene 개수 불일치: 원문 ${englishScenes.length}개, 번역 ${koreanScenes.length}개`,
    );
  }

  const sceneCount = Math.min(englishScenes.length, koreanScenes.length);
  for (let si = 0; si < sceneCount; si++) {
    const eScene = englishScenes[si];
    const kScene = koreanScenes[si];

    if (eScene.sceneNumber !== kScene.sceneNumber) {
      issues.push(
        `Scene 인덱스 ${si + 1}: sceneNumber 불일치 (원문 ${eScene.sceneNumber}, 번역 ${kScene.sceneNumber})`,
      );
    }

    if (eScene.lines.length !== kScene.lines.length) {
      issues.push(
        `Scene ${eScene.sceneNumber}: 대사 줄 수 불일치 (원문 ${eScene.lines.length}줄, 번역 ${kScene.lines.length}줄)`,
      );
      continue;
    }

    const lineCount = Math.min(eScene.lines.length, kScene.lines.length);
    for (let li = 0; li < lineCount; li++) {
      const eLine = eScene.lines[li];
      const kLine = kScene.lines[li];

      if (eLine.speaker !== kLine.speaker) {
        issues.push(
          `Scene ${eScene.sceneNumber} Line ${li + 1}: 화자 이름 불일치 (원문 "${eLine.speaker}", 번역 "${kLine.speaker}")`,
        );
      }

      if (eLine.sentences.length !== kLine.sentences.length) {
        issues.push(
          `Scene ${eScene.sceneNumber} ${eLine.speaker} 줄: 문장 수 불일치 (원문 ${eLine.sentences.length}개, 번역 ${kLine.sentences.length}개)`,
        );
      }

      if (issues.length > 30) {
        issues.push("(이하 생략: 불일치 항목이 많습니다)");
        break;
      }
    }

    if (issues.length > 30) break;
  }

  if (!issues.length) {
    return {
      ok: true,
      message: "원문과 번역 파일의 Scene / 대사 구조가 거의 1:1로 일치합니다.",
    };
  }

  return {
    ok: false,
    message: issues.join("\n"),
  };
}

function formatMeaningWithPosNewline(text?: string): string | undefined {
  if (!text) return text;
  const src = text;
  // 품사 표기처럼 대괄호로 시작하는 구문은 가능한 한 새 줄에서 시작하도록 정리
  // 예: "[형용사] ...; [명사] ..." -> "[형용사] ...\n[명사] ..."
  return src.replace(/\s*\[/g, (match, offset: number, original: string) => {
    // 문자열 맨 앞에 오는 "[" 는 그대로 두되, 그 앞에 공백들은 제거
    if (offset === 0) return "[";
    // 이미 바로 앞이 줄바꿈이면 추가 줄바꿈은 넣지 않고 "[" 만 유지
    const prevChar = original[offset - 1];
    if (prevChar === "\n") return "[";
    // 나머지 경우에는 새 줄에서 품사 표기가 시작되도록 처리
    return "\n[";
  });
}

function formatDuration(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

// 내부 디버그용: 항상 HH:MM:SS 형태로 표시
function formatDurationHMS(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// 대시보드용: 시/분 숫자 부분만 2자리로 반환
function getHourMinuteParts(totalSeconds: number): { h: string; m: string } {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { h: pad(h), m: pad(m) };
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function TTSPage() {
  const [text, setText] = useState("");
  const [parsedScenes, setParsedScenes] = useState<ParsedScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [repeatCount, setRepeatCount] = useState(1);
  const [volume, setVolume] = useState(1);
  const [englishRate, setEnglishRate] = useState(1);
  const [koreanRate, setKoreanRate] = useState(1);
  const [storageReady, setStorageReady] = useState(false);
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(false);
  const [autoPauseSeconds, setAutoPauseSeconds] = useState(0);
  const [autoPauseLevel, setAutoPauseLevel] = useState<1 | 2>(1); // AutoPause 강도 레벨
  const [bilingualMode, setBilingualMode] = useState(false); // 영한 대역 토글
  const [sentenceTranslations, setSentenceTranslations] = useState<Record<string, string>>({});
  const [leftWidthPercent, setLeftWidthPercent] = useState(65); // 좌측 박스 비율 (퍼센트)
  const [containerWidth, setContainerWidth] = useState(1200); // 전체 콘텐츠 최대 폭(px)
  const [dashboardWidthPercent, setDashboardWidthPercent] = useState(100); // 상단 대시보드 폭 (%)
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [wordLogs, setWordLogs] = useState<WordLogEntry[]>([]);
  const [wordLogsHistory, setWordLogsHistory] = useState<WordLogEntry[][]>([]);
  const [wordTableMaxHeight, setWordTableMaxHeight] = useState(220); // 단어 표 최대 높이(px)
  const [highlightLookedWords, setHighlightLookedWords] = useState(true); // 찾아 본 단어 강조 여부
  const [highlightBold, setHighlightBold] = useState(true); // 강조 시 Bold 여부
  const [highlightColor, setHighlightColor] = useState("#fef3c7"); // 강조 배경 색상 (연한 노랑)
  const [highlightTextColor, setHighlightTextColor] = useState("#1d4ed8"); // 찾아 본 단어 폰트 색상
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    word: true,
    phonetic: true,
    meaning: true,
    time: true,
  });
  const [columnWidths, setColumnWidths] = useState({
    word: 100,
    phonetic: 110,
    meaning: 220,
    time: 160,
  });
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [currentScriptFilename, setCurrentScriptFilename] = useState<string | null>(null);
  const [uiPopupOpen, setUiPopupOpen] = useState(false);
  const [uiPopupPos, setUiPopupPos] = useState<{ x: number; y: number }>({ x: 16, y: 16 });
  const [hoverPopup, setHoverPopup] = useState<{
    word: string;
    phonetic?: string;
    englishDefs?: string[];
    koreanDefs?: string[];
    x: number;
    y: number;
  } | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("대기 중");
  const [lastPronunciationScore, setLastPronunciationScore] = useState<number | null>(null);
  const [lastProsodyScore, setLastProsodyScore] = useState<number | null>(null);
  const [practiceTarget, setPracticeTarget] = useState<WordLogEntry | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverWordRef = useRef<string | null>(null);
  const hoverPosRef = useRef<{ x: number; y: number } | null>(null);
  const wordLoopRef = useRef<{ active: boolean; word: string } | null>(null);
  const currentSessionStartRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number | null>(null);
  const scenePlayActiveRef = useRef<boolean>(false);
  const linePlayActiveRef = useRef<number | null>(null);
  const currentPlayTypeRef = useRef<"scene" | "line" | "sentence" | null>(null);
  const lastSpeakingRef = useRef<boolean>(false);
  const uiPopupDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    englishVoices,
    koreanVoices,
    englishVoiceName,
    setEnglishVoiceName,
    koreanVoiceName,
    setKoreanVoiceName,
    voiceInitializedRef,
  } = useTTSVoices();

  const { speaking, speakMessage, handleStop } = useTTSSpeech(
    volume,
    englishRate,
    koreanRate,
    englishVoiceName,
    koreanVoiceName,
    repeatCount
  );

  const [currentSentenceKey, setCurrentSentenceKey] = useState<string | null>(null);

  // 공통 학습 이벤트 기록 함수 (1분 룰 기준)
  const registerActivity = (options?: { scenePlay?: boolean }) => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    if (!currentSessionStartRef.current) {
      currentSessionStartRef.current = now;
    }
    lastActivityRef.current = now;
    if (options?.scenePlay) {
      scenePlayActiveRef.current = true;
    }
  };

  const currentScene = useMemo(() => {
    if (!parsedScenes.length) return null;
    if (selectedSceneId == null) return parsedScenes[0];
    return parsedScenes.find((s) => s.id === selectedSceneId) ?? parsedScenes[0];
  }, [parsedScenes, selectedSceneId]);
  const panelsContainerRef = useRef<HTMLDivElement | null>(null);

  const pushWordLogsHistory = (prev: WordLogEntry[]) => {
    if (!prev.length) return;
    setWordLogsHistory((hist) => {
      const next = [...hist, prev];
      // 히스토리 길이 제한 (최근 100단계까지만 보관)
      if (next.length > 100) return next.slice(next.length - 100);
      return next;
    });
  };

  const undoLastWordLogsChange = () => {
    setWordLogsHistory((hist) => {
      if (!hist.length) return hist;
      const prevLogs = hist[hist.length - 1];
      setWordLogs(prevLogs);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("tts_word_logs", JSON.stringify(prevLogs));
        } catch (e) {
          console.warn("[TTS] Failed to restore word logs from history:", e);
        }
      }
      return hist.slice(0, -1);
    });
  };

  // 좌우 패널 비율 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("tts_left_width_percent");
      if (!raw) return;
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        const clamped = Math.min(80, Math.max(35, parsed));
        setLeftWidthPercent(clamped);
      }
    } catch (e) {
      console.warn("[TTS] Failed to load left width percent:", e);
    }
  }, []);

  // Ctrl+Z 로 단어 로그 되돌리기
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undoLastWordLogsChange();
        registerActivity();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // 전체 화면 폭 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("tts_container_width");
      if (!raw) return;
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        const clamped = Math.min(1400, Math.max(800, parsed));
        setContainerWidth(clamped);
      }
    } catch (e) {
      console.warn("[TTS] Failed to load container width:", e);
    }
  }, []);

  // 내부 카운터 표시용 1초 틱
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  // 학습 시간 / 단어 기록 / 대시보드 관련 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawSessions = window.localStorage.getItem("tts_study_sessions");
      if (rawSessions) {
        const parsed = JSON.parse(rawSessions);
        if (Array.isArray(parsed)) {
          const valid: StudySession[] = parsed
            .map((s: any) => ({ start: Number(s.start), end: Number(s.end) }))
            .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start);
          setStudySessions(valid);
        }
      }

      const rawLogs = window.localStorage.getItem("tts_word_logs");
      if (rawLogs) {
        const parsedLogs = JSON.parse(rawLogs);
        if (Array.isArray(parsedLogs)) {
          const validLogs: WordLogEntry[] = parsedLogs
            .map((l: any) => ({
              word: String(l.word || ""),
              phonetic: l.phonetic ? String(l.phonetic) : undefined,
              meaning: l.meaning ? String(l.meaning) : undefined,
              timestamp: String(l.timestamp || ""),
            }))
            .filter((l) => l.word && l.timestamp);
          setWordLogs(validLogs);
        }
      }

      const rawTableHeight = window.localStorage.getItem("tts_word_table_height");
      if (rawTableHeight) {
        const v = Number(rawTableHeight);
        if (Number.isFinite(v)) {
          const clamped = Math.min(800, Math.max(120, v));
          setWordTableMaxHeight(clamped);
        }
      }

      const rawVisibility = window.localStorage.getItem("tts_column_visibility");
      if (rawVisibility) {
        const parsedVisibility = JSON.parse(rawVisibility);
        if (parsedVisibility && typeof parsedVisibility === "object") {
          setColumnVisibility((prev) => ({
            word: typeof parsedVisibility.word === "boolean" ? parsedVisibility.word : prev.word,
            phonetic:
              typeof parsedVisibility.phonetic === "boolean" ? parsedVisibility.phonetic : prev.phonetic,
            meaning:
              typeof parsedVisibility.meaning === "boolean" ? parsedVisibility.meaning : prev.meaning,
            time: typeof parsedVisibility.time === "boolean" ? parsedVisibility.time : prev.time,
          }));
        }
      }

      const rawWidths = window.localStorage.getItem("tts_column_widths");
      if (rawWidths) {
        const parsedWidths = JSON.parse(rawWidths);
        if (parsedWidths && typeof parsedWidths === "object") {
          setColumnWidths((prev) => ({
            word: Number.isFinite(Number(parsedWidths.word))
              ? Number(parsedWidths.word)
              : prev.word,
            phonetic: Number.isFinite(Number(parsedWidths.phonetic))
              ? Number(parsedWidths.phonetic)
              : prev.phonetic,
            meaning: Number.isFinite(Number(parsedWidths.meaning))
              ? Number(parsedWidths.meaning)
              : prev.meaning,
            time: Number.isFinite(Number(parsedWidths.time))
              ? Number(parsedWidths.time)
              : prev.time,
          }));
        }
      }

      const rawDashboardWidth = window.localStorage.getItem("tts_dashboard_width_percent");
      if (rawDashboardWidth) {
        const v = Number(rawDashboardWidth);
        if (Number.isFinite(v)) {
          const clamped = Math.min(100, Math.max(40, v));
          setDashboardWidthPercent(clamped);
        }
      }
    } catch (e) {
      console.warn("[TTS] Failed to load dashboard data:", e);
    }
  }, []);

  // localStorage 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let settings: any = null;
      try {
        const settingsRaw = window.localStorage.getItem("tts_settings");
        if (settingsRaw) settings = JSON.parse(settingsRaw);
      } catch (e) {
        console.warn("[TTS] Failed to parse tts_settings:", e);
      }

      const stored = window.localStorage.getItem("tts_script_text");
      if (stored != null) {
        setText(stored);
        const trimmed = stored.trim();
        if (trimmed) {
          const scenes = parseScript(trimmed);
          setParsedScenes(scenes);
          let nextSelected: number | null = scenes.length ? scenes[0].id : null;
          if (
            settings &&
            typeof settings.selectedSceneId === "number" &&
            scenes.some((s) => s.id === settings.selectedSceneId)
          ) {
            nextSelected = settings.selectedSceneId;
          }
          setSelectedSceneId(nextSelected);
        }
      }

      if (settings) {
        if (typeof settings.englishRate === "number") setEnglishRate(settings.englishRate);
        if (typeof settings.koreanRate === "number") setKoreanRate(settings.koreanRate);
        if (typeof settings.volume === "number") setVolume(settings.volume);
        if (typeof settings.repeatCount === "number") setRepeatCount(settings.repeatCount);
        if (typeof settings.autoPauseEnabled === "boolean") setAutoPauseEnabled(settings.autoPauseEnabled);
        if (typeof settings.autoPauseSeconds === "number") setAutoPauseSeconds(settings.autoPauseSeconds);
        if (settings.autoPauseLevel === 1 || settings.autoPauseLevel === 2) setAutoPauseLevel(settings.autoPauseLevel);
        if (typeof settings.bilingualMode === "boolean") setBilingualMode(settings.bilingualMode);
        if (typeof settings.englishVoiceName === "string") setEnglishVoiceName(settings.englishVoiceName);
        if (typeof settings.koreanVoiceName === "string") setKoreanVoiceName(settings.koreanVoiceName);
        if (typeof settings.highlightLookedWords === "boolean") setHighlightLookedWords(settings.highlightLookedWords);
        if (typeof settings.highlightBold === "boolean") setHighlightBold(settings.highlightBold);
        if (typeof settings.highlightColor === "string") setHighlightColor(settings.highlightColor);
        if (typeof settings.highlightTextColor === "string") setHighlightTextColor(settings.highlightTextColor);
        voiceInitializedRef.current = true;
      }
    } catch (e) {
      console.warn("[TTS] Failed to load from localStorage:", e);
    } finally {
      setStorageReady(true);
    }
  }, [setEnglishVoiceName, setKoreanVoiceName, voiceInitializedRef]);

  // 스크립트 자동 저장
  useEffect(() => {
    if (typeof window === "undefined" || !storageReady) return;
    try {
      window.localStorage.setItem("tts_script_text", text);
    } catch (e) {
      console.warn("[TTS] Failed to save script:", e);
    }
  }, [text, storageReady]);

  // 설정 자동 저장
  useEffect(() => {
    if (typeof window === "undefined" || !storageReady) return;
    try {
      const settings = {
        selectedSceneId,
        englishRate,
        koreanRate,
        volume,
        repeatCount,
        autoPauseEnabled,
        autoPauseSeconds,
        autoPauseLevel,
        bilingualMode,
        englishVoiceName,
        koreanVoiceName,
        highlightLookedWords,
        highlightBold,
        highlightColor,
        highlightTextColor,
      };
      window.localStorage.setItem("tts_settings", JSON.stringify(settings));
    } catch (e) {
      console.warn("[TTS] Failed to save settings:", e);
    }
  }, [
    selectedSceneId,
    englishRate,
    koreanRate,
    volume,
    repeatCount,
    autoPauseEnabled,
    autoPauseSeconds,
    bilingualMode,
    englishVoiceName,
    koreanVoiceName,
    highlightLookedWords,
    highlightBold,
    highlightColor,
    storageReady,
  ]);

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const fileArray = Array.from(files);
      const txtFiles = fileArray.filter((f) =>
        f.name.toLowerCase().endsWith(".txt"),
      );
      const krtFiles = fileArray.filter((f) =>
        f.name.toLowerCase().endsWith(".krt"),
      );

      if (!txtFiles.length) {
        alert(".txt 대본 파일을 선택해 주세요.");
        return;
      }

      const txtFile = txtFiles[0];
      const base = stripExtension(txtFile.name);

      let krtFile: File | null = null;
      if (krtFiles.length) {
        const matched = krtFiles.find(
          (f) => stripExtension(f.name) === base,
        );
        if (matched) {
          krtFile = matched;
        } else {
          // 번역 파일 이름이 다르면 번역은 건너뛰고 영어 대본만 로드
          alert(
            "같은 이름의 .krt 번역 파일을 찾지 못해, 번역 없이 영어 대본만 불러옵니다.",
          );
        }
      }

      const readAsText = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(typeof reader.result === "string" ? reader.result : "");
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file, "utf-8");
        });

      const txtContent = await readAsText(txtFile);
      const trimmedScript = txtContent.trim();
      if (!trimmedScript) {
        alert("대본 파일이 비어 있습니다.");
        return;
      }

      const englishScenes = parseScript(trimmedScript);
      setText(trimmedScript);
      setParsedScenes(englishScenes);
      setSelectedSceneId(englishScenes.length ? englishScenes[0].id : null);

      if (krtFile) {
        const krtContent = await readAsText(krtFile);
        const koreanScenes = parseScript(krtContent.trim());
        const alignment = analyzeScriptAlignment(englishScenes, koreanScenes);
        if (!alignment.ok) {
          console.warn("[TTS] Script alignment check:", alignment.message);
          alert(
            "경고: 원문(.txt)과 번역(.krt)의 Scene/대사 구조에 차이가 있습니다.\n" +
              "일부 절에서는 영한대역이 표시되지 않을 수 있습니다.\n" +
              "자세한 내용은 개발자 콘솔(DevTools)을 확인해 주세요.",
          );
        } else {
          console.log("[TTS] Script alignment OK:", alignment.message);
        }
        setSentenceTranslations(
          buildSentenceTranslationsFromScripts(englishScenes, koreanScenes),
        );
      } else {
        setSentenceTranslations({});
      }
      setCurrentSentenceKey(null);
      currentPlayTypeRef.current = null;
      scenePlayActiveRef.current = false;
      linePlayActiveRef.current = null;
      setCurrentScriptFilename(txtFile.name);
      registerActivity();
    } catch (err) {
      console.error("[TTS] Failed to open script files:", err);
      alert("파일을 여는 중 오류가 발생했습니다.");
    } finally {
      // 같은 파일을 다시 선택할 수 있도록 초기화
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleClear = () => {
    registerActivity();
    setText("");
    setParsedScenes([]);
    setSentenceTranslations({});
    setSelectedSceneId(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("tts_script_text");
        window.localStorage.removeItem("tts_settings");
      } catch {
        // ignore
      }
    }
  };

  const handleSave = () => {
    registerActivity();
    const trimmed = text.trim();
    if (!trimmed) {
      alert("저장할 텍스트가 없습니다.");
      return;
    }
    const scenes = parseScript(trimmed);
    setParsedScenes(scenes);
    setSelectedSceneId(scenes.length ? scenes[0].id : null);
    // 스크립트가 바뀌면 이전 영한 대역은 모두 무효이므로 초기화
    setSentenceTranslations({});
  };

  const handleSaveScriptAs = () => {
    registerActivity();
    const trimmed = text.trim();
    if (!trimmed) {
      alert("저장할 대본이 없습니다.");
      return;
    }
    const baseName =
      currentScriptFilename && stripExtension(currentScriptFilename);
    const suggested = baseName || "script";
    const input = window.prompt(
      "저장할 파일 이름을 입력하세요 (.txt 생략 가능)",
      suggested,
    );
    if (!input) return;
    const filename = input.toLowerCase().endsWith(".txt")
      ? input
      : `${input}.txt`;
    downloadTextFile(filename, trimmed);
  };

  const handleSaveWordLogsAs = () => {
    registerActivity();
    if (!wordLogs.length) {
      alert("저장할 단어장이 없습니다.");
      return;
    }
    const header = "word\tphonetic\tmeaning\ttimestamp";
    const lines = wordLogs.map((w) =>
      [
        w.word || "",
        w.phonetic || "",
        (w.meaning || "").replace(/\s+/g, " "),
        w.timestamp || "",
      ].join("\t"),
    );
    const content = [header, ...lines].join("\n");
    const baseName =
      currentScriptFilename && stripExtension(currentScriptFilename);
    const filename = `${baseName || "vocab"}_단어장.tsv`;
    downloadTextFile(filename, content);
  };

  const startWordPronounceLoop = (word: string, options?: { log?: boolean }) => {
    registerActivity();
    const shouldLog = options?.log ?? true;
    const trimmed = word.trim();
    if (!trimmed) return;

    if (
      wordLoopRef.current &&
      wordLoopRef.current.active &&
      wordLoopRef.current.word === trimmed
    ) {
      return;
    }

    wordLoopRef.current = { active: true, word: trimmed };

    // 발음 버튼 기준 단어 기록 (왼쪽 화면에서만 사용, shouldLog=true 일 때만)
    if (shouldLog) {
      (async () => {
        try {
          const detail = await lookupWordDetail(trimmed);
          const rawMeaning = (detail.koreanDefs && detail.koreanDefs.length
            ? detail.koreanDefs.join("; ")
            : (detail.englishDefs || []).join("; ")) || undefined;
          const meaning = formatMeaningWithPosNewline(rawMeaning);
          const entry: WordLogEntry = {
            word: trimmed,
            phonetic: detail.phonetic || undefined,
            meaning,
            timestamp: new Date().toISOString(),
          };
          setWordLogs((prev) => {
            pushWordLogsHistory(prev);
            const filtered = prev.filter(
              (p) => p.word.toLowerCase() !== entry.word.toLowerCase(),
            );
            const next = [entry, ...filtered].slice(0, 300);
            if (typeof window !== "undefined") {
              try {
                window.localStorage.setItem("tts_word_logs", JSON.stringify(next));
              } catch (e) {
                console.warn("[TTS] Failed to save word logs:", e);
              }
            }
            return next;
          });
        } catch {
          // ignore lookup error
        }
      })();
    }

    const speakOnce = () => {
      const loop = wordLoopRef.current;
      if (!loop || !loop.active || loop.word !== trimmed) return;

      speakMessage(trimmed, "en", {
        repeatOverride: 1,
        onDone: () => {
          const again = wordLoopRef.current;
          if (again && again.active && again.word === trimmed) {
            speakOnce();
          }
        },
      });
    };

    speakOnce();
  };

  const stopWordPronounceLoop = () => {
    if (wordLoopRef.current && wordLoopRef.current.active) {
      wordLoopRef.current.active = false;
      // 발음 듣기 버튼을 떼는 시점도 학습 이벤트로 기록하여
      // 마지막 활동 시간 기준 1분 룰이 올바르게 적용되도록 함
      registerActivity();
    } else if (wordLoopRef.current) {
      wordLoopRef.current.active = false;
    }
  };

  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speakWithAutoPause = (
    msg: string,
    mode: "en" | "ko" = "en",
    onDone?: () => void,
  ) => {
    const trimmed = msg.trim();
    if (!trimmed) return;

    if (!autoPauseEnabled || autoPauseSeconds <= 0) {
      // AutoPause OFF: 모든 슬래시는 단순 공백으로 처리
      const cleaned = trimmed.replace(/\/+?/g, " ");
      speakMessage(cleaned, mode, {
        onDone,
      });
      return;
    }
    const PAUSE_TOKEN = "__TTS_PAUSE__";

    let work = trimmed;

    // Level 1: '/' 와 '//' 모두 Pause 지점으로 사용
    // Level 2: '//' 만 Pause, '/' 는 단순 공백으로 처리
    if (autoPauseLevel === 1) {
      work = work
        .replace(/\s*\/\/\s*/g, ` ${PAUSE_TOKEN} `)
        .replace(/\s*\/\s*/g, ` ${PAUSE_TOKEN} `);
    } else {
      work = work
        .replace(/\s*\/\/\s*/g, ` ${PAUSE_TOKEN} `)
        .replace(/\s*\/\s*/g, " ");
    }

    const segments = work
      .split(PAUSE_TOKEN)
      .map((s) => s.replace(/\/+?/g, " ").trim())
      .filter(Boolean);

    if (!segments.length) {
      const cleaned = trimmed.replace(/\/+?/g, " ");
      speakMessage(cleaned, mode, {
        onDone,
      });
      return;
    }

    const pauseMs = autoPauseSeconds * 1000;
    let index = 0;

    const speakNext = () => {
      if (index >= segments.length) {
        if (onDone) onDone();
        return;
      }
      const segment = segments[index++];
      const isLast = index >= segments.length;

      speakMessage(segment, mode, {
        onDone: () => {
          if (!isLast) {
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = setTimeout(speakNext, pauseMs);
          } else if (onDone) {
            onDone();
          }
        },
      });
    };

    speakNext();
  };

  // 학습 시간: 이벤트 기반 1분 룰 + 씬 Play 예외
  useEffect(() => {
    if (typeof window === "undefined") return;

    const CHECK_INTERVAL = 5000;

    const id = window.setInterval(() => {
      if (!currentSessionStartRef.current || !lastActivityRef.current) return;

      const now = Date.now();

      // 씬 Play 중이고 실제 발화가 진행 중이면 세션을 유지
      if (scenePlayActiveRef.current && speaking) {
        lastActivityRef.current = now;
        return;
      }

      const idleMs = now - lastActivityRef.current;
      if (idleMs >= 60_000) {
        const start = currentSessionStartRef.current;
        const end = lastActivityRef.current + 60_000;
        currentSessionStartRef.current = null;
        lastActivityRef.current = null;
        scenePlayActiveRef.current = false;

        if (end > start) {
          const session: StudySession = { start, end };
          setStudySessions((prev) => {
            const next = [...prev, session];
            try {
              window.localStorage.setItem("tts_study_sessions", JSON.stringify(next));
            } catch (e) {
              console.warn("[TTS] Failed to save study sessions:", e);
            }
            return next;
          });
        }
      }
    }, CHECK_INTERVAL);

    return () => {
      window.clearInterval(id);
    };
  }, [speaking]);

  // speaking 상태 변화를 추적만 하고, Play 종료 처리/강조 해제는
  // 씬/라인/절 Play 각각의 onDone 콜백에서 직접 수행한다.
  useEffect(() => {
    lastSpeakingRef.current = speaking;
  }, [speaking]);

  const { totalSeconds, todaySeconds, studyDays } = useMemo(() => {
    const nowMs = nowTick;
    const todayStr = new Date(nowMs).toISOString().slice(0, 10);
    let total = 0;
    let today = 0;
    const secondsByDay: Record<string, number> = {};

    const allSessions: StudySession[] = [...studySessions];

    // 진행 중인 세션이 있다면, 마지막 활동 시점에서 최대 1분까지만 연장해서 반영
    if (currentSessionStartRef.current) {
      let end = nowMs;
      if (lastActivityRef.current) {
        const endCandidate = lastActivityRef.current + 60_000;
        end = Math.min(nowMs, endCandidate);
      }
      if (end > currentSessionStartRef.current) {
        allSessions.push({ start: currentSessionStartRef.current, end });
      }
    }

    for (const s of allSessions) {
      const dur = Math.max(0, (s.end - s.start) / 1000);
      total += dur;
      const d = new Date(s.start);
      const dStr = d.toISOString().slice(0, 10);
      if (dStr === todayStr) today += dur;
      secondsByDay[dStr] = (secondsByDay[dStr] || 0) + dur;
    }
    let days = 0;
    const MIN_SECONDS_PER_DAY = 5 * 60; // 5분 이상 학습한 날만 카운트
    for (const key of Object.keys(secondsByDay)) {
      if (secondsByDay[key] >= MIN_SECONDS_PER_DAY) {
        days += 1;
      }
    }
    return { totalSeconds: total, todaySeconds: today, studyDays: days };
  }, [studySessions, nowTick]);

  const totalHM = getHourMinuteParts(totalSeconds);
  const todayHM = getHourMinuteParts(todaySeconds);

  const { totalWords, todayWords } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    let today = 0;

    for (const log of wordLogs) {
      const d = new Date(log.timestamp);
      if (!Number.isNaN(d.getTime())) {
        const dStr = d.toISOString().slice(0, 10);
        if (dStr === todayStr) today += 1;
      }
    }

    return { totalWords: wordLogs.length, todayWords: today };
  }, [wordLogs]);

  // 총/오늘 학습 시간 초기화
  const handleResetStudyTime = () => {
    registerActivity();
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "총 학습 시간과 오늘 학습 시간을 모두 0으로 초기화할까요?",
    );
    if (!ok) return;

    setStudySessions([]);
    currentSessionStartRef.current = null;
    lastActivityRef.current = null;
    scenePlayActiveRef.current = false;

    try {
      window.localStorage.removeItem("tts_study_sessions");
    } catch (e) {
      console.warn("[TTS] Failed to clear study sessions:", e);
    }
  };

  // 오른쪽 단어장에서 조회된 단어 Set (왼쪽 대사창 강조용)
  const lookedWordSet = useMemo(() => {
    const set = new Set<string>();
    for (const log of wordLogs) {
      if (log.word) {
        set.add(log.word.toLowerCase());
      }
    }
    return set;
  }, [wordLogs]);

  const toggleColumn = (key: keyof ColumnVisibility) => {
    registerActivity();
    setColumnVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("tts_column_visibility", JSON.stringify(next));
        } catch (e) {
          console.warn("[TTS] Failed to save column visibility:", e);
        }
      }
      return next;
    });
  };

  const updateColumnWidth = (key: keyof typeof columnWidths, width: number) => {
    const clamped = Math.min(400, Math.max(60, width));
    registerActivity();
    setColumnWidths((prev) => {
      const next = { ...prev, [key]: clamped };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("tts_column_widths", JSON.stringify(next));
        } catch (e) {
          console.warn("[TTS] Failed to save column widths:", e);
        }
      }
      return next;
    });
  };

  const handleUiPopupDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const offsetX = e.clientX - uiPopupPos.x;
    const offsetY = e.clientY - uiPopupPos.y;
    uiPopupDragRef.current = { offsetX, offsetY };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!uiPopupDragRef.current) return;
      let x = moveEvent.clientX - uiPopupDragRef.current.offsetX;
      let y = moveEvent.clientY - uiPopupDragRef.current.offsetY;

      const maxX = Math.max(0, window.innerWidth - 280); // popup width ~280px
      const maxY = Math.max(0, window.innerHeight - 160); // approximate popup height

      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x > maxX) x = maxX;
      if (y > maxY) y = maxY;

      setUiPopupPos({ x, y });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      uiPopupDragRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelsContainerRef.current) return;
    e.preventDefault();

     // 레이아웃 조절도 학습 이벤트로 간주
     registerActivity();

    const container = panelsContainerRef.current;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startLeftPx = (leftWidthPercent / 100) * rect.width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newLeftPx = startLeftPx + delta;
      let nextPercent = (newLeftPx / rect.width) * 100;
      nextPercent = Math.min(80, Math.max(35, nextPercent));
      setLeftWidthPercent(nextPercent);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("tts_left_width_percent", String(nextPercent));
        } catch (error) {
          console.warn("[TTS] Failed to save left width percent:", error);
        }
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleStopAll = () => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    setCurrentSentenceKey(null);
    scenePlayActiveRef.current = false;
    linePlayActiveRef.current = null;
     currentPlayTypeRef.current = null;
    handleStop();
  };

  // 씬 전체를 문장 단위로 순차 재생하며, 현재 말하는 절만 강조
  const handleScenePlay = () => {
    if (!currentScene) return;

    handleStopAll();
    registerActivity({ scenePlay: true });
    currentPlayTypeRef.current = "scene";

    const units: { key: string; text: string }[] = [];
    for (const line of currentScene.lines) {
      line.sentences.forEach((sentence, idx) => {
        const key = `${line.id}-${idx}`;
        const text = idx === 0 ? `${line.speaker}: ${sentence}` : sentence;
        units.push({ key, text });
      });
    }
    if (!units.length) return;

    let index = 0;
    const playNext = () => {
      if (currentPlayTypeRef.current !== "scene") return;
      if (index >= units.length) return;
      const { key, text } = units[index++];
      setCurrentSentenceKey(key);
      speakWithAutoPause(text, "en", () => {
        if (currentPlayTypeRef.current !== "scene") return;

        if (index < units.length) {
          // 다음 절 재생
          playNext();
        } else {
          // 씬 Play 가 자연스럽게 끝난 시점
          registerActivity();
          currentPlayTypeRef.current = null;
          scenePlayActiveRef.current = false;
          setCurrentSentenceKey(null);
        }
      });
    };

    playNext();
  };

  // 특정 캐릭터 라인의 모든 절을 순차 재생하며, 현재 절만 강조
  const handleLinePlay = (line: ParsedScene["lines"][number]) => {
    handleStopAll();
    registerActivity();
    currentPlayTypeRef.current = "line";
    linePlayActiveRef.current = line.id;

    const units = line.sentences.map((sentence, idx) => ({
      key: `${line.id}-${idx}`,
      text: sentence,
    }));
    if (!units.length) return;

    let index = 0;
    const playNext = () => {
      if (currentPlayTypeRef.current !== "line") return;
      if (index >= units.length) return;
      const { key, text } = units[index++];
      setCurrentSentenceKey(key);
      speakWithAutoPause(text, "en", () => {
        if (currentPlayTypeRef.current !== "line") return;

        if (index < units.length) {
          // 다음 절 재생
          playNext();
        } else {
          // 캐릭터 라인 Play 가 자연스럽게 끝난 시점
          registerActivity();
          currentPlayTypeRef.current = null;
          linePlayActiveRef.current = null;
          setCurrentSentenceKey(null);
        }
      });
    };

    playNext();
  };

  const handleStartPronounceRecord = async () => {
    if (typeof window === "undefined" || isRecording) return;

    if (!practiceTarget) {
      alert("위 표에서 먼저 연습할 단어를 선택해 주세요.");
      return;
    }

    registerActivity();

    const nav = window.navigator as Navigator & {
      mediaDevices?: MediaDevices;
    };

    if (!nav.mediaDevices || !nav.mediaDevices.getUserMedia) {
      alert("이 브라우저에서는 마이크 녹음을 지원하지 않습니다.");
      return;
    }

    try {
      const stream = await nav.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        setRecordingStatus("녹음 완료 (분석 준비중)");

        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        void blob; // 현재는 유사도 알고리즘 미구현
        setLastPronunciationScore(null);
        setLastProsodyScore(null);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingStatus("녹음 중...");
      setLastPronunciationScore(null);
      setLastProsodyScore(null);
    } catch (e) {
      console.warn("[TTS] Failed to start recording:", e);
      setRecordingStatus("마이크 사용 불가");
      setIsRecording(false);
    }
  };

  const handleStopPronounceRecord = () => {
    if (mediaRecorderRef.current && isRecording) {
      registerActivity();
      mediaRecorderRef.current.stop();
    }
  };

  // 단어장에서 외운 단어 삭제 → 단어장/왼쪽 대사창 모두 Normal 처리
  const handleDeleteWord = (word: string) => {
    registerActivity();
    setWordLogs((prev) => {
      if (!prev.length) return prev;
      const prevSnapshot = [...prev];
      const next = prev.filter(
        (p) => p.word.toLowerCase() !== word.toLowerCase(),
      );
      if (next.length === prev.length) return prev;
      pushWordLogsHistory(prevSnapshot);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("tts_word_logs", JSON.stringify(next));
        } catch (e) {
          console.warn("[TTS] Failed to save word logs after delete:", e);
        }
      }
      return next;
    });

    if (
      practiceTarget &&
      practiceTarget.word &&
      practiceTarget.word.toLowerCase() === word.toLowerCase()
    ) {
      setPracticeTarget(null);
    }
  };

  // 영한 대역 모드가 켜졌을 때, 현재 Scene의 모든 절 번역을 준비
  useEffect(() => {
    if (!bilingualMode || !currentScene) return;

    const toTranslate: { key: string; sentence: string }[] = [];
    for (const line of currentScene.lines) {
      line.sentences.forEach((sentence, idx) => {
        const key = `${line.id}-${idx}`;
        if (!sentenceTranslations[key]) {
          toTranslate.push({ key, sentence });
        }
      });
    }

    if (!toTranslate.length) return;

    (async () => {
      for (const item of toTranslate) {
        const original = item.sentence.replace(/\s*\/\s*/g, " ");
        const translated = await translateToKorean(original);
        if (!translated) continue;
        setSentenceTranslations((prev) => {
          if (prev[item.key]) return prev; // 이미 번역된 경우 유지
          return { ...prev, [item.key]: translated };
        });
      }
    })();
  }, [bilingualMode, currentScene, sentenceTranslations]);

  const renderTextWithWordHover = (text: string, keyPrefix: string) => {
    return text.split(/(\s+)/).map((part, idx) => {
      if (part.match(/^\s+$/)) return part;
      const clean = part.replace(/[^A-Za-z']/g, "");
      if (!clean) return (
        <span key={`${keyPrefix}-${idx}`}>
          {part}
        </span>
      );

      return (
        <span
          key={`${keyPrefix}-${idx}`}
          className={
            "cursor-pointer hover:bg-yellow-100" +
            (highlightLookedWords && lookedWordSet.has(clean.toLowerCase()) && highlightBold
              ? " font-bold"
              : "")
          }
          style={
            highlightLookedWords && lookedWordSet.has(clean.toLowerCase())
              ? { color: highlightTextColor }
              : undefined
          }
          onMouseEnter={(e) => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
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

              // 사전 조회도 학습 이벤트로 기록
              registerActivity();

              const rawMeaning = (detail.koreanDefs && detail.koreanDefs.length
                ? detail.koreanDefs.join("; ")
                : (detail.englishDefs || []).join("; ")) || undefined;
              const meaning = formatMeaningWithPosNewline(rawMeaning);
              const entry: WordLogEntry = {
                word: clean,
                phonetic: detail.phonetic || undefined,
                meaning,
                timestamp: new Date().toISOString(),
              };
              setWordLogs((prev) => {
                pushWordLogsHistory(prev);
                const filtered = prev.filter(
                  (p) => p.word.toLowerCase() !== entry.word.toLowerCase(),
                );
                const next = [entry, ...filtered].slice(0, 300);
                if (typeof window !== "undefined") {
                  try {
                    window.localStorage.setItem("tts_word_logs", JSON.stringify(next));
                  } catch (e) {
                    console.warn("[TTS] Failed to save word logs:", e);
                  }
                }
                return next;
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
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-50 py-4">
      <div
        className="w-full bg-white rounded shadow p-4 space-y-4 flex flex-col min-h-[calc(100vh-2rem)]"
        style={{ maxWidth: `${containerWidth}px` }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.krt"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">TTS (대본 읽어주기)</h1>
          <div className="flex gap-2 text-xs">
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3"
                type="button"
                onClick={() => setFileMenuOpen((prev) => !prev)}
              >
                파일
              </Button>
              {fileMenuOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white border rounded shadow text-xs z-20">
                  <button
                    type="button"
                    className="block w-full text-left px-3 py-1.5 hover:bg-slate-100"
                    onClick={() => {
                      setFileMenuOpen(false);
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-3 py-1.5 hover:bg-slate-100"
                    onClick={() => {
                      setFileMenuOpen(false);
                      handleSaveScriptAs();
                    }}
                  >
                    Save As
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-3 py-1.5 hover:bg-slate-100"
                    onClick={() => {
                      setFileMenuOpen(false);
                      handleSaveWordLogsAs();
                    }}
                  >
                    Save 단어장 As
                  </button>
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3"
              type="button"
            >
              단어복습
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3"
              type="button"
            >
              단어게임
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3"
              type="button"
            >
              등록
            </Button>
            <Button
              size="sm"
              variant={uiPopupOpen ? "default" : "outline"}
              className="h-7 px-3"
              type="button"
              onClick={() => {
                setUiPopupOpen((prev) => !prev);
                registerActivity();
              }}
            >
              UI
            </Button>
          </div>
        </div>

        {/* 대시보드: 폭을 UI에서 조절, 왼쪽 정렬 Compact 박스 4개 (박스 폭은 내용에 맞춤) */}
        <div className="border rounded bg-white px-3 py-2 text-xs">
          <div className="flex justify-between items-start gap-3">
            <div
              className="inline-block"
              style={{
                width: `${dashboardWidthPercent}%`,
                minWidth: "260px",
                maxWidth: "100%",
              }}
            >
              <div className="flex flex-wrap items-stretch gap-2">
                <div className="border rounded px-2 py-1 flex flex-col justify-center">
                  <div className="text-[15px] text-gray-700">총 학습 시간</div>
                  <div className="text-[30px] font-semibold leading-tight">
                    <span>{totalHM.h}</span>
                    <span className="text-[14px] ml-1 mr-2">시간</span>
                    <span>{totalHM.m}</span>
                    <span className="text-[14px] ml-1">분</span>
                  </div>
                </div>
                <div className="border rounded px-2 py-1 flex flex-col justify-center">
                  <div className="text-[15px] text-gray-700">오늘 학습 시간</div>
                  <div className="text-[30px] font-semibold leading-tight">
                    <span>{todayHM.h}</span>
                    <span className="text-[14px] ml-1 mr-2">시간</span>
                    <span>{todayHM.m}</span>
                    <span className="text-[14px] ml-1">분</span>
                  </div>
                </div>
                <div className="border rounded px-2 py-1 flex flex-col justify-center">
                  <div className="text-[15px] text-gray-700">학습 일 수</div>
                  <div className="text-[30px] font-semibold leading-tight">
                    <span>{studyDays}</span>
                    <span className="text-[14px] ml-1">일</span>
                  </div>
                </div>
                <div className="border rounded px-2 py-1 flex flex-col justify-center">
                  <div className="text-[15px] text-gray-700">총 학습 단어 수</div>
                  <div className="text-[30px] font-semibold leading-tight">{totalWords}</div>
                </div>
                <div className="border rounded px-2 py-1 flex flex-col justify-center">
                  <div className="text-[15px] text-gray-700">오늘 학습 단어 수</div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[30px] font-semibold leading-tight">{todayWords}</div>
                    <div className="text-[11px] text-gray-500">
                      {formatDurationHMS(todaySeconds)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs whitespace-nowrap self-center"
              type="button"
              onClick={handleResetStudyTime}
            >
              학습 시간 초기화
            </Button>
          </div>
        </div>

        <div ref={panelsContainerRef} className="flex flex-1 items-stretch gap-0">
          {/* 왼쪽: 기존 TTS UI */}
          <div
            className="border rounded p-3 space-y-3 shrink-0"
            style={{ width: `${leftWidthPercent}%` }}
          >
            <TTSControls
              volume={volume}
              onVolumeChange={setVolume}
              englishRate={englishRate}
              onEnglishRateChange={setEnglishRate}
              koreanRate={koreanRate}
              onKoreanRateChange={setKoreanRate}
              englishVoiceName={englishVoiceName}
              onEnglishVoiceChange={setEnglishVoiceName}
              koreanVoiceName={koreanVoiceName}
              onKoreanVoiceChange={setKoreanVoiceName}
              englishVoices={englishVoices}
              koreanVoices={koreanVoices}
            />

            <div className="flex items-center justify-between text-sm text-gray-600 mb-1 mt-2">
              <div className="flex items-center gap-2">
                <span>Scene</span>
                <select
                  className="border rounded px-1 py-0.5 text-sm"
                  value={currentScene ? currentScene.id : ""}
                  onChange={(e) => setSelectedSceneId(Number(e.target.value) || null)}
                  disabled={!parsedScenes.length}
                >
                  {parsedScenes.length === 0 && <option value="">(저장 후 자동 생성)</option>}
                  {parsedScenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {`Scene ${s.sceneNumber}${s.title ? ": " + s.title : ""}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border rounded p-2 space-y-2 flex-1 overflow-y-auto">
              {currentScene ? (
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <div>{`Scene ${currentScene.sceneNumber}: ${currentScene.title || ""}`}</div>
                      <div className="flex items-center gap-2 text-xs font-normal">
                        <Button
                          size="sm"
                          variant={bilingualMode ? "default" : "outline"}
                          className={bilingualMode ? "h-7 px-3 text-xs bg-sky-600 text-white" : "h-7 px-3 text-xs"}
                          onClick={() => {
                            setBilingualMode((prev) => !prev);
                            registerActivity();
                          }}
                        >
                          영한대역
                        </Button>
                        <Button
                          size="sm"
                          variant={autoPauseEnabled ? "default" : "outline"}
                          className={autoPauseEnabled ? "h-7 px-3 text-xs bg-blue-500 text-white" : "h-7 px-3 text-xs"}
                          onClick={() => {
                            setAutoPauseEnabled((prev) => !prev);
                            registerActivity();
                          }}
                        >
                          AutoPause
                        </Button>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span>Level:</span>
                            <select
                              className="border rounded px-1 py-0.5 text-xs"
                              value={autoPauseLevel}
                              onChange={(e) => {
                                const v = Number(e.target.value) === 2 ? 2 : 1;
                                setAutoPauseLevel(v as 1 | 2);
                                registerActivity();
                              }}
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Pause:</span>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              className="w-16 border rounded px-1 py-0.5 text-xs"
                              value={autoPauseSeconds}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setAutoPauseSeconds(Number.isFinite(v) && v >= 0 ? v : 0);
                                registerActivity();
                              }}
                            />
                            <span>초</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm font-normal">
                      <div className="flex items-center gap-1">
                        <span>재생 횟수:</span>
                        <select
                          className="border rounded px-1 py-0.5 text-sm"
                          value={repeatCount}
                          onChange={(e) => {
                            setRepeatCount(Number(e.target.value) || 1);
                            registerActivity();
                          }}
                        >
                          {[1, 3, 5, 7, 9].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          className="h-7 px-3 text-sm"
                          onClick={() => {
                            // 씬 전체를 절 단위로 순차 재생 (현재 절만 강조)
                            handleScenePlay();
                          }}
                        >
                          씬 Play
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-3 text-sm"
                          onClick={() => {
                            registerActivity();
                            handleStopAll();
                          }}
                        >
                          Stop
                        </Button>
                      </div>
                    </div>
                  </div>

                  {currentScene.lines.map((line) => {
                    return (
                      <div key={line.id} className="border rounded p-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-sm">{line.speaker}:</div>
                          <Button
                            size="sm"
                            className="h-7 px-3 text-sm"
                            onClick={() => {
                              // 현재 재생을 즉시 중단 후 캐릭터 라인 전체를 절 단위로 재생
                              handleLinePlay(line);
                            }}
                          >
                            캐릭터 Play
                          </Button>
                        </div>

                        <div className="space-y-1">
                          {line.sentences.map((sentence, idx) => {
                            const key = `${line.id}-${idx}`;

                            let displaySentence: string;
                            if (!autoPauseEnabled) {
                              // AutoPause OFF: 모든 슬래시 제거하고 자연스럽게 표시
                              displaySentence = sentence.replace(/\/+?/g, " ");
                            } else if (autoPauseLevel === 1) {
                              // Level 1: '/' 와 '//' 모두 '/' 로 렌더
                              displaySentence = sentence
                                .replace(/\s*\/\/\s*/g, " / ")
                                .replace(/\s*\/\s*/g, " / ");
                            } else {
                              // Level 2: '//' 만 '/' 로 렌더, 단일 '/' 는 제거
                              const D_TOKEN = "__D_SLASH__";
                              displaySentence = sentence
                                .replace(/\s*\/\/\s*/g, ` ${D_TOKEN} `) // 우선 '//' 를 토큰으로 표시
                                .replace(/\s*\/\s*/g, " ") // 단일 '/' 는 제거
                                .replace(new RegExp(D_TOKEN, "g"), " /"); // 토큰만 실제 '/' 로 복원
                            }
                            const rawTranslation = sentenceTranslations[key] || "";
                            const cleanedTranslation = rawTranslation
                              ? rawTranslation.replace(/\/+?/g, " ").trim()
                              : "";
                            const isActiveSentence = currentSentenceKey === key;

                            return (
                              <div key={key} className="space-y-1 text-sm">
                                <div className="flex items-start gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 px-3 text-xs mt-0.5"
                                    onClick={() => {
                                      // 현재 재생을 즉시 중단 후 절 Play
                                      handleStopAll();
                                      registerActivity();
                                      currentPlayTypeRef.current = "sentence";
                                      setCurrentSentenceKey(key);
                                      const msg = sentence;
                                      speakWithAutoPause(msg, "en", () => {
                                        if (currentPlayTypeRef.current !== "sentence") return;

                                        // 개별 절 Play 가 자연스럽게 끝난 시점
                                        registerActivity();
                                        currentPlayTypeRef.current = null;
                                        setCurrentSentenceKey(null);
                                      });
                                    }}
                                  >
                                    절 Play
                                  </Button>
                                  <div
                                    className={
                                      "flex-1 border rounded px-3 py-2 whitespace-pre-wrap " +
                                      (isActiveSentence ? "bg-yellow-100" : "bg-slate-50")
                                    }
                                  >
                                    {renderTextWithWordHover(displaySentence, key)}
                                  </div>
                                </div>
                                {bilingualMode && cleanedTranslation && (
                                  <div className="pl-16 ml-[20px] text-xs text-blue-600 whitespace-pre-wrap">
                                    {cleanedTranslation}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {hoverPopup && <WordHoverPopup {...hoverPopup} />}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  저장된 Scene 이 없습니다. 위에 스크립트를 입력하고 저장을 눌러 주세요.
                </div>
              )}
            </div>
          </div>

          {/* 가운데 드래그 핸들 */}
          <div
            className="w-3 mx-1 bg-slate-300 hover:bg-slate-500 cursor-col-resize rounded"
            onMouseDown={handleDragStart}
          />
          {/* 오른쪽: 새 Box (가로 조절 가능) */}
          <div
            className="border rounded p-3 bg-slate-50 shrink-0 flex-1 relative overflow-visible"
            style={{ width: `${100 - leftWidthPercent}%` }}
          >
            {/* UI 설정 팝업 (이동 가능) */}
            {uiPopupOpen && (
              <div
                className="fixed z-30 bg-white border rounded shadow-lg text-xs w-[280px]"
                style={{ left: uiPopupPos.x, top: uiPopupPos.y }}
              >
                <div
                  className="flex items-center justify-between px-2 py-1 bg-slate-700 text-white cursor-move rounded-t"
                  onMouseDown={handleUiPopupDragStart}
                >
                  <span>UI 설정</span>
                  <button
                    type="button"
                    className="text-[11px] px-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUiPopupOpen(false);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="p-2 space-y-3">
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span>전체 폭 (px)</span>
                      <span>{containerWidth}</span>
                    </div>
                    <input
                      type="range"
                      min={800}
                      max={1400}
                      value={containerWidth}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 1200;
                        const clamped = Math.min(1400, Math.max(800, v));
                        setContainerWidth(clamped);
                        registerActivity();
                        if (typeof window !== "undefined") {
                          try {
                            window.localStorage.setItem(
                              "tts_container_width",
                              String(clamped),
                            );
                          } catch (err) {
                            console.warn("[TTS] Failed to save container width:", err);
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span>왼쪽 화면 폭 (%)</span>
                      <span>{leftWidthPercent.toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={35}
                      max={80}
                      value={leftWidthPercent}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 65;
                        const clamped = Math.min(80, Math.max(35, v));
                        setLeftWidthPercent(clamped);
                        registerActivity();
                        if (typeof window !== "undefined") {
                          try {
                            window.localStorage.setItem(
                              "tts_left_width_percent",
                              String(clamped),
                            );
                          } catch (err) {
                            console.warn("[TTS] Failed to save left width percent:", err);
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span>대시보드 폭 (%)</span>
                      <span>{dashboardWidthPercent.toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      value={dashboardWidthPercent}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 100;
                        const clamped = Math.min(100, Math.max(40, v));
                        setDashboardWidthPercent(clamped);
                        registerActivity();
                        if (typeof window !== "undefined") {
                          try {
                            window.localStorage.setItem(
                              "tts_dashboard_width_percent",
                              String(clamped),
                            );
                          } catch (err) {
                            console.warn(
                              "[TTS] Failed to save dashboard width percent:",
                              err,
                            );
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span>단어 표 높이 (px)</span>
                      <span>{wordTableMaxHeight}</span>
                    </div>
                    <input
                      type="range"
                      min={120}
                      max={800}
                      value={wordTableMaxHeight}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 220;
                        const clamped = Math.min(800, Math.max(120, v));
                        setWordTableMaxHeight(clamped);
                        registerActivity();
                        if (typeof window !== "undefined") {
                          try {
                            window.localStorage.setItem(
                              "tts_word_table_height",
                              String(clamped),
                            );
                          } catch (err) {
                            console.warn(
                              "[TTS] Failed to save word table height:",
                              err,
                            );
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1 text-[11px] border-t pt-2 mt-2">
                    <div className="font-semibold">찾아 본 단어 표시</div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        id="highlight-looked-words"
                        type="checkbox"
                        checked={highlightLookedWords}
                        onChange={(e) => {
                          setHighlightLookedWords(e.target.checked);
                          registerActivity();
                        }}
                      />
                      <label htmlFor="highlight-looked-words">강조 표시 사용</label>
                    </div>
                    {highlightLookedWords && (
                      <>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            id="highlight-bold"
                            type="checkbox"
                            checked={highlightBold}
                            onChange={(e) => {
                              setHighlightBold(e.target.checked);
                              registerActivity();
                            }}
                          />
                          <label htmlFor="highlight-bold">굵게 (Bold)</label>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span>폰트 색상:</span>
                          <input
                            type="color"
                            value={highlightTextColor}
                            onChange={(e) => {
                              setHighlightTextColor(e.target.value);
                              registerActivity();
                            }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] text-gray-500">
                          현재 재생 중인 문장은 노랑색 배경으로 표시됩니다.
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="toggle-time-column"
                      type="checkbox"
                      checked={columnVisibility.time}
                      onChange={() => toggleColumn("time")}
                    />
                    <label htmlFor="toggle-time-column">시간 열 표시</label>
                  </div>
                  <div className="border-t pt-2 space-y-1">
                    <div className="font-semibold text-[11px]">단어 표 Column 폭 조절 (px)</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-14">영단어</span>
                        <input
                          type="range"
                          min={60}
                          max={360}
                          value={columnWidths.word}
                          onChange={(e) => updateColumnWidth("word", Number(e.target.value) || 100)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-14">발음기호</span>
                        <input
                          type="range"
                          min={60}
                          max={360}
                          value={columnWidths.phonetic}
                          onChange={(e) =>
                            updateColumnWidth("phonetic", Number(e.target.value) || 110)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-14">사전 뜻</span>
                        <input
                          type="range"
                          min={80}
                          max={400}
                          value={columnWidths.meaning}
                          onChange={(e) =>
                            updateColumnWidth("meaning", Number(e.target.value) || 220)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-14">시간</span>
                        <input
                          type="range"
                          min={80}
                          max={300}
                          value={columnWidths.time}
                          onChange={(e) =>
                            updateColumnWidth("time", Number(e.target.value) || 160)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col h-full gap-3 text-sm">
              {/* 찾아 본 단어 로그 */}
              <div className="border rounded bg-white p-2 flex flex-col">
                <div className="font-semibold mb-2">찾아 본 단어</div>
                <div
                  className="border rounded overflow-y-auto"
                  style={{ maxHeight: `${wordTableMaxHeight}px` }}
                >
                  <table className="w-full text-xs table-fixed">
                    <colgroup>
                      <col style={{ width: `${columnWidths.word}px` }} />
                      <col style={{ width: `${columnWidths.phonetic}px` }} />
                      <col style={{ width: `${columnWidths.meaning}px` }} />
                      {columnVisibility.time && (
                        <col style={{ width: `${columnWidths.time}px` }} />
                      )}
                      <col style={{ width: "60px" }} />
                    </colgroup>
                    <thead className="bg-slate-100">
                      <tr>
                        <th
                          className={`px-2 py-1 text-left cursor-pointer ${
                            columnVisibility.word ? "" : "opacity-0"
                          }`}
                          onClick={() => toggleColumn("word")}
                        >
                          영단어
                        </th>
                        <th
                          className={`px-2 py-1 text-left cursor-pointer ${
                            columnVisibility.phonetic ? "" : "opacity-0"
                          }`}
                          onClick={() => toggleColumn("phonetic")}
                        >
                          발음기호
                        </th>
                        <th
                          className={`px-2 py-1 text-left cursor-pointer ${
                            columnVisibility.meaning ? "" : "opacity-0"
                          }`}
                          onClick={() => toggleColumn("meaning")}
                        >
                          사전 뜻
                        </th>
                        {columnVisibility.time && (
                          <th
                            className="px-2 py-1 text-left cursor-pointer"
                            onClick={() => toggleColumn("time")}
                          >
                            시간
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {wordLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={columnVisibility.time ? 5 : 4}
                            className="text-center text-gray-400 py-3"
                          >
                            아직 기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        wordLogs.map((log, idx) => (
                          <tr key={idx} className="border-t">
                            <td
                              className={`px-2 py-1 align-top cursor-pointer ${
                                columnVisibility.word ? "" : "opacity-0"
                              }`}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  e.preventDefault();
                                  setPracticeTarget(log);
                                  startWordPronounceLoop(log.word, { log: false });
                                }
                              }}
                              onMouseUp={(e) => {
                                if (e.button === 0) {
                                  e.preventDefault();
                                  stopWordPronounceLoop();
                                }
                              }}
                              onDoubleClick={() => {
                                registerActivity();
                                setWordLogs((prev) => {
                                  const index = prev.findIndex(
                                    (p) => p.word.toLowerCase() === log.word.toLowerCase(),
                                  );
                                  if (index <= 0) return prev;
                                  const prevSnapshot = [...prev];
                                  pushWordLogsHistory(prevSnapshot);
                                  const entry = prev[index];
                                  const rest = [
                                    ...prev.slice(0, index),
                                    ...prev.slice(index + 1),
                                  ];
                                  const next = [entry, ...rest];
                                  if (typeof window !== "undefined") {
                                    try {
                                      window.localStorage.setItem(
                                        "tts_word_logs",
                                        JSON.stringify(next),
                                      );
                                    } catch (e) {
                                      console.warn(
                                        "[TTS] Failed to save reordered word logs:",
                                        e,
                                      );
                                    }
                                  }
                                  return next;
                                });
                              }}
                            >
                              {log.word}
                            </td>
                            <td
                              className={`px-2 py-1 align-top cursor-pointer ${
                                columnVisibility.phonetic ? "" : "opacity-0"
                              }`}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  e.preventDefault();
                                  setPracticeTarget(log);
                                  startWordPronounceLoop(log.word, { log: false });
                                }
                              }}
                              onMouseUp={(e) => {
                                if (e.button === 0) {
                                  e.preventDefault();
                                  stopWordPronounceLoop();
                                }
                              }}
                              onDoubleClick={() => {
                                registerActivity();
                                setWordLogs((prev) => {
                                  const index = prev.findIndex(
                                    (p) => p.word.toLowerCase() === log.word.toLowerCase(),
                                  );
                                  if (index <= 0) return prev;
                                  const prevSnapshot = [...prev];
                                  pushWordLogsHistory(prevSnapshot);
                                  const entry = prev[index];
                                  const rest = [
                                    ...prev.slice(0, index),
                                    ...prev.slice(index + 1),
                                  ];
                                  const next = [entry, ...rest];
                                  if (typeof window !== "undefined") {
                                    try {
                                      window.localStorage.setItem(
                                        "tts_word_logs",
                                        JSON.stringify(next),
                                      );
                                    } catch (e) {
                                      console.warn(
                                        "[TTS] Failed to save reordered word logs:",
                                        e,
                                      );
                                    }
                                  }
                                  return next;
                                });
                              }}
                            >
                              {log.phonetic || ""}
                            </td>
                            <td
                              className={`px-2 py-1 align-top whitespace-pre-wrap ${
                                columnVisibility.meaning ? "" : "opacity-0"
                              }`}
                            >
                              {log.meaning || ""}
                            </td>
                            {columnVisibility.time && (
                              <td className="px-2 py-1 align-top whitespace-nowrap">
                                {formatTimestamp(log.timestamp)}
                              </td>
                            )}
                            <td className="px-2 py-1 align-top text-center">
                              <button
                                type="button"
                                className="text-[10px] text-red-600 underline"
                                onClick={() => handleDeleteWord(log.word)}
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-2 border rounded bg-white p-2 text-xs">
                <div className="font-semibold mb-2">단어 발음 연습</div>
                <div className="mb-1 text-[11px] text-gray-700">
                  선택된 단어: {practiceTarget ? practiceTarget.word : "(위 표에서 단어를 선택하세요)"}
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <Button
                    size="sm"
                    variant={isRecording ? "destructive" : "outline"}
                    className="h-7 px-3"
                    type="button"
                    onClick={() => {
                      if (isRecording) {
                        handleStopPronounceRecord();
                      } else {
                        void handleStartPronounceRecord();
                      }
                    }}
                  >
                    {isRecording ? "REC 중지" : "REC"}
                  </Button>
                  <div>
                    <span className="text-gray-700 mr-1">상태:</span>
                    <span>{recordingStatus}</span>
                  </div>
                </div>
                <div className="mt-1 text-gray-700">
                  <table className="w-full text-[11px] border border-slate-200 border-collapse">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2 py-1 text-left">항목</th>
                        <th className="px-2 py-1 text-right">점수</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1 border-t border-slate-200">발음 정확도</td>
                        <td className="px-2 py-1 border-t border-slate-200 text-right">
                          {lastPronunciationScore != null
                            ? `${(lastPronunciationScore * 100).toFixed(1)}%`
                            : "- (알고리즘 미구현)"}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 border-t border-slate-200">억양 유사도</td>
                        <td className="px-2 py-1 border-t border-slate-200 text-right">
                          {lastProsodyScore != null
                            ? `${(lastProsodyScore * 100).toFixed(1)}%`
                            : "- (알고리즘 미구현)"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  녹음은 브라우저에서 저장되지만, 실제 발음 유사도 분석을 하려면 추가 알고리즘이나 서버가 필요합니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
