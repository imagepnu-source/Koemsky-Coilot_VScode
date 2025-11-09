
"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { CheckedState } from "@radix-ui/react-checkbox"

import { parseDetailedActivity, loadCategoryData, getEnglishCategoryName } from "@/lib/data-parser"
import { updateCategoryAchievement, removeCategoryAchievement } from "@/lib/category-achievements-manager"
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
    <div data-ui="detail-small-box" style={{ 
      borderWidth: 'var(--kp-detail-box-border-width, ' + b.bw + ')', 
      borderStyle: "solid", 
      borderColor: 'var(--kp-detail-box-border-color, ' + b.bc + ')', 
      background: 'var(--kp-detail-box-bg, ' + b.bg + ')', 
      borderRadius: 'var(--kp-detail-box-radius, ' + b.radius + ')', 
      padding: 'var(--kp-detail-box-padding, ' + b.py + ' ' + b.px + ')', 
      minHeight: b.h || undefined 
    }}>
      {props.label ? (<div style={{ 
        fontSize: 'var(--kp-detail-title-size, ' + t.size + ')', 
        color: 'var(--kp-detail-title-color, ' + t.color + ')', 
        fontWeight: 'var(--kp-detail-title-weight, ' + fwTitle + ')', 
        marginBottom: '6px', // 모든 소제목 다음에 6px 간격
        marginLeft: 'var(--kp-detail-title-indent, 0px)' // UI에서 제어
      }}>{props.label}</div>) : null}
      <div style={{ 
        fontSize: 'var(--kp-detail-body-size, ' + bd.size + ')', 
        color: 'var(--kp-detail-body-color, ' + bd.color + ')', 
        fontWeight: 'var(--kp-detail-body-weight, ' + fwBody + ')',
        marginLeft: 'var(--kp-detail-body-indent, 10px)' // UI에서 제어
      }}>{props.children}</div>
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

export default function PlayDetailPanel({ category, playNumber, onBack, onNavigate, totalPlays }: PlayDetailPanelProps) {
  const [detailData, setDetailData] = useState<DetailedActivity | null>(null)
  const [playActivity, setPlayActivity] = useState<PlayActivityLite | null>(null)
  const [completedLevels, setCompletedLevels] = useState<boolean[]>([false,false,false,false,false])
  const [loading, setLoading] = useState(true)
  const [hasFixedDifficulty, setHasFixedDifficulty] = useState(false)
  const [categoryTotalPlays, setCategoryTotalPlays] = useState<number>(totalPlays || 25)
  const DD = useDetailDesign()

  useEffect(() => {
    let alive = true
    const fx = async () => {
      try {
        const detailsText = await loadCategoryDetails(category)
        const parsedDetail = parseDetailedActivity(detailsText, playNumber)
        if (!alive) return
        setDetailData(parsedDetail)

        const categoryActivities: unknown = await loadCategoryData(category)
        if (!Array.isArray(categoryActivities)) throw new Error(`Category data is not an array: ${typeof categoryActivities}`)
        if (alive) setCategoryTotalPlays(categoryActivities.length)

        const currentActivity = (categoryActivities as any[]).find(a => a?.number === playNumber) as PlayActivityLite | undefined
        if (alive) setPlayActivity(currentActivity ?? null)

        const categoryRecord = loadCategoryRecord(category)
        if (alive) {
          if (categoryRecord) {
            const playData = categoryRecord.playData.find(p => p.playNumber === playNumber)
            setCompletedLevels(playData ? [...playData.achievedLevelFlags] : [false,false,false,false,false])
          } else {
            setCompletedLevels([false,false,false,false,false])
          }
        }
        if (currentActivity && currentActivity.minAge === currentActivity.maxAge) { if (alive) setHasFixedDifficulty(true) } else { if (alive) setHasFixedDifficulty(false) }
      } catch (e) {
        console.error(`[v0] Failed to load detail data for ${category} #${playNumber}:`, e)
      } finally {
        if (alive) setLoading(false)
      }
    }
    fx()
    return () => { alive = false }
  }, [category, playNumber])

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
      updateCategoryAchievement(category, act, achievedLevel, new Date())
      setTimeout(()=>{ window.dispatchEvent(new CustomEvent("recalculateCategory", { detail: { category } })) }, 0)
    } else {
      const rec = loadCategoryRecord(category)
      if (rec?.topAchievements) {
        rec.topAchievements.filter(a => a.playNumber === playNumber).forEach(a => {
          removeCategoryAchievement(category, a.playNumber, a.achievedLevel, a.developmentAge)
        })
      }
      setTimeout(()=>{ window.dispatchEvent(new CustomEvent("recalculateCategory", { detail: { category } })) }, 0)
    }
  }
  const renderTextWithLineBreaks = (text: string) => {
    const t = text ?? ""
    return t.split("\n").map((line, idx) => (
      <div key={idx} style={{ 
        fontSize: 'var(--kp-detail-body-size, 13px)', 
        color: 'var(--kp-detail-body-color, #333333)', 
        fontWeight: 'var(--kp-detail-body-weight, 400)' 
      }}>
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
  const findSection = (names: string[]) => detailData.sections?.find((s: any) => names.some(n => s.title.includes(n)))
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
      style={{ 
        borderWidth: 'var(--kp-detail-panel-border-width, ' + big.bw + ')', 
        borderStyle: "solid", 
        borderColor: 'var(--kp-detail-panel-border-color, ' + big.bc + ')', 
        background: 'var(--kp-detail-panel-bg, ' + big.bg + ')', 
        borderRadius: 'var(--kp-detail-panel-radius, ' + big.radius + ')', 
        padding: `${big.py} ${big.px}` 
      }}
      className="space-y-4"
    >
      {/* Play Detail Header */}
      <div data-ui="detail-header-container" style={{
        borderWidth: 'var(--kp-detail-header-border-width, 0px)',
        borderStyle: "solid",
        borderColor: 'var(--kp-detail-header-border-color, transparent)',
        background: 'var(--kp-detail-header-bg, #F9FAFB)',
        borderRadius: 'var(--kp-detail-header-radius, 8px)',
        padding: '12px'
      }}>
        {/* 제목 + 적정연령 배지 */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <h2 style={{ 
            fontSize: 'var(--kp-detail-header-title-size, 14px)',
            fontWeight: 'var(--kp-detail-header-title-weight, 700)',
            color: 'var(--kp-detail-header-title-color, #111111)'
          }}>
            {playNumber}. {playActivity.title}
          </h2>
          <div style={{
            fontSize: 'var(--kp-age-badge-font-size, 11px)',
            fontWeight: 'var(--kp-age-badge-weight, 400)',
            color: 'var(--kp-age-badge-color, #111111)',
            background: 'var(--kp-age-badge-bg, #FFFFFF)',
            borderWidth: 'var(--kp-age-badge-border-width, 1px)',
            borderStyle: 'solid',
            borderColor: 'var(--kp-age-badge-border-color, rgba(0,0,0,0.12))',
            borderRadius: 'var(--kp-age-badge-radius, 8px)',
            height: 'var(--kp-age-badge-height, 18px)',
            padding: 'var(--kp-age-badge-padding, 2px 6px)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {playActivity.ageRange}개월
          </div>
        </div>

        {/* 버튼들: 목록, 이전, 다음 */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            style={{
              fontSize: 'var(--kp-detail-header-list-btn-font-size, 12px)',
              fontWeight: 'var(--kp-detail-header-list-btn-weight, 700)',
              color: 'var(--kp-detail-header-list-btn-color, #111111)',
              background: 'var(--kp-detail-header-list-btn-bg, transparent)',
              borderWidth: 'var(--kp-detail-header-list-btn-border-width, 0px)',
              borderStyle: 'solid',
              borderColor: 'var(--kp-detail-header-list-btn-border-color, transparent)',
              borderRadius: 'var(--kp-detail-header-list-btn-radius, 6px)',
              padding: 'var(--kp-detail-header-list-btn-padding, 6px 12px)',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--kp-detail-header-list-btn-hover-bg, rgba(0,0,0,0.05))'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--kp-detail-header-list-btn-bg, transparent)'}
          >
            목록
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate?.(Math.max(1, playNumber - 1))}
              disabled={playNumber <= 1}
              style={{
                fontSize: 'var(--kp-detail-header-prev-btn-font-size, 12px)',
                fontWeight: 'var(--kp-detail-header-prev-btn-weight, 700)',
                color: 'var(--kp-detail-header-prev-btn-color, #111111)',
                background: 'var(--kp-detail-header-prev-btn-bg, transparent)',
                borderWidth: 'var(--kp-detail-header-prev-btn-border-width, 0px)',
                borderStyle: 'solid',
                borderColor: 'var(--kp-detail-header-prev-btn-border-color, transparent)',
                borderRadius: 'var(--kp-detail-header-prev-btn-radius, 6px)',
                padding: 'var(--kp-detail-header-prev-btn-padding, 6px 12px)',
                cursor: playNumber <= 1 ? 'not-allowed' : 'pointer',
                opacity: playNumber <= 1 ? 0.5 : 1,
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => { if (playNumber > 1) e.currentTarget.style.background = 'var(--kp-detail-header-prev-btn-hover-bg, rgba(0,0,0,0.05))' }}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--kp-detail-header-prev-btn-bg, transparent)'}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              이전
            </button>
            <button
              onClick={() => onNavigate?.(playNumber + 1)}
              disabled={playNumber >= categoryTotalPlays}
              style={{
                fontSize: 'var(--kp-detail-header-next-btn-font-size, 12px)',
                fontWeight: 'var(--kp-detail-header-next-btn-weight, 700)',
                color: 'var(--kp-detail-header-next-btn-color, #111111)',
                background: 'var(--kp-detail-header-next-btn-bg, transparent)',
                borderWidth: 'var(--kp-detail-header-next-btn-border-width, 0px)',
                borderStyle: 'solid',
                borderColor: 'var(--kp-detail-header-next-btn-border-color, transparent)',
                borderRadius: 'var(--kp-detail-header-next-btn-radius, 6px)',
                padding: 'var(--kp-detail-header-next-btn-padding, 6px 12px)',
                cursor: playNumber >= categoryTotalPlays ? 'not-allowed' : 'pointer',
                opacity: playNumber >= categoryTotalPlays ? 0.5 : 1,
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => { if (playNumber < categoryTotalPlays) e.currentTarget.style.background = 'var(--kp-detail-header-next-btn-hover-bg, rgba(0,0,0,0.05))' }}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--kp-detail-header-next-btn-bg, transparent)'}
            >
              다음
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
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
        
        {/* 안전 주의: 제목과 박스는 별도 스타일, 본문은 섹션 본문(소) 스타일 사용 */}
        {safetySection && (
          <div data-ui="safety-section" style={{ 
            borderWidth: 'var(--kp-safety-box-border-width, 1px)', 
            borderStyle: "solid", 
            borderColor: 'var(--kp-safety-box-border-color, #FFD700)', 
            background: 'var(--kp-safety-box-bg, #FFF9E6)', 
            borderRadius: 'var(--kp-safety-box-radius, 12px)', 
            padding: 'var(--kp-detail-box-padding, 10px 10px)'
          }}>
            <div style={{ 
              fontSize: 'var(--kp-safety-title-size, 16px)', 
              color: 'var(--kp-safety-title-color, #D97706)', 
              fontWeight: 'var(--kp-safety-title-weight, 700)', 
              marginBottom: '6px', // 안전 주의 제목 아래 6px
              marginLeft: 'var(--kp-safety-title-indent, 0px)' // UI에서 제어
            }}>안전 주의</div>
            <div style={{ 
              fontSize: 'var(--kp-detail-body-size, 13px)', 
              color: 'var(--kp-detail-body-color, #333333)', 
              fontWeight: 'var(--kp-detail-body-weight, 400)',
              marginLeft: 'var(--kp-detail-body-indent, 10px)' // UI에서 제어
            }}>{renderTextWithLineBreaks(safetySection.content)}</div>
          </div>
        )}        <SectionBox box={small} title={titleText} body={bodyText} label="놀이 방법">
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
          <div data-ui="difficulty-section" style={{ 
            borderWidth: 'var(--kp-detail-box-border-width, ' + small.bw + ')', 
            borderStyle: "solid", 
            borderColor: 'var(--kp-detail-box-border-color, ' + small.bc + ')', 
            background: 'var(--kp-detail-box-bg, ' + small.bg + ')', 
            borderRadius: 'var(--kp-detail-box-radius, ' + small.radius + ')', 
            padding: 'var(--kp-detail-box-padding, 10px 10px)'
          }}>
            {/* 난이도 섹션 제목 */}
            <div style={{ 
              fontSize: 'var(--kp-difficulty-title-size, 16px)', 
              color: 'var(--kp-difficulty-title-color, #111111)', 
              fontWeight: 'var(--kp-difficulty-title-weight, 700)', 
              marginBottom: '6px' // 난이도 제목 아래 6px
            }}>난이도 조절</div>

            {hasFixedDifficulty ? (
              <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.03)', marginLeft: 'var(--kp-detail-body-indent, 10px)' }}>
                <div className="flex items-start" style={{ gap: 'var(--kp-difficulty-checkbox-gap, 8px)' }}>
                  <Checkbox
                    id="level-3"
                    className="mt-1"
                    checked={completedLevels[2]}
                    onCheckedChange={(c) => handleLevelToggle(2, c)}
                    style={{
                      width: 'var(--kp-difficulty-checkbox-size, 20px)',
                      height: 'var(--kp-difficulty-checkbox-size, 20px)',
                    } as any}
                  />
                  <div style={{ 
                    fontSize: 'var(--kp-detail-body-size, 13px)', 
                    color: 'var(--kp-detail-body-color, #333333)', 
                    fontWeight: 'var(--kp-detail-body-weight, 400)' 
                  }}>
                    <label htmlFor="level-3" style={{ fontWeight: 'inherit' }}>Level 3</label> - 보통
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      이 놀이는 난이도를 조절할 수 없습니다.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2" style={{ marginLeft: 'var(--kp-detail-body-indent, 10px)' }}>
                {[1, 2, 3, 4, 5].map((level) => {
                  const key = `level${level}` as keyof NonNullable<typeof detailData["levels"]>;
                  const content = detailData.levels?.[key] ?? "";
                  const names = ["더 쉽게", "쉽게", "보통", "어렵게", "더 어렵게"];
                  return (
                    <div key={level} className="flex items-start" style={{ gap: 'var(--kp-difficulty-checkbox-gap, 8px)' }}>
                      <Checkbox
                        id={`level-${level}`}
                        className="mt-1"
                        checked={completedLevels[level - 1]}
                        onCheckedChange={(c) => handleLevelToggle(level - 1, c)}
                        style={{
                          width: 'var(--kp-difficulty-checkbox-size, 20px)',
                          height: 'var(--kp-difficulty-checkbox-size, 20px)',
                        } as any}
                      />
                      <div style={{ 
                        fontSize: 'var(--kp-detail-body-size, 13px)', 
                        color: 'var(--kp-detail-body-color, #333333)', 
                        fontWeight: 'var(--kp-detail-body-weight, 400)' 
                      }}>
                        <label htmlFor={`level-${level}`} style={{ fontWeight: 'inherit' }}>
                          Level {level}
                        </label>
                        {" - "}
                        <span style={{ fontWeight: 'inherit' }}>{names[level - 1]}</span>
                        <p style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {expansionSection && (<SectionBox box={small} title={titleText} body={bodyText} label="확장활동">{renderTextWithLineBreaks(expansionSection.content)}</SectionBox>)}
        {comenSection && (<SectionBox box={small} title={titleText} body={bodyText} label="코메니우스 철학 적용">{renderTextWithLineBreaks(comenSection.content)}</SectionBox>)}
      </div>
    </div>
  )
}
