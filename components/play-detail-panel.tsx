// For TypeScript: declare global window property for play data
declare global {
  interface Window {
    __KOMENSKY_PLAY_DATA__?: Record<string, any[]>;
  }
}

"use client"

import { useEffect, useMemo, useState } from "react"
import React from "react"
// 댓글 팝업 컴포넌트
function CommentPopup({ open, onClose, onSave, initialValue }: { open: boolean; onClose: () => void; onSave: (text: string) => void; initialValue?: string }) {
  const [text, setText] = useState(initialValue || "");
  useEffect(() => {
    if (open) {
      setText(initialValue || "");
    }
  }, [open, initialValue]);
  const maxLength = 500;
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: '80vw',            // 모바일에서 화면 가로의 80%
          maxWidth: 640,            // 데스크톱에서는 너무 넓어지지 않도록 제한
          height: '60vh',           // 이전 대비 세로 크게 (화면의 60%)
          maxHeight: 720,
          boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>댓글 작성</h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, maxLength))}
          style={{
            flex: 1,
            width: '100%',
            fontSize: 15,
            marginBottom: 8,
            borderRadius: 6,
            border: '1px solid #ddd',
            padding: 8,
            resize: 'vertical',
          }}
          placeholder="댓글을 입력하세요..."
        />
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, textAlign: 'right' }}>{text.length} / {maxLength}자</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              // 현재 댓글을 완전히 지움
              setText("");
              onSave("");
              onClose();
            }}
            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 15 }}
          >
            Clear
          </button>
          <button type="button" onClick={onClose} style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 15 }}>Quit</button>
          <button type="button" onClick={() => { onSave(text); onClose(); }} style={{ background: '#38bdf8', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 15 }}>Save</button>
        </div>
      </div>
    </div>
  );
}
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { CheckedState } from "@radix-ui/react-checkbox"

import { parseDetailedActivity, getEnglishCategoryName } from "@/lib/data-parser"
// import { updateCategoryAchievement, removeCategoryAchievement } from "@/lib/category-achievements-manager"
import { loadCategoryRecord, updateCategoryPlayData } from "@/lib/storage-category"
import type { PlayCategory, DetailedActivity } from "@/lib/types"
import { loadUIDesignCfg as _loadUIDesignCfg } from "@/lib/ui-design"
import { supabase } from "@/lib/supabaseClient"

// ---- 타입(로컬 경량) ---------------------------------------------------------
type PlayActivityLite = {
  number: number
  title: string
  ageRange: string
  minAge: number
  maxAge: number
}

interface CategoryDetailCache {
  category: string
  detailsText: string
  loadedAt: number
}
let categoryDetailCache: CategoryDetailCache | null = null

// ---- UI Design 타입 ----------------------------------------------------------
type BoxStyle = {
  bw?: string;
  bc?: string;
  bg?: string;
  radius?: string;
  px?: string;
  py?: string;
  h?: string;
  gap?: string;
}
type TextStyle = {
  size?: string;
  color?: string;
  bold?: boolean;
}
type DetailDesign = { panel?: BoxStyle; box?: BoxStyle; title?: TextStyle; body?: TextStyle; }
type UIDetailCfg = { detail?: DetailDesign }
// PlayDetailPanelProps에 activity 추가
import type { AllCfg } from '@/lib/ui-design';
// ---- 플레이 상태 (즐겨찾기/댓글/좋아요 등) -------------------------------
type PlayState = {
  favorite: boolean;
  hasComment: boolean;
  localComment?: string;
};

type PlayStateMap = Record<string, PlayState>;

const buildPlayKey = (category: PlayCategory, playNumber: number) => `${category}-${playNumber}`;

const loadPlayStateMap = (childId: string): PlayStateMap => {
  if (typeof window === "undefined") return {};
  try {
    const primaryKey = `playState_${childId}`;
    const raw = localStorage.getItem(primaryKey);
    if (raw) return JSON.parse(raw) as PlayStateMap;

    // 마이그레이션: 예전에는 childId 없이 'playState_default'에만 저장했습니다.
    // 새 childId로 접속했는데 기존 키가 있다면 한 번 복사해서 재사용합니다.
    if (childId !== "default") {
      const legacy = localStorage.getItem("playState_default");
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy) as PlayStateMap;
          localStorage.setItem(primaryKey, legacy);
          return parsed;
        } catch {
          // 파싱 실패 시 무시
        }
      }
    }
    return {};
  } catch {
    return {};
  }
};

const savePlayStateMap = (childId: string, map: PlayStateMap) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`playState_${childId}`, JSON.stringify(map));
  } catch {
    // ignore
  }
};

const migrateLegacyFavorite = (childId: string, category: PlayCategory, playNumber: number, map: PlayStateMap): PlayStateMap => {
  if (typeof window === "undefined") return map;
  const legacyKey = `favorite_${childId}_${category}_${playNumber}`;
  const legacy = localStorage.getItem(legacyKey);
  if (!legacy) return map;
  const playKey = buildPlayKey(category, playNumber);
  const prev = map[playKey] ?? { favorite: false, hasComment: false };
  const next: PlayState = { ...prev, favorite: legacy === "1" };
  const nextMap = { ...map, [playKey]: next };
  // 마이그레이션 후 기존 키 삭제 (한 번만 실행되도록 놔둠)
  try {
    localStorage.removeItem(legacyKey);
  } catch {
    // ignore
  }
  return nextMap;
};

interface PlayDetailPanelProps {
  category: PlayCategory;
  playNumber: number;
  onBack: () => void;
  onNavigate?: (n: number) => void;
  totalPlays?: number;
  childProfile?: { id: string; name: string };
  uiDesign?: AllCfg;
  activity?: any;
  // 리스트에서 "댓글 창 열기"로 들어온 경우 자동 오픈 여부
  autoOpenComment?: boolean;
}

// ---- 기본값 & 보정 유틸 ------------------------------------------------------
const BOX_DEFAULT: Required<BoxStyle> = {
  bw: "1px",
  bc: "rgba(0,0,0,0.12)",
  bg: "#fafafa",
  radius: "10px",
  px: "10px",
  py: "10px",
  h: "",
  gap: "5px",
};
const PANEL_DEFAULT: Required<BoxStyle> = { ...BOX_DEFAULT, bg: "#fff", radius: "12px", px: "12px", py: "12px" };
const TITLE_DEFAULT: Required<TextStyle> = { size: "13px", color: "#111827", bold: true };
const BODY_DEFAULT: Required<TextStyle>  = { size: "12px", color: "#374151", bold: false };

function fillBox(b?: BoxStyle): Required<BoxStyle> {
  return {
    bw: b?.bw ?? BOX_DEFAULT.bw, bc: b?.bc ?? BOX_DEFAULT.bc, bg: b?.bg ?? BOX_DEFAULT.bg,
    radius: b?.radius ?? BOX_DEFAULT.radius, px: b?.px ?? BOX_DEFAULT.px, py: b?.py ?? BOX_DEFAULT.py,
    h: b?.h ?? BOX_DEFAULT.h, gap: b?.gap ?? BOX_DEFAULT.gap,
  };
}
function fillPanel(b?: BoxStyle): Required<BoxStyle> {
  return {
    bw: b?.bw ?? PANEL_DEFAULT.bw, bc: b?.bc ?? PANEL_DEFAULT.bc, bg: b?.bg ?? PANEL_DEFAULT.bg,
    radius: b?.radius ?? PANEL_DEFAULT.radius, px: b?.px ?? PANEL_DEFAULT.px, py: b?.py ?? PANEL_DEFAULT.py,
    h: b?.h ?? PANEL_DEFAULT.h, gap: b?.gap ?? PANEL_DEFAULT.gap,
  };
}
function fillText(t?: TextStyle, base: Required<TextStyle> = BODY_DEFAULT): Required<TextStyle> {
  return { size: t?.size ?? base.size, color: t?.color ?? base.color, bold: t?.bold ?? base.bold };
}

function useDetailDesign(): { panel: Required<BoxStyle>; box: Required<BoxStyle>; title: Required<TextStyle>; body: Required<TextStyle> } {
  const raw = useMemo<UIDetailCfg>(() => { try { return (_loadUIDesignCfg?.() ?? {}) as UIDetailCfg } catch { return {} as UIDetailCfg } }, [])
  const d = raw.detail ?? {}
  return { panel: fillPanel(d.panel), box: fillBox(d.box), title: fillText(d.title, TITLE_DEFAULT), body: fillText(d.body, BODY_DEFAULT) }
}

// ---- 테두리/배경/패딩을 일관 적용하는 컨테이너 -------------------------------
type SectionBoxProps = {
  label?: string;
  box?: BoxStyle | Required<BoxStyle>;
  title?: TextStyle | Required<TextStyle>;
  body?: TextStyle | Required<TextStyle>;
  children: React.ReactNode;
};

function SectionBox(props: SectionBoxProps) {
  // 단순 디버그: children 의 타입만 가볍게 출력 (React 내부 필드 접근 X)
  if (typeof window !== "undefined") {
    const c = props.children;
    let kind: string;
    if (typeof c === "string") kind = "string";
    else if (Array.isArray(c)) kind = `array(len=${c.length})`;
    else if (c === null) kind = "null";
    else if (c === undefined) kind = "undefined";
    else kind = typeof c;
    // eslint-disable-next-line no-console
    console.log("[증거] SectionBox label:", props.label, "children kind:", kind);
  }
  const b = fillBox(props.box); const t = fillText(props.title, TITLE_DEFAULT); const bd = fillText(props.body, BODY_DEFAULT);
  const fwTitle = t.bold ? 700 : 500; const fwBody = bd.bold ? 600 : 400;
  return (
    <div data-ui="detail-small-box" style={{ borderWidth: b.bw, borderStyle: "solid", borderColor: b.bc, background: b.bg, borderRadius: b.radius, padding: `${b.py} ${b.px}`, minHeight: b.h || undefined }}>
      {props.label ? (<div style={{ fontSize: t.size, color: t.color, fontWeight: fwTitle, marginBottom: 0 }}>{props.label}</div>) : null}
      {typeof props.children === 'string' ? (
        <pre style={{ fontSize: bd.size, color: bd.color, fontWeight: fwBody, margin: 0, background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{props.children}</pre>
      ) : (
        <div style={{ fontSize: bd.size, color: bd.color, fontWeight: fwBody, whiteSpace: 'pre-wrap' }}>{props.children}</div>
      )}
    </div>
  );
}

// ---- 데이터 로더 -------------------------------------------------------------
const loadCategoryDetails = async (category: string): Promise<string> => {
  if (categoryDetailCache && categoryDetailCache.category === category) return categoryDetailCache.detailsText
  const englishFileName = getEnglishCategoryName(category)
  const response = await fetch(`/details_${englishFileName}.txt`)
  if (!response.ok) throw new Error(`Failed to load details file: ${response.status} for ${englishFileName}`)
  const detailsText = await response.text()
  if (detailsText.includes("<!DOCTYPE html>") || detailsText.includes("<html")) throw new Error(`File access error: Received HTML for ${category}`)
  categoryDetailCache = { category, detailsText, loadedAt: Date.now() }
  return detailsText
}

// ---- 메인 컴포넌트 ----------------------------------------------------------
interface PlayDetailPanelProps {
  category: PlayCategory;
  playNumber: number;
  onBack: () => void;
  onNavigate?: (n: number) => void;
  totalPlays?: number;
  childProfile?: { id: string; name: string };
  uiDesign?: AllCfg;
  activity?: any;
}

export default function PlayDetailPanel({ category, playNumber, onBack, onNavigate, totalPlays, uiDesign, activity, childProfile, autoOpenComment }: PlayDetailPanelProps) {
    // All hooks must be called before any return!
    const childId = childProfile?.id || 'default';
    const playKey = buildPlayKey(category, playNumber);

    // 통합 PlayStateMap 로딩 + 레거시 favorite_* 마이그레이션
    const [playStateMap, setPlayStateMap] = useState<PlayStateMap>({});
    useEffect(() => {
      let cancelled = false;
      const loadAndSync = async () => {
        const base = loadPlayStateMap(childId);
        const migrated = migrateLegacyFavorite(childId, category, playNumber, base);
        let merged: PlayStateMap = { ...migrated };

        if (supabase && childId) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accountId = sessionData?.session?.user?.id;

            const { data, error } = await supabase
              .from("play_states")
              .select("favorite, comment")
              .eq("child_id", childId)
              .eq("account_id", accountId || '')
              .eq("category", category)
              .eq("play_number", playNumber)
              .maybeSingle();

            if (!error && data) {
              const nextForKey: PlayState = {
                favorite: !!data.favorite,
                hasComment: !!(data.comment && String(data.comment).trim().length > 0),
                localComment: data.comment ?? "",
              };
              merged = { ...merged, [playKey]: nextForKey };
            }
          } catch (error) {
            console.warn("[PlayDetailPanel] Failed to load play state from Supabase:", error);
          }
        }

        if (!cancelled) {
          setPlayStateMap(merged);
          savePlayStateMap(childId, merged);
        }
      };

      loadAndSync();
      return () => {
        cancelled = true;
      };
    }, [childId, category, playNumber, playKey]);

    const currentState: PlayState = playStateMap[playKey] ?? { favorite: false, hasComment: false };

    const setCurrentState = React.useCallback((partial: Partial<PlayState>) => {
      setPlayStateMap(prev => {
        const base = prev[playKey] ?? { favorite: false, hasComment: false };
        const next: PlayState = { ...base, ...partial };
        const nextMap = { ...prev, [playKey]: next };
        savePlayStateMap(childId, nextMap);

        if (supabase && childId) {
          const payload = {
            child_id: childId,
            account_id: undefined as string | undefined,
            category,
            play_number: playNumber,
            favorite: !!next.favorite,
            comment: next.localComment ?? (next.hasComment ? "" : null),
          };

          (async () => {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const accountId = sessionData?.session?.user?.id;
              if (accountId) {
                payload.account_id = accountId;
              }

              const { error } = await supabase
                .from("play_states")
                .upsert(payload);
              if (error) {
                console.warn("[PlayDetailPanel] Failed to sync play state to Supabase:", error);
              }
            } catch (err) {
              console.warn("[PlayDetailPanel] Unexpected Supabase error:", err);
            }
          })();
        }

        return nextMap;
      });
    }, [childId, playKey, category, playNumber]);

    const isFavorite = currentState.favorite;
    const toggleFavorite = React.useCallback(() => {
      setCurrentState({ favorite: !isFavorite });
    }, [isFavorite, setCurrentState]);
    const [detailData, setDetailData] = useState<DetailedActivity | null>(null)
    const [completedLevels, setCompletedLevels] = useState<boolean[]>([false,false,false,false,false])
    const [loading, setLoading] = useState(true)
    const [hasFixedDifficulty, setHasFixedDifficulty] = useState(false)
    const [categoryTotalPlays, setCategoryTotalPlays] = useState<number>(totalPlays || 25)
    const playActivity: PlayActivityLite | null = useMemo(() => {
      if (activity) return activity;
      if (typeof window !== "undefined" && window.__KOMENSKY_PLAY_DATA__?.[category]) {
        return window.__KOMENSKY_PLAY_DATA__[category].find((a: any) => a.number === playNumber) ?? null;
      }
      return null;
    }, [activity, category, playNumber]);
    const DD = useMemo(() => {
      if (uiDesign) {
        return {
            panel: fillPanel({
              bg: uiDesign.detailPanelBox?.bg,
              bw: uiDesign.detailPanelBox?.borderWidth ? `${uiDesign.detailPanelBox.borderWidth}px` : undefined,
              bc: uiDesign.detailPanelBox?.borderColor,
              radius: uiDesign.detailPanelBox?.radius ? `${uiDesign.detailPanelBox.radius}px` : undefined,
              px: '12px',
              py: '12px',
            }),
            box: fillBox({
              bg: uiDesign.detailSmallBox?.bg,
              bw: uiDesign.detailSmallBox?.borderWidth ? `${uiDesign.detailSmallBox.borderWidth}px` : undefined,
              bc: uiDesign.detailSmallBox?.borderColor,
              radius: uiDesign.detailSmallBox?.radius ? `${uiDesign.detailSmallBox.radius}px` : undefined,
              px: '10px',
              py: '10px',
            }),
            title: fillText({
              size: uiDesign.detailTitle?.size ? `${uiDesign.detailTitle.size}px` : undefined,
              color: uiDesign.detailTitle?.color,
              bold: uiDesign.detailTitle?.bold,
            }, TITLE_DEFAULT),
            body: fillText({
              size: uiDesign.detailBody?.size ? `${uiDesign.detailBody.size}px` : undefined,
              color: uiDesign.detailBody?.color,
              bold: uiDesign.detailBody?.bold,
            }, BODY_DEFAULT),
          };
        }
        return useDetailDesign();
      }, [uiDesign]);
    // 댓글 팝업 상태 및 저장 (hook block 안에 위치시켜 순서 고정)
    const [commentOpen, setCommentOpen] = useState(false);
    const commentKey = `comment_${category}_${playNumber}`;
    const [comment, setComment] = useState<string>("");
    const [hasComment, setHasComment] = useState(false);

    // 리스트에서 요청된 경우, 마운트 후 한 번 댓글 창 자동 오픈
    useEffect(() => {
      if (autoOpenComment) {
        setCommentOpen(true);
      }
    }, [autoOpenComment]);

    // 클라이언트에서만 PlayStateMap 기반으로 초기 상태 동기화
    useEffect(() => {
      if (typeof window === "undefined") return;
      const s = (playStateMap[playKey] ?? { favorite: false, hasComment: false }) as PlayState;
      const text = s.localComment ?? "";
      setComment(text);
      setHasComment(s.hasComment && text.trim().length > 0);
    }, [playKey, playStateMap]);
    const handleSaveComment = React.useCallback((text: string) => {
      const has = text.trim().length > 0;
      setComment(text);
      setHasComment(has);
      setCurrentState({ hasComment: has, localComment: text });
    }, [setCurrentState, playKey]);
    useEffect(() => {
      let alive = true
      const fx = async () => {
        try {
          const detailsText = await loadCategoryDetails(category)
          const parsedDetail = parseDetailedActivity(detailsText, playNumber)
          if (!alive) return
          setDetailData(parsedDetail)
          const categoryRecord = loadCategoryRecord(category)
          if (alive) {
            if (categoryRecord) {
              const playData = categoryRecord.playData.find(p => p.playNumber === playNumber)
              setCompletedLevels(playData ? [...playData.achievedLevelFlags] : [false,false,false,false,false])
            } else {
              setCompletedLevels([false,false,false,false,false])
            }
          }
        } catch (e) {
          console.error(`[v0] Failed to load detail data for ${category} #${playNumber}:`, e)
        } finally {
          if (alive) setLoading(false)
        }
      }
      fx()
      return () => { alive = false }
    }, [category, playNumber, activity])
    const handleLevelToggle = (levelIndex: number, checked: CheckedState) => {
      if (hasFixedDifficulty && levelIndex !== 2) { alert("이 놀이는 난이도를 조절할 수 없습니다."); return }
      if (checked !== true && checked !== false) return
      const newLevels = [...completedLevels]; newLevels[levelIndex] = checked; setCompletedLevels(newLevels)
      updateCategoryPlayData(category, playNumber, levelIndex, checked)
      const selected = newLevels.map((v,i)=>v?i+1:null).filter((v): v is number => v!==null)
      const hi = selected.length? Math.max(...selected) : 0
      updateAchievements(hi)
    }
    const updateAchievements = (achievedLevel: number) => {
      if (!detailData || !playActivity) return
      if (achievedLevel > 0) {
        const act = { category, ...playActivity } as { category: PlayCategory } & PlayActivityLite
        // updateCategoryAchievement(category, act, achievedLevel, new Date())
        setTimeout(()=>{ window.dispatchEvent(new CustomEvent("recalculateCategory", { detail: { category } })) }, 0)
      } else {
        const rec = loadCategoryRecord(category)
        // if (rec?.topAchievements) {
        //   rec.topAchievements.filter((a: any) => a.playNumber === playNumber).forEach(a => {
        //     removeCategoryAchievement(category, a.playNumber, a.achievedLevel, a.developmentAge)
        //   })
        // }
        setTimeout(()=>{ window.dispatchEvent(new CustomEvent("recalculateCategory", { detail: { category } })) }, 0)
      }
    }
    const renderTextWithLineBreaks = (text: string) => {
      const t = text ?? ""
      const bd = DD.body
      return t.split("\n").map((line, idx) => (
        <div key={idx} style={{ fontSize: bd.size, color: bd.color, fontWeight: bd.bold ? 600 : 400 }}>
          {line || "\u00A0"}
        </div>
      ))
    }
    // Now, after all hooks, do conditional returns
    if (loading) return (<div className="flex items-center justify-center py-8"><div className="text-gray-500">로딩 중...</div></div>)
    if (!detailData || !playActivity) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack} style={{ fontSize: "12px" }}><span className="font-bold">목록으로</span></Button>
          </div>
          <div className="text-center py-8 text-gray-500">
            <p>상세 정보를 불러올 수 없습니다.</p>
            <p className="text-xs mt-2">카테고리: {category}, 놀이번호: {playNumber}</p>
            <p className="text-xs">개발자 도구 콘솔에서 자세한 로그를 확인하세요.</p>
          </div>
        </div>
      )
    }

  // Move findSection definition here so it's available before use
  const findSection = (names: string[]) => detailData?.sections?.find((s: any) => names.some(n => s.title.includes(n)));

  // UI settings for header
  const headerBox = uiDesign?.detailHeaderBox ? {
    background: uiDesign.detailHeaderBox.bg,
    borderWidth: uiDesign.detailHeaderBox.borderWidth ? `${uiDesign.detailHeaderBox.borderWidth}px` : undefined,
    borderStyle: uiDesign.detailHeaderBox.borderWidth && uiDesign.detailHeaderBox.borderWidth > 0 ? "solid" : undefined,
    borderColor: uiDesign.detailHeaderBox.borderColor,
    borderRadius: uiDesign.detailHeaderBox.radius ? `${uiDesign.detailHeaderBox.radius}px` : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "8px"
  } : {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px"
  };
  const headerTitle = uiDesign?.detailHeaderTitle ? {
    fontSize: uiDesign.detailHeaderTitle.size ? `${uiDesign.detailHeaderTitle.size}px` : undefined,
    color: uiDesign.detailHeaderTitle.color,
    fontWeight: uiDesign.detailHeaderTitle.bold ? 700 : 500
  } : { fontWeight: 700 };
  const headerListBtn = uiDesign?.detailHeaderListBtn ? {
    fontSize: uiDesign.detailHeaderListBtn.fontSize ? `${uiDesign.detailHeaderListBtn.fontSize}px` : undefined,
    color: uiDesign.detailHeaderListBtn.color,
    fontWeight: uiDesign.detailHeaderListBtn.bold ? 700 : 500,
    background: uiDesign.detailHeaderListBtn.bg,
    borderWidth: uiDesign.detailHeaderListBtn.borderWidth,
    borderColor: uiDesign.detailHeaderListBtn.borderColor,
    borderRadius: uiDesign.detailHeaderListBtn.radius ? `${uiDesign.detailHeaderListBtn.radius}px` : undefined,
    padding: `${uiDesign.detailHeaderListBtn.paddingY ?? 6}px ${uiDesign.detailHeaderListBtn.paddingX ?? 12}px`,
    marginRight: "8px"
  } : { fontWeight: 700 };
  const headerPrevBtn = uiDesign?.detailHeaderPrevBtn ? {
    fontSize: uiDesign.detailHeaderPrevBtn.fontSize ? `${uiDesign.detailHeaderPrevBtn.fontSize}px` : undefined,
    color: uiDesign.detailHeaderPrevBtn.color,
    fontWeight: uiDesign.detailHeaderPrevBtn.bold ? 700 : 500,
    background: uiDesign.detailHeaderPrevBtn.bg,
    borderWidth: uiDesign.detailHeaderPrevBtn.borderWidth,
    borderColor: uiDesign.detailHeaderPrevBtn.borderColor,
    borderRadius: uiDesign.detailHeaderPrevBtn.radius ? `${uiDesign.detailHeaderPrevBtn.radius}px` : undefined,
    padding: `${uiDesign.detailHeaderPrevBtn.paddingY ?? 6}px ${uiDesign.detailHeaderPrevBtn.paddingX ?? 12}px`,
    marginRight: "4px"
  } : { fontWeight: 700 };
  const headerNextBtn = uiDesign?.detailHeaderNextBtn ? {
    fontSize: uiDesign.detailHeaderNextBtn.fontSize ? `${uiDesign.detailHeaderNextBtn.fontSize}px` : undefined,
    color: uiDesign.detailHeaderNextBtn.color,
    fontWeight: uiDesign.detailHeaderNextBtn.bold ? 700 : 500,
    background: uiDesign.detailHeaderNextBtn.bg,
    borderWidth: uiDesign.detailHeaderNextBtn.borderWidth,
    borderColor: uiDesign.detailHeaderNextBtn.borderColor,
    borderRadius: uiDesign.detailHeaderNextBtn.radius ? `${uiDesign.detailHeaderNextBtn.radius}px` : undefined,
    padding: `${uiDesign.detailHeaderNextBtn.paddingY ?? 6}px ${uiDesign.detailHeaderNextBtn.paddingX ?? 12}px`,
    marginLeft: "4px"
  } : { fontWeight: 700 };
  const prepTimeSection = findSection(["준비시간", "준비 시간"])
  const playTimeSection = findSection(["놀이시간", "놀이 시간"])
  const materialsSection = findSection(["준비물"])
  const goalSection = findSection(["놀이 목표"])
  const devSection = findSection(["발달 자극 요소"])
  const safetySection = findSection(["안전 주의"])
  const methodHeader = findSection(["놀이방법","놀이 방법"])
  const methodSteps = (detailData.sections ?? []).filter((s: any) => /^\d+\.\s/.test(s.title))
  const difficultyHeader = findSection(["난이도","조절"])
  const expansionSection = findSection(["확장활동","확장 활동"])
  const comenSection = findSection(["코메니우스","코메니우스 철학"])

  // Detail panel 공통 스타일(DD)에서 작은 박스·텍스트 스타일 및 간격 추출
  const small = DD.box;
  const titleText = DD.title;
  const bodyText = DD.body;
  const gapBetweenBoxes = small.gap ?? "10px";

  return (
    <div
      data-ui="detail-panel-container"
      style={{
        borderWidth: DD.panel.bw,
        borderStyle: "solid",
        borderColor: DD.panel.bc,
        background: DD.panel.bg,
        borderRadius: DD.panel.radius,
        padding: `${DD.panel.py} ${DD.panel.px}`,
      }}
      className="space-y-4"
    >
      {/* Play Detail Header with new layout */}
      <div style={{ ...headerBox, flexDirection: 'column', gap: 0 }}>
        {/* Top row: 제목/배지만 독립적으로 */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <h2 style={{ ...headerTitle, margin: 0 }}>{playNumber}. {playActivity.title}</h2>
          <Badge variant="outline" style={{ fontSize: headerTitle.fontSize, color: headerTitle.color, fontWeight: headerTitle.fontWeight, marginLeft: "8px" }}>{playActivity.ageRange}개월</Badge>
        </div>
        {/* Second row: 모든 버튼 나열 */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {/* 찜 버튼 (왼쪽) */}
          <Button variant="ghost" size="sm" onClick={toggleFavorite} style={{ marginRight: 8, fontSize: 23, color: isFavorite ? '#38bdf8' : '#bbb', padding: 0, minWidth: 32 }} aria-label="찜">
            {isFavorite ? '★' : '☆'}
          </Button>
          {/* 좋아요(heart) + 숫자 배지: 별표 오른쪽에 표시, DB 연동 전 0 */}
          <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
            <span style={{ color: '#f59e42', fontSize: 21, marginRight: 2 }} aria-label="좋아요">♥</span>
            <span style={{
              display: 'inline-block',
              minWidth: 22,
              height: 22,
              background: '#ffe5e5',
              color: '#f59e42',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 11,
              textAlign: 'center',
              lineHeight: '22px',
              padding: '0 6px',
            }}>0</span>
          </span>
          {/* 댓글 버튼: SVG 아이콘 사용 (회색/파랑 확실히 구분) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommentOpen(true)}
            style={{
              marginRight: 8,
              padding: 0,
              minWidth: 36,
              height: 36,
            }}
            aria-label="댓글"
          >
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                display: 'block',
                width: 32,
                height: 32,
                fill: hasComment ? '#1d4ed8' : '#9ca3af',
              }}
            >
              <path d="M5 4h14a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H9.8L6.4 19.7A.75.75 0 0 1 5 19.2V15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1zm1 2v7h1a1 1 0 0 1 1 1v2.38L11.2 14H19V6H6z" />
            </svg>
          </Button>
          <div style={{ flex: 1 }} />
          {/* 목록, 이전, 다음 버튼 오른쪽 정렬 */}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={onBack} style={{ ...headerListBtn, marginRight: 8 }}><span style={{ fontWeight: headerListBtn.fontWeight }}>목록</span></Button>
            <Button variant="ghost" size="sm" style={headerPrevBtn} onClick={() => onNavigate?.(Math.max(1, playNumber - 1))} disabled={playNumber <= 1}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span style={{ marginLeft: "4px", fontWeight: headerPrevBtn.fontWeight }}>이전</span>
            </Button>
            <Button variant="ghost" size="sm" style={headerNextBtn} onClick={() => onNavigate?.(playNumber + 1)} disabled={playNumber >= categoryTotalPlays}>
              <span style={{ marginRight: "4px", fontWeight: headerNextBtn.fontWeight }}>다음</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Button>
          </div>
        </div>
      </div>
      {/* 댓글 팝업 */}
      <CommentPopup open={commentOpen} onClose={() => setCommentOpen(false)} onSave={handleSaveComment} initialValue={comment} />

      <div className="flex flex-col" style={{ gap: gapBetweenBoxes }}>
        {(prepTimeSection || playTimeSection) && (
          <SectionBox box={small} title={titleText} body={bodyText} label="준비 시간 / 놀이 시간">
            {prepTimeSection && (
              <div>{prepTimeSection.content.replace(/\n/g, " ").trim()}</div>
            )}
            {playTimeSection && !prepTimeSection && (
              <div>{playTimeSection.content.replace(/\n/g, " ").trim()}</div>
            )}
          </SectionBox>
        )}

        {materialsSection && (<SectionBox box={small} title={titleText} body={bodyText} label="준비물">{materialsSection.content}</SectionBox>)}
        {goalSection && (<SectionBox box={small} title={titleText} body={bodyText} label="놀이 목표">{goalSection.content}</SectionBox>)}
        {devSection && (<SectionBox box={small} title={titleText} body={bodyText} label="발달 자극 요소">{devSection.content}</SectionBox>)}
        {safetySection && uiDesign ? (
          <SectionBox
            box={{
              bg: uiDesign.safetySmallBox?.bg,
              bw: uiDesign.safetySmallBox?.borderWidth ? `${uiDesign.safetySmallBox.borderWidth}px` : undefined,
              bc: uiDesign.safetySmallBox?.borderColor,
              radius: uiDesign.safetySmallBox?.radius ? `${uiDesign.safetySmallBox.radius}px` : undefined,
              px: '10px',
              py: '10px',
            }}
            title={{
              size: uiDesign.safetyTitle?.size ? `${uiDesign.safetyTitle.size}px` : undefined,
              color: uiDesign.safetyTitle?.color,
              bold: uiDesign.safetyTitle?.bold,
            }}
            body={{
              size: uiDesign.safetyBody?.size ? `${uiDesign.safetyBody.size}px` : undefined,
              color: uiDesign.safetyBody?.color,
              bold: uiDesign.safetyBody?.bold,
            }}
            label="안전 주의"
          >
            {safetySection.content.split(/\n/).map((line, idx) => {
              const m = line.match(/^(\d+\.)\s*(.*)$/);
              if (m) {
                return (
                  <div
                    key={idx}
                    style={{
                      paddingLeft: "2ch",
                      textIndent: "-2ch",
                      fontSize: uiDesign.safetyBody?.size ? `${uiDesign.safetyBody.size}px` : undefined,
                      color: uiDesign.safetyBody?.color,
                      fontWeight: uiDesign.safetyBody?.bold ? 600 : 400,
                    }}
                  >
                    <span style={{ textIndent: 0, fontWeight: 600 }}>{m[1]}</span> {m[2]}
                  </div>
                );
              } else {
                return <div key={idx} style={{ fontSize: uiDesign.safetyBody?.size ? `${uiDesign.safetyBody.size}px` : undefined, color: uiDesign.safetyBody?.color, fontWeight: uiDesign.safetyBody?.bold ? 600 : 400 }}>{line}</div>;
              }
            })}
          </SectionBox>
        ) : safetySection ? (
          <SectionBox box={small} title={titleText} body={bodyText} label="안전 주의">
            {safetySection.content.split(/\n/).map((line, idx) => {
              const m = line.match(/^(\d+\.)\s*(.*)$/);
              if (m) {
                return (
                  <div
                    key={idx}
                    style={{
                      paddingLeft: "2ch",
                      textIndent: "-2ch",
                      fontSize: bodyText.size,
                      color: bodyText.color,
                      fontWeight: bodyText.bold ? 600 : 400,
                    }}
                  >
                    <span style={{ textIndent: 0, fontWeight: 600 }}>{m[1]}</span> {m[2]}
                  </div>
                );
              } else {
                return <div key={idx} style={{ fontSize: bodyText.size, color: bodyText.color, fontWeight: bodyText.bold ? 600 : 400 }}>{line}</div>;
              }
            })}
          </SectionBox>
        ) : null}

        {/* 증거 로그: methodHeader.content, methodSteps 마지막 요소 */}
        {(() => {
          if (typeof window !== 'undefined') {
            console.log('[증거] methodHeader.content:', methodHeader?.content);
            if (methodSteps && methodSteps.length > 0) {
              const lastStep = methodSteps[methodSteps.length - 1];
              console.log('[증거] methodSteps 마지막 요소:', lastStep);
            }
          }
          return null;
        })()}
        <SectionBox box={small} title={titleText} body={bodyText} label="놀이 방법">
          {methodHeader && /\S/.test(methodHeader.content) ? (   // ✅ content에 실제 글자가 있을 때만 렌더
            <div style={{ marginBottom: "6px" }}>
              {renderTextWithLineBreaks(methodHeader.content)}
            </div>
          ) : null}
          <div className="space-y-1" style={{ marginTop: 0 }}>
            {methodSteps.map((s:any,i:number)=>(
              <div
                key={i}
                className={i === methodSteps.length - 1 ? 'last:mb-0' : ''}
                style={{
                  paddingLeft: "2ch",
                  textIndent: "-2ch",
                  fontSize: bodyText.size,
                  color: bodyText.color,
                  fontWeight: bodyText.bold ? 600 : 400,
                }}
              >
                <span style={{ textIndent: 0, fontWeight: 600 }}>
                  {s.title.endsWith(":") ? s.title : `${s.title}:`}
                </span>{" "}
                {s.content.replace(/\n/g," ").trim()}
              </div>
            ))}
          </div>
        </SectionBox>

        {difficultyHeader && (
          <SectionBox box={small} title={titleText} body={bodyText} label="난이도 조절">
            {hasFixedDifficulty ? (
              <div className="p-2 rounded" style={{ background: "rgba(0,0,0,0.03)" }}>
                <div className="flex items-start gap-2">
                  {/* ★ 체크박스 4px 내려 정렬 */}
                  <Checkbox
                    id="level-3"
                    className="mt-1"                     // ★ 추가
                    checked={completedLevels[2]}
                    onCheckedChange={(c) => handleLevelToggle(2, c)}
                  />
                  <div>
                    <label htmlFor="level-3" style={{ fontWeight: 600 }}>Level 3</label> - 보통
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      이 놀이는 난이도를 조절할 수 없습니다.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((level) => {
                  const key = `level${level}` as keyof NonNullable<typeof detailData["levels"]>;
                  const content = detailData.levels?.[key] ?? "";
                  const names = ["더 쉽게", "쉽게", "보통", "어렵게", "더 어렵게"];
                  return (
                    <div key={level} className="flex items-start gap-2">
                      {/* ★ 체크박스 4px 내려 정렬 */}
                      <Checkbox
                        id={`level-${level}`}
                        className="mt-1"                 // ★ 추가
                        checked={completedLevels[level - 1]}
                        onCheckedChange={(c) => handleLevelToggle(level - 1, c)}
                      />
                      <div>
                        {/* ★ 제목·난이도 표기 굵기 통일, 행간 안정 */}
                        <label htmlFor={`level-${level}`} style={{ fontWeight: 600 }}>
                          Level {level}
                        </label>
                        {" - "}
                        <span style={{ fontWeight: 600 }}>{names[level - 1]}</span>
                        {/* ★ 본문 위 여백 4px로 고정, 개행 보존 */}
                        <p style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionBox>

        )}

        {expansionSection && (<SectionBox box={small} title={titleText} body={bodyText} label="확장활동">{renderTextWithLineBreaks(expansionSection.content)}</SectionBox>)}
        {comenSection && (<SectionBox box={small} title={titleText} body={bodyText} label="코메니우스 철학 적용">{renderTextWithLineBreaks(comenSection.content)}</SectionBox>)}
      </div>
    </div>
  )
}
