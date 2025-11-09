// Patched on 2025-11-02 KST
// Baseline: V1.99A
// Changes: Insert handlePlaySelect; replace inline onPlaySelect; ensure minAge/maxAge mapping.
// ---------------------------------------------------------
// Annotated on 2025-11-01
// Based on user's latest page.tsx; fixed PlayListPanel import & props
// ---------------------------------------------------------
"use client"

import HideDocScrollbar from "@/components/HideDocScrollbar"
import { useState, useEffect, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { loadAllCategoriesIndependently } from "@/lib/data-parser"
import { loadChildProfile, loadLastSelectedTab, saveLastSelectedTab } from "@/lib/storage-core"
import { calculateBiologicalAge } from "@/lib/development-calculator"
import { calculateCategoryDevelopmentalAgeFromRecord } from "@/lib/storage-core"
import { loadCategoryRecord } from "@/lib/storage-category"
import { getPlayCategories, getCategoryColors } from "@/lib/types"
import { initializeGlobalCategories, getGlobalKoreanNames } from "@/lib/global-categories"
import type { PlayCategory, ChildProfile } from "@/lib/types"

// ✅ default export로 가져와야 합니다 (컴포넌트 정의 확인)
import PlayListPanel from "@/components/play-list-panel"
import PlayDetailPanel  from "@/components/play-detail-panel"
import { SettingsDialog } from "@/components/settings-dialog"
import { ChildProfileDialog } from "@/components/child-profile-dialog"
import { GraphTabs } from "@/components/graph-tabs"
import { UISettingsProvider } from "@/components/context/UISettingsContext"
import  UIDesignDialog  from "@/components/UIDesignDialog";
import { useUISettings } from '@/components/context/UISettingsContext';


// --- PATCH: local handler to fix TS2552 ---
const handlePlaySelect = (category: string, num: number) => {
  try { console.log("[DIAG B] handlePlaySelect", { category, num }); } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("komensky:playSelect", { detail: { category, num } })
    );
  }
  console.log("[PlaySelect]", { category, num });
};

export default function KomenskyPlayApp() {
// ===== [BRIDGE] BEGIN =====
useEffect(() => {
  const check = () => typeof (window as any).renderDetailPanel === 'function';
  console.log('[BRIDGE] page mount: typeof renderDetailPanel =', typeof (window as any).renderDetailPanel);

  if (!check()) {
    try {
      if (location.hash !== '#probe-legacy') {
        location.hash = '#probe-legacy';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        console.log('[BRIDGE] dispatched hashchange(#probe-legacy)');
      }
    } catch (e) {
      console.warn('[BRIDGE] hash trigger failed', e);
    }
  }

  let tries = 0;
  const t = setInterval(() => {
    const ok = check();
    console.log('[BRIDGE] poll renderDetailPanel:', ok, `(try=${++tries})`);
    if (ok || tries >= 8) clearInterval(t);
  }, 300);

  return () => clearInterval(t);
}, []);
// ===== [BRIDGE] END =====


  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [selectedTab, setSelectedTab] = useState<PlayCategory | "그래프">(() => {
    const categories = getGlobalKoreanNames()
    return categories.length > 0 ? (categories[0] as PlayCategory) : "그래프"
  })
  const [selectedPlay, setSelectedPlay] = useState<{ category: PlayCategory; number: number } | null>(null)
  const [playData, setPlayData] = useState<Record<PlayCategory, any[]>>({} as any)
  const [scrollPositions, setScrollPositions] = useState<Record<PlayCategory, number>>({} as any)
  const [categoryDevelopmentAges, setCategoryDevelopmentAges] = useState<Record<PlayCategory, number>>({} as any)
  const { settings } = useUISettings();
  const af = settings.activityFont;

  useEffect(() => {
    const initializeApp = async () => {
      await loadAllCategoriesIndependently()
      initializeGlobalCategories()

      const profile = loadChildProfile()
      if (!profile) {
        setShowProfileDialog(true)
      } else {
        setChildProfile(profile)
      }

      const lastTab = loadLastSelectedTab()
      const categories = getPlayCategories()
      if (categories.includes(lastTab)) {
        setSelectedTab(lastTab as PlayCategory)
      }
    }

    initializeApp()

    const handleCategoryRecalculation = (event: CustomEvent) => {
      const targetCategory = event.detail.category
      try {
        const record = loadCategoryRecord(targetCategory)
        const categoryAge =
          record ? calculateCategoryDevelopmentalAgeFromRecord(record) : 0
        setCategoryDevelopmentAges((prev) => ({
          ...prev,
          [targetCategory]: Math.round(categoryAge * 100) / 100,
        }))
      } catch (error) {
        console.error(`Failed to load achievements for ${targetCategory}:`, error)
        setCategoryDevelopmentAges((prev) => ({
          ...prev,
          [targetCategory]: 0,
        }))
      }
    }

    window.addEventListener("recalculateCategory", handleCategoryRecalculation as EventListener)

    let isDataLoaded = false
    const loadPlayDataFromFiles = async () => {
      if (isDataLoaded) return
      try {
        const categoriesData = await loadAllCategoriesIndependently()
        const convertedData: Record<PlayCategory, any[]> = {} as any
        Object.entries(categoriesData).forEach(([category, activities]) => {
          convertedData[category as PlayCategory] = activities
        })
        setPlayData(convertedData)

        const initialCategoryAges: Record<PlayCategory, number> = {} as any
        const categories = getPlayCategories()
        for (const category of categories) {
          try {
            const record = loadCategoryRecord(category)
            const categoryAge =
              record ? calculateCategoryDevelopmentalAgeFromRecord(record) : 0
            initialCategoryAges[category] = Math.round(categoryAge * 100) / 100
          } catch (error) {
            console.error(`Failed to load initial category ${category}:`, error)
            initialCategoryAges[category] = 0
          }
        }
        setCategoryDevelopmentAges(initialCategoryAges)
        isDataLoaded = true
      } catch (error) {
        console.error("Failed to load play data:", error)
      }
    }

    loadPlayDataFromFiles()

    return () => {
      window.removeEventListener("recalculateCategory", handleCategoryRecalculation as EventListener)
    }
  }, [])

  useEffect(() => {
    const updateScrollPosition = () => {
      if (selectedTab !== "그래프") {
        const scrollContainer = document.querySelector(`[data-category="${selectedTab}"]`)
        if (scrollContainer) {
          // optionally store scroll position
        }
      }
    }

    const timeoutId = setTimeout(() => {
      const scrollContainer =
        document.querySelector(`[data-category="${selectedTab}"]`) ||
        document.querySelector(".overflow-y-auto")
      if (scrollContainer) {
        scrollContainer.addEventListener("scroll", updateScrollPosition, { passive: true })
      }
    }, 500)

    return () => {
      clearTimeout(timeoutId)
      const scrollContainer = document.querySelector(`[data-category="${selectedTab}"]`)
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", updateScrollPosition)
      }
    }
  }, [selectedTab])

  useEffect(() => {
    if (selectedTab !== "그래프") {
      saveLastSelectedTab(selectedTab)
    }
  }, [selectedTab])

  const playCategories = getPlayCategories()
  const categoryColors = getCategoryColors()

  const overallDevelopmentAge = useMemo(() => {
    const validAges = Object.values(categoryDevelopmentAges).filter((age) => age > 0)
    if (validAges.length === 0) return 0
    const sum = validAges.reduce((acc, age) => acc + age, 0)
    const average = sum / playCategories.length
    return Math.round(average * 100) / 100
  }, [categoryDevelopmentAges, playCategories.length])

  const biologicalAge = childProfile ? calculateBiologicalAge(childProfile.birthDate) : 0
  const currentCategoryAge =
    selectedTab !== "그래프" ? categoryDevelopmentAges?.[selectedTab] || 0 : 0

  const handleTabChange = (value: string) => {
    if (selectedTab !== "그래프") {
      const scrollContainer =
        document.querySelector(`[data-category="${selectedTab}"]`) ||
        document.querySelector(".overflow-y-auto")
      if (scrollContainer) {
        const currentScrollTop = (scrollContainer as HTMLElement).scrollTop
        setScrollPositions((prev) => ({ ...prev, [selectedTab]: currentScrollTop }))
      } else {
        const windowScrollTop = window.scrollY || document.documentElement.scrollTop
        setScrollPositions((prev) => ({ ...prev, [selectedTab]: windowScrollTop }))
      }
    }

    setSelectedTab(value as PlayCategory | "그래프")
    setSelectedPlay(null)

    setTimeout(() => {
      if (value !== "그래프") {
        const newScrollContainer =
          document.querySelector(`[data-category="${value}"]`) ||
          document.querySelector(".overflow-y-auto")
        const savedPosition = scrollPositions[value as PlayCategory] || 0
        if (newScrollContainer) {
          (newScrollContainer as HTMLElement).scrollTop = savedPosition
        } else {
          window.scrollTo(0, savedPosition)
        }
      }
    }, 150)
  }

  const handlePlaySelect = (category: PlayCategory, number: number) => {
    if (selectedTab !== "그래프") {
      const scrollContainer =
        document.querySelector(`[data-category="${selectedTab}"]`) ||
        document.querySelector(".overflow-y-auto")
      if (scrollContainer) {
        const currentScrollTop = (scrollContainer as HTMLElement).scrollTop
        setScrollPositions((prev) => ({ ...prev, [selectedTab]: currentScrollTop }))
      }
    }
    setSelectedPlay({ category, number })
  }

  const handleBackToList = () => {
    setSelectedPlay(null)
    setTimeout(() => {
      if (selectedTab !== "그래프") {
        const scrollContainer =
          document.querySelector(`[data-category="${selectedTab}"]`) ||
          document.querySelector(".overflow-y-auto")
        const savedPosition = scrollPositions[selectedTab] || 0
        if (scrollContainer) {
          (scrollContainer as HTMLElement).scrollTop = savedPosition
        }
      }
    }, 150)
  }

  const handlePlayNavigate = (newPlayNumber: number) => {
    if (selectedPlay) {
      setSelectedPlay({ category: selectedPlay.category, number: newPlayNumber })
    }
  }

  const handleProfileSave = (profile: ChildProfile) => {
    setChildProfile(profile)
    setShowProfileDialog(false)
  }

  if (!childProfile) {
    return (
      <UISettingsProvider>
        <HideDocScrollbar />
        <div className="fixed top-4 left-4 z-50">
          <UIDesignDialog />
        </div>
      </UISettingsProvider>
    )
  }

  return (
    <UISettingsProvider>
      <div className="min-h-screen bg-background">
        {/* 헤더 */}
        <div data-ui="top-header" style={{
          backgroundColor: 'var(--kp-top-header-bg, #FFFFFF)',
          padding: 'var(--kp-top-header-padding, 12px)',
          borderWidth: 'var(--kp-top-header-border-width, 1px)',
          borderColor: 'var(--kp-top-header-border-color, rgba(0,0,0,0.12))',
          borderStyle: 'solid'
        }}>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <div className="justify-self-start">
              <UIDesignDialog />
            </div>
            <h2 data-ui="title" className="justify-self-center" style={{
              fontSize: 'var(--kp-title-size, 18px)',
              fontWeight: 'var(--kp-title-weight, 700)',
              color: 'var(--kp-title-color, #111111)'
            }}> 
              Komensky Play (V1.94C)
            </h2>
            <button
              className="justify-self-end p-1 hover:bg-accent rounded"
              onClick={() => setShowSettingsDialog(true)}
              aria-label="Open settings"
            >
              <svg className="w-6 h-6 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5A3.5 3.5 0 0 1 15.5 12A3.5 3.5 0 0 1 12 15.5m7.43-3.33l2.11-1.65l-2-3.46l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.5.5 0 0 0 12.5 1h-3a.5.5 0 0 0-.5.43l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1l-2 3.46l2.11 1.65c-.06.35-.11.69-.11 1.05s.05.7.11 1.05l-2.11 1.65l2 3.46l2.49-1c.52.39 1.06.73 1.69.98l.37 2.65c.03.24.25.43.5.43h3c.25 0 .47-.19.5-.43l.37-2.65c.63-.25 1.17-.59 1.69-.98l2.49 1l2-3.46l-2.11-1.65c.06-.35.11-.69.11-1.05s-.05-.7-.11-1.05z" />
              </svg>
            </button>
          </div>

          <div className="mt-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
            <div data-ui="namebio" className="text-center" style={{
              fontSize: 'var(--kp-namebio-size, 13px)',
              fontWeight: 'var(--kp-namebio-weight, 400)',
              color: 'var(--kp-namebio-color, #444444)'
            }}>
              {(childProfile?.name ?? "아이")} 나이: {biologicalAge.toFixed(2)}개월
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-center gap-3">
            <div data-ui="devage" style={{
              fontSize: 'var(--kp-devage-size, 14px)',
              fontWeight: 'var(--kp-devage-weight, 700)',
              color: 'var(--kp-devage-color, #0A66FF)'
            }}>
              발달 나이: {overallDevelopmentAge.toFixed(2)}개월
            </div>
            <div data-ui="catag" style={{
              fontSize: 'var(--kp-catag-size, 12px)',
              fontWeight: 'var(--kp-catag-weight, 700)',
              color: 'var(--kp-catag-color, inherit)'
            }}>
              {selectedTab !== "그래프" ? `${selectedTab} 나이: ${currentCategoryAge.toFixed(2)}개월` : " "}
            </div>
            <div>
              <Select value={selectedTab} onValueChange={handleTabChange}>
                <SelectTrigger className="w-auto min-w-[140px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPlayCategories().map((category) => (
                    <SelectItem key={category} value={category}>
                      <span style={{ color: categoryColors[category] }}>{category}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="그래프">그래프</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div>
          {getPlayCategories().map((category) => {
            if (selectedTab !== category) return null
            return (
              <div key={category}>
                {selectedPlay?.category === category ? ((() => { try { console.log("[DIAG C] render gate PASS", { category, selectedPlay }); } catch {} })(),
                  <PlayDetailPanel
                    category={category}
                    playNumber={selectedPlay.number}
                    onBack={handleBackToList}
                    onNavigate={handlePlayNavigate}
                    totalPlays={playData?.[category]?.length || 25}
                  />
                ) : (
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto" data-category={category}>
                    {/* ✅ PlayListPanel이 요구하는 items 형태로 변환해서 전달 */}
                    <PlayListPanel
                      items={(playData?.[category] || []).map((a: any) => {
const num = a.playNumber ?? a.num ?? a.number;
const minAge = (a.minAge ?? a.min ?? 0) as number;
const maxAge = (a.maxAge ?? a.max ?? a.minAge ?? a.min ?? 0) as number;

// 1) Consolidate achievement signals from arrays/fields/dates
const flagsFromArray = Array.isArray(a.achievedLevelFlags)
  ? a.achievedLevelFlags
  : Array.isArray(a.achievedDates)
    ? a.achievedDates.map((d: any) => !!d)
    : Array.isArray(a.achievedDate)
      ? a.achievedDate.map((d: any) => !!d)
      : undefined;

// Treat levelN true/1 OR dateN present as achieved
const flagsFromFields = [
  (a.level1 === 1 || a.level1 === true) || !!a.date1,
  (a.level2 === 1 || a.level2 === true) || !!a.date2,
  (a.level3 === 1 || a.level3 === true) || !!a.date3,
  (a.level4 === 1 || a.level4 === true) || !!a.date4,
  (a.level5 === 1 || a.level5 === true) || !!a.date5,
];

const rawFlags = flagsFromArray ?? flagsFromFields;
const flags: boolean[] = Array.isArray(rawFlags)
  ? rawFlags.slice(0, 5).map((v: any) => v === true || v === 1 || v === "1")
  : [false, false, false, false, false];

// 2) Highest: hint first, else 5->1 from flags
let highestLevel = 0;
const hinted =
  (typeof a.achievedLevel_Highest === "number" && a.achievedLevel_Highest >= 0 && a.achievedLevel_Highest <= 5)
    ? a.achievedLevel_Highest
    : undefined;

if (typeof hinted === "number") {
  highestLevel = hinted;
} else {
  for (let i = flags.length; i >= 1; i--) {
    if (flags[i - 1]) { highestLevel = i; break; }
  }
}

// 3) If still 0, fallback to komensky_top_achievements (category+num match) — single parse in parent code is ideal,
//    but here we avoid touching header logic; a local safe lookup is retained for compatibility.
if (highestLevel === 0 && typeof window !== "undefined") {
  try {
    const taRaw = window.localStorage.getItem("komensky_top_achievements");
    if (taRaw) {
      const ta = JSON.parse(taRaw);
      const arr = ta?.[category];
      if (Array.isArray(arr)) {
        const hit = arr.find((t: any) => (t.playNumber ?? t.num ?? t.number) === num);
        const al = typeof hit?.achievedLevel === "number" ? hit.achievedLevel : 0;
        if (al > highestLevel) highestLevel = al;
      }
    }
  } catch { /* ignore */ }
}

// 4) Color class
let levelColorClass = "level-color-0";
if (highestLevel >= 4) levelColorClass = "level-color-4-5";
else if (highestLevel === 3) levelColorClass = "level-color-3";
else if (highestLevel >= 1) levelColorClass = "level-color-1-2";

// Debug: 첫 번째 항목만 로그 출력
if (num === 1) {
  console.log('[AGE DEBUG]', { num, minAge, maxAge, raw: { minAge: a.minAge, maxAge: a.maxAge } });
}

return {
  key: `${category}-${num}`,
  num,
  title: a.playTitle ?? a.title,
  category,
  minAge,
  maxAge,
  highestLevel,
  levelColorClass,
};
})}
                      onPlaySelect={handlePlaySelect}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {selectedTab === "그래프" && Object.keys(playData || {}).length > 0 && (
            <section data-ui="graph-container">
              <GraphTabs
                childProfile={childProfile}
                categoryDevelopmentAges={categoryDevelopmentAges}
                playData={playData}
              />
            </section>
          )}

          {selectedTab === "그래프" && Object.keys(playData || {}).length === 0 && (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">데이터를 로딩 중입니다...</span>
            </div>
          )}
        </div>

        {/* 다이얼로그 */}
        <SettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          childProfile={childProfile}
          setChildProfile={setChildProfile}
          playData={playData}
        />
        <ChildProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          onSave={handleProfileSave}
          initialProfile={childProfile}
        />
      </div>
    </UISettingsProvider>
  )
}
