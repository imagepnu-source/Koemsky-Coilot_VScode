"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";

interface TTSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
type ParsedLine = {
  id: number;
  speaker: string;
  message: string;
};

type ParsedScene = {
  id: number;
  sceneNumber: number;
  title: string;
  lines: ParsedLine[];
};

export function TTSDialog({ open, onOpenChange }: TTSDialogProps) {
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [lang, setLang] = useState<"auto" | "ko-KR" | "en-US">("auto");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string>("default");
  const [parsedScenes, setParsedScenes] = useState<ParsedScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const playModeRef = useRef<"idle" | "scene" | "all">("idle");
  const loopSceneRef = useRef(false);

  // 브라우저에서 사용 가능한 음성 목록 로드
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const list = synth.getVoices();
      if (list && list.length) {
        setVoices(list);
      }
    };

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const currentScene = useMemo(() => {
    if (!parsedScenes.length) return null;
    if (selectedSceneId == null) return parsedScenes[0];
    return parsedScenes.find((s) => s.id === selectedSceneId) ?? parsedScenes[0];
  }, [parsedScenes, selectedSceneId]);

  const filteredVoices = useMemo(() => {
    if (!voices.length) return [];
    if (lang === "auto") return voices;
    return voices.filter((v) => v.lang && v.lang.startsWith(lang));
  }, [voices, lang]);

  // 다이얼로그가 닫힐 때 읽기를 중단
  useEffect(() => {
    if (!open && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      playModeRef.current = "idle";
      loopSceneRef.current = false;
    }
  }, [open]);

  const parseScript = (raw: string): ParsedScene[] => {
    const lines = raw.split(/\r?\n/);
    const scenes: ParsedScene[] = [];
    let current: ParsedScene | null = null;
    let lineId = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const sceneMatch = /^Scene\s+(\d+)\s*:(.*)$/i.exec(trimmed);
      if (sceneMatch) {
        const num = parseInt(sceneMatch[1], 10) || scenes.length + 1;
        const title = (sceneMatch[2] || "").trim();
        current = {
          id: scenes.length + 1,
          sceneNumber: num,
          title,
          lines: [],
        };
        scenes.push(current);
        continue;
      }

      const dialogMatch = /^([^:]+):\s*(.*)$/.exec(trimmed);
      if (dialogMatch) {
        if (!current) {
          current = {
            id: scenes.length + 1,
            sceneNumber: scenes.length + 1,
            title: "",
            lines: [],
          };
          scenes.push(current);
        }
        current.lines.push({
          id: lineId++,
          speaker: dialogMatch[1].trim(),
          message: dialogMatch[2] || "",
        });
      }
    }

    return scenes;
  };

  const handleClear = () => {
    setText("");
    setParsedScenes([]);
    setSelectedSceneId(null);
  };

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      alert("저장할 텍스트가 없습니다.");
      return;
    }

    // 1) Supabase 에 저장 시도
    if (!supabase) {
      console.warn("[TTSDialog] Supabase client is not configured.");
    } else {
      try {
        const { data: sessionData, error: sErr } = await supabase.auth.getSession();
        if (sErr) {
          console.warn("[TTSDialog] Failed to get session:", sErr);
        }
        const accountId = sessionData?.session?.user?.id;
        if (!accountId) {
          console.warn("[TTSDialog] No logged-in user; skipping Supabase save.");
        } else {
          const payload = {
            user_id: accountId,
            script_text: trimmed,
            updated_at: new Date().toISOString(),
          } as any;

          const { error } = await supabase
            .from("tts_scripts")
            .upsert(payload, { onConflict: "user_id" });

          if (error) {
            console.warn("[TTSDialog] Failed to save TTS script to Supabase:", error);
            alert("Supabase 에 저장하는 중 오류가 발생했습니다. (로컬에서만 사용합니다)");
          } else {
            console.log("[TTSDialog] TTS script saved to Supabase.");
          }
        }
      } catch (e) {
        console.warn("[TTSDialog] Unexpected error while saving TTS script:", e);
      }
    }

    // 2) 로컬에서 씬/등장인물 구조로 파싱
    const scenes = parseScript(trimmed);
    setParsedScenes(scenes);
    setSelectedSceneId(scenes.length ? scenes[0].id : null);
  };

  const handlePlay = (mode: "scene" | "all") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("이 브라우저에서는 음성 읽기(TTS)를 지원하지 않습니다.");
      return;
    }
    const scene = currentScene;
    const sourceText = mode === "scene"
      ? (scene ? scene.lines.map((l) => `${l.speaker}: ${l.message}`).join(" \n") : "")
      : text;
    const trimmed = sourceText.trim();
    if (!trimmed) {
      alert("읽을 텍스트를 입력해 주세요.");
      return;
    }

    const speakOnce = (content: string) => {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(content);

      // 언어 선택: 자동/한국어/영어
      if (lang !== "auto") {
        utter.lang = lang;
      }

      // 음성 선택: 사용자가 고른 보이스 우선, 없으면 언어에 맞는 첫 번째 보이스
      try {
        const allVoices = window.speechSynthesis.getVoices?.() || [];
        let targetVoice: SpeechSynthesisVoice | undefined;

        if (voiceName && voiceName !== "default") {
          targetVoice = allVoices.find((v) => v.name === voiceName);
        }

        if (!targetVoice && lang !== "auto") {
          targetVoice = allVoices.find((v) => v.lang && v.lang.startsWith(lang));
        }

        if (targetVoice) {
          utter.voice = targetVoice;
        }
      } catch {
        // ignore voice selection errors
      }
      setSpeaking(true);
      utter.onend = () => {
        if (playModeRef.current === "scene" && loopSceneRef.current && mode === "scene") {
          const nextScene = currentScene;
          const repeatText = nextScene
            ? nextScene.lines.map((l) => `${l.speaker}: ${l.message}`).join(" \n")
            : "";
          if (repeatText) {
            speakOnce(repeatText);
            return;
          }
        }
        playModeRef.current = "idle";
        loopSceneRef.current = false;
        setSpeaking(false);
      };
      utter.onerror = () => {
        playModeRef.current = "idle";
        loopSceneRef.current = false;
        setSpeaking(false);
      };
      window.speechSynthesis.speak(utter);
    };

    try {
      if (mode === "scene") {
        playModeRef.current = "scene";
        loopSceneRef.current = true;
        speakOnce(trimmed);
      } else {
        playModeRef.current = "all";
        loopSceneRef.current = false;
        speakOnce(trimmed);
      }
    } catch (e) {
      console.warn("[TTSDialog] Failed to start speech:", e);
      alert("텍스트를 읽는 중 오류가 발생했습니다.");
      setSpeaking(false);
    }
  };

  const handleStop = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    // 일부 브라우저에서 cancel이 한 번에 안 먹는 경우가 있어
    // 여러 번 호출하여 강제로 중단을 시도합니다.
    try {
      synth.cancel();
      synth.cancel();
    } catch {
      // noop
    }
    playModeRef.current = "idle";
    loopSceneRef.current = false;
    setSpeaking(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) {
        handleStop();
      }
      onOpenChange(next);
    }}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>TTS (텍스트 읽어주기)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 flex-1 overflow-y-auto">
          {/* 상단: 스크립트 입력 박스 (높이 50px) + 지움/저장 */}
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"예)\nScene 1: A general region\nTom: Tom's message\nAnna: Anna's message"}
              className="h-[50px]"
            />
            <div className="flex justify-end gap-2 text-xs">
              <Button variant="outline" size="sm" onClick={handleClear}>
                지움
              </Button>
              <Button size="sm" onClick={handleSave}>
                저장
              </Button>
            </div>
          </div>

          {/* 하단: Scene/등장인물 뷰 (높이 400px) */}
          <div className="border rounded p-2 space-y-2" style={{ height: 400, overflowY: "auto" }}>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <div className="flex items-center gap-2">
                <span>Scene</span>
                <select
                  className="border rounded px-1 py-0.5 text-xs"
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
              <div className="flex items-center gap-1">
                <span>언어:</span>
                <select
                  className="border rounded px-1 py-0.5 text-xs"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as any)}
                >
                  <option value="auto">자동</option>
                  <option value="ko-KR">한국어</option>
                  <option value="en-US">English</option>
                </select>
                {filteredVoices.length > 0 && (
                  <select
                    className="border rounded px-1 py-0.5 text-[10px] max-w-[160px]"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    title="캐릭터(음성)를 선택할 수 있습니다."
                  >
                    <option value="default">기본 음성</option>
                    {filteredVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {currentScene ? (
              <div className="space-y-3 text-xs">
                <div className="font-semibold">
                  {`Scene ${currentScene.sceneNumber}: ${currentScene.title || ""}`}
                </div>
                {currentScene.lines.map((line) => (
                  <div key={line.id} className="border rounded p-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold mr-2">{line.speaker}</span>
                      <Button
                        size="sm"
                        className="ml-auto h-6 px-2 text-[11px]"
                        onClick={() => {
                          const msg = `${line.speaker}: ${line.message}`.trim();
                          if (msg) {
                            playModeRef.current = "idle";
                            loopSceneRef.current = false;
                            const speakOnce = (content: string) => {
                              if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
                              const trimmedLine = content.trim();
                              if (!trimmedLine) return;
                              try {
                                window.speechSynthesis.cancel();
                                const utter = new SpeechSynthesisUtterance(trimmedLine);
                                if (lang !== "auto") {
                                  utter.lang = lang;
                                }
                                try {
                                  const allVoices = window.speechSynthesis.getVoices?.() || [];
                                  let targetVoice: SpeechSynthesisVoice | undefined;
                                  if (voiceName && voiceName !== "default") {
                                    targetVoice = allVoices.find((v) => v.name === voiceName);
                                  }
                                  if (!targetVoice && lang !== "auto") {
                                    targetVoice = allVoices.find((v) => v.lang && v.lang.startsWith(lang));
                                  }
                                  if (targetVoice) utter.voice = targetVoice;
                                } catch {}
                                setSpeaking(true);
                                utter.onend = () => setSpeaking(false);
                                utter.onerror = () => setSpeaking(false);
                                window.speechSynthesis.speak(utter);
                              } catch (e) {
                                console.warn("[TTSDialog] Failed to play line:", e);
                                setSpeaking(false);
                              }
                            };
                            speakOnce(msg);
                          }
                        }}
                      >
                        Play
                      </Button>
                    </div>
                    <Textarea
                      readOnly
                      value={line.message}
                      className="h-[100px] text-xs"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">저장된 Scene 이 없습니다. 위에 스크립트를 입력하고 저장을 눌러 주세요.</div>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleStop}>
                정지
              </Button>
              <Button size="sm" onClick={() => handlePlay("scene")} disabled={!currentScene || !currentScene.lines.length}>
                Play Scene
              </Button>
              <Button size="sm" onClick={() => handlePlay("all")} disabled={!text.trim()}>
                Play All
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
