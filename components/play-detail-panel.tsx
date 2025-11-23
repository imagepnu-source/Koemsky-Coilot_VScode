// For TypeScript: declare global window property for play data
declare global {
  interface Window {
    __KOMENSKY_PLAY_DATA__?: Record<string, any[]>;
  }
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { CheckedState } from "@radix-ui/react-checkbox"

import { parseDetailedActivity, getEnglishCategoryName } from "@/lib/data-parser"
// import { updateCategoryAchievement, removeCategoryAchievement } from "@/lib/category-achievements-manager"
import { loadCategoryRecord, updateCategoryPlayData } from "@/lib/storage-category"
import type { PlayCategory, DetailedActivity } from "@/lib/types"
import { loadUIDesignCfg as _loadUIDesignCfg } from "@/lib/ui-design"

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
interface PlayDetailPanelProps {
  category: PlayCategory;
  playNumber: number;
  onBack: () => void;
  onNavigate?: (newPlayNumber: number) => void;
  totalPlays?: number;
  activity?: any;
  uiDesign?: AllCfg;
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
  gap: "10px",
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
  const b = fillBox(props.box); const t = fillText(props.title, TITLE_DEFAULT); const bd = fillText(props.body, BODY_DEFAULT);
  const fwTitle = t.bold ? 700 : 500; const fwBody = bd.bold ? 600 : 400;
  return (
    <div data-ui="detail-small-box" style={{ borderWidth: b.bw, borderStyle: "solid", borderColor: b.bc, background: b.bg, borderRadius: b.radius, padding: `${b.py} ${b.px}`, minHeight: b.h || undefined }}>
      {props.label ? (<div style={{ fontSize: t.size, color: t.color, fontWeight: fwTitle, marginBottom: 0 }}>{props.label}</div>) : null}
      <div style={{ fontSize: bd.size, color: bd.color, fontWeight: fwBody }}>{props.children}</div>
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
interface PlayDetailPanelProps { category: PlayCategory; playNumber: number; onBack: () => void; onNavigate?: (n: number) => void; totalPlays?: number; }

export default function PlayDetailPanel({ category, playNumber, onBack, onNavigate, totalPlays, uiDesign, activity }: PlayDetailPanelProps) {
  const [detailData, setDetailData] = useState<DetailedActivity | null>(null)
  const [completedLevels, setCompletedLevels] = useState<boolean[]>([false,false,false,false,false])
  const [loading, setLoading] = useState(true)
  const [hasFixedDifficulty, setHasFixedDifficulty] = useState(false)
  const [categoryTotalPlays, setCategoryTotalPlays] = useState<number>(totalPlays || 25)

  // Always use the latest activity prop, or fallback to window data if not provided
  const playActivity: PlayActivityLite | null = useMemo(() => {
    if (activity) return activity;
    if (typeof window !== "undefined" && window.__KOMENSKY_PLAY_DATA__?.[category]) {
      return window.__KOMENSKY_PLAY_DATA__[category].find((a: any) => a.number === playNumber) ?? null;
    }
    return null;
  }, [activity, category, playNumber]);
  // If uiDesign is provided, use it for design config; otherwise fallback to local loader
  const DD = useMemo(() => {
    if (uiDesign) {
      // Map AllCfg fields to DD
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

  // Debug: log the header box config to verify value at render
  console.log('[PlayDetailPanel] detailHeaderBox', uiDesign?.detailHeaderBox);
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
        {line || "\u00A0"}</div>
    ))
  }

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

  const big = DD.panel, small = DD.box, titleText = DD.title, bodyText = DD.body
  const gapBetweenBoxes = small.gap || "10px"

  // Move findSection definition here so it's available before use
  const findSection = (names: string[]) => detailData?.sections?.find((s: any) => names.some(n => s.title.includes(n)));

  // Debug: log the header box config to verify value at render
  console.log('[PlayDetailPanel] detailHeaderBox', uiDesign?.detailHeaderBox);
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

  return (
    <div data-ui="detail-panel-container"
      style={{ borderWidth: big.bw, borderStyle: "solid", borderColor: big.bc, background: big.bg, borderRadius: big.radius, padding: `${big.py} ${big.px}` }}
      className="space-y-4"
    >

      {/* Play Detail Header with new layout */}
      <div style={{ ...headerBox, flexDirection: 'column', gap: 0 }}>
        {/* Top row: 중앙 제목/배지 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 4 }}>
          <h2 style={{ ...headerTitle, margin: 0 }}>{playNumber}. {playActivity.title}</h2>
          <Badge variant="outline" style={{ fontSize: headerTitle.fontSize, color: headerTitle.color, fontWeight: headerTitle.fontWeight, marginLeft: "8px" }}>{playActivity.ageRange}개월</Badge>
        </div>
        {/* Bottom row: 목록(왼쪽), 이전/다음(오른쪽) */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <Button variant="ghost" size="sm" onClick={onBack} style={headerListBtn}><span style={{ fontWeight: headerListBtn.fontWeight }}>목록</span></Button>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
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

      <div className="flex flex-col" style={{ gap: gapBetweenBoxes }}>
        {(prepTimeSection || playTimeSection) && (
          <SectionBox box={small} title={titleText} body={bodyText} label="준비 시간 / 놀이 시간">
            <div>
              {prepTimeSection ? <span><b>준비 시간:</b> {prepTimeSection.content.replace(/\n/g," ").trim()}</span> : null}
              {playTimeSection ? <span style={{ marginLeft: "16px" }}><b>놀이 시간:</b> {playTimeSection.content.replace(/\n/g," ").trim()}</span> : null}
            </div>
          </SectionBox>
        )}

        {materialsSection && (<SectionBox box={small} title={titleText} body={bodyText} label="준비물">{renderTextWithLineBreaks(materialsSection.content)}</SectionBox>)}
        {goalSection && (<SectionBox box={small} title={titleText} body={bodyText} label="놀이 목표">{renderTextWithLineBreaks(goalSection.content)}</SectionBox>)}
        {devSection && (<SectionBox box={small} title={titleText} body={bodyText} label="발달 자극 요소">{renderTextWithLineBreaks(devSection.content)}</SectionBox>)}
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
            {renderTextWithLineBreaks(safetySection.content)}
          </SectionBox>
        ) : safetySection ? (
          <SectionBox box={small} title={titleText} body={bodyText} label="안전 주의">{renderTextWithLineBreaks(safetySection.content)}</SectionBox>
        ) : null}

        <SectionBox box={small} title={titleText} body={bodyText} label="놀이 방법">
          {methodHeader && /\S/.test(methodHeader.content) ? (   // ✅ content에 실제 글자가 있을 때만 렌더
            <div style={{ marginBottom: "6px" }}>
              {renderTextWithLineBreaks(methodHeader.content)}
            </div>
          ) : null}
          <div className="space-y-1" style={{ marginTop: 0 }}>   {/* 안전장치: 첫 블록 상단 여백 0 */}
            {methodSteps.map((s:any,i:number)=>(
              <div key={i}>
                <span style={{ fontWeight: 600 }}>
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
