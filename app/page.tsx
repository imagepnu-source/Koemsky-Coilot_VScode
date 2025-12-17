// Patched on 2025-12-11 KST
// Baseline: V2.00A
// Changes: Insert handlePlaySelect; replace inline onPlaySelect; ensure minAge/maxAge mapping.
// ---------------------------------------------------------
// Annotated on 2025-11-01
// Based on user's latest page.tsx; fixed PlayListPanel import & props
// ---------------------------------------------------------
// Annotated on 2025-12-11
// Move to Supabase
// ---------------------------------------------------------
"use client"

import HideDocScrollbar from "@/components/HideDocScrollbar"
import { useState, useEffect, useMemo, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { parsePlayData } from "@/lib/data-parser"
import { loadChildProfile, loadChildProfileForEmail, loadLastSelectedTab, saveLastSelectedTab } from "@/lib/storage-core"
import { calculateBiologicalAge } from "@/lib/development-calculator"
import { calculateCategoryDevelopmentalAgeFromRecord } from "@/lib/storage-core"
import { loadCategoryRecord, getChildCategoryStorageKey } from "@/lib/storage-category"
import { getPlayCategories, getCategoryColors } from "@/lib/types"
import { initializeGlobalCategories, getGlobalKoreanNames } from "@/lib/global-categories"
import type { PlayCategory, ChildProfile } from "@/lib/types"

// ✅ default export로 가져와야 합니다 (컴포넌트 정의 확인)
import PlayListPanel from "@/components/play-list-panel"
import PlayDetailPanel  from "@/components/play-detail-panel"
import HamburgerMenu from "@/components/HamburgerMenu"
import { AdminDialog } from "@/components/admin-dialog"
import { ChildProfileDialog } from "@/components/child-profile-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { GraphTabs } from "@/components/graph-tabs"
import { UISettingsProvider } from "@/components/context/UISettingsContext"
import  UIDesignDialog  from "@/components/UIDesignDialog";

import { loadUIDesignCfg, saveUIDesignCfg, applyUIDesignCSS, fetchGlobalUIDesignCfg } from '@/lib/ui-design';
import { supabase } from "@/lib/supabaseClient";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { IntroDialog } from "@/components/intro-dialog";
import { parseIntroText, type IntroPage } from "@/lib/intro-guide";

// Intro 3/5 페이지 테스트용 가상 상태 플래그
// - true 로 두면 실제 등록/아이 정보는 건드리지 않고
//   Intro 에서만 id/아이 없음 → 가상 id → 가상 아이 순으로 테스트할 수 있습니다.
// - 테스트가 끝나면 반드시 false 로 되돌리세요.
const INTRO_TEST_MODE = false;


// --- PATCH: local handler to fix TS2552 ---
const handlePlaySelect = (category: string, num: number) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("komensky:playSelect", { detail: { category, num } })
    );
  }
};

export default function KomenskyPlayApp() {
  const [showAdminDialog, setShowAdminDialog] = useState(false)
// ===== [BRIDGE] BEGIN =====
useEffect(() => {
  const check = () => typeof (window as any).renderDetailPanel === 'function';

  if (!check()) {
    try {
      if (location.hash !== '#probe-legacy') {
        location.hash = '#probe-legacy';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    } catch (e) {
      console.warn('[BRIDGE] hash trigger failed', e);
    }
  }

  let tries = 0;
  const t = setInterval(() => {
    const ok = check();
    if (ok || tries >= 8) clearInterval(t);
  }, 300);

  return () => clearInterval(t);
}, []);
// ===== [BRIDGE] END =====

  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showMobileDialog, setShowMobileDialog] = useState(false)
  const [pendingMobile, setPendingMobile] = useState("")
  const [savingMobile, setSavingMobile] = useState(false)
  const [mobileCheckedForSession, setMobileCheckedForSession] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      if (!supabase) {
        setAuthReady(true)
        return
      }
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn("[page] getSession error", error)
        }
        setSession(data?.session ?? null)
      } catch (e) {
        console.warn("[page] getSession unexpected error", e)
      } finally {
        setAuthReady(true)
      }

      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, newSession: Session | null) => {
          setSession(newSession)
          // 세션이 바뀌면, 새 세션에 대해 다시 모바일 여부를 점검해야 하므로 플래그 리셋
          setMobileCheckedForSession(false)
        },
      )

      return () => {
        if (sub?.subscription) {
          sub.subscription.unsubscribe()
        }
      }
    }

    initAuth()
  }, [])


  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showGuardianSettingsDialog, setShowGuardianSettingsDialog] = useState(false)
  const [showChildSettingsDialog, setShowChildSettingsDialog] = useState(false)
  // 마지막 뷰 상태를 복원하기 전까지는 저장 효과(useEffect)들을 잠시 비활성화하기 위한 플래그
  const hasHydratedLastView = useRef(false)
  const [selectedTab, setSelectedTab] = useState<PlayCategory | "그래프">(() => {
    // 클라이언트 환경에서는, 가능한 한 빨리 "마지막으로 선택했던 탭"을 초기값으로 사용
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        // 1차: LAST_VIEW_STATE 에 저장된 selectedTab 이 있으면 그것을 사용
        const raw = window.localStorage.getItem("komensky_last_view_state_v1")
        if (raw) {
          const parsed = JSON.parse(raw) as { selectedTab?: string }
          const categories = getGlobalKoreanNames()
          const tab = parsed.selectedTab
          if (tab && (categories.includes(tab as PlayCategory) || tab === "그래프")) {
            return tab as PlayCategory | "그래프"
          }
        }

        // 2차: 예전 방식의 마지막 탭(komensky_last_tab)
        const lastTab = loadLastSelectedTab()
        const categories = getGlobalKoreanNames()
        if (categories.includes(lastTab as PlayCategory) || lastTab === "그래프") {
          return lastTab as PlayCategory | "그래프"
        }
      } catch {
        // 실패 시 아래 기본값으로
      }
    }

    // 최종 fallback: 첫 번째 카테고리 또는 그래프
    const categories = getGlobalKoreanNames()
    return categories.length > 0 ? (categories[0] as PlayCategory) : "그래프"
  })
  const [selectedPlay, setSelectedPlay] = useState<{ category: PlayCategory; number: number } | null>(null)
  // 카테고리별 마지막 뷰 타입과 상태를 저장
  type CategoryLastView = {
    type: 'list' | 'detail',
    scrollPosition?: number,
    playNumber?: number
  }
  const [categoryLastView, setCategoryLastView] = useState<Record<PlayCategory, CategoryLastView>>({} as any)
  const [playData, setPlayData] = useState<Record<PlayCategory, any[]>>({} as any)
  const [categoryDevelopmentAges, setCategoryDevelopmentAges] = useState<Record<PlayCategory, number>>({} as any)
  // 리스트에서 "댓글 창 열기"로 들어왔는지 플래그
  const [pendingOpenComment, setPendingOpenComment] = useState<{ category: PlayCategory; number: number } | null>(null)

  // 처음 가입/로그인한 사용자에게만 Intro 가이드를 한 번 보여주기 위한 상태
  const [introPages, setIntroPages] = useState<IntroPage[] | null>(null)
  const [showIntro, setShowIntro] = useState(false)
  const [registeredChildCount, setRegisteredChildCount] = useState<number | undefined>(undefined)
  const [firstChildSummary, setFirstChildSummary] = useState<{ name: string; birthDate: string } | undefined>(undefined)

  const LAST_VIEW_STATE_KEY = "komensky_last_view_state_v1"

  // Load full UI design config (AllCfg)
  // - 기본적으로 localStorage 값을 사용하되,
  // - Supabase 전역 UI 설정이 있으면 그것을 **항상 우선 적용**하고 localStorage 에도 반영합니다.
  const [uiDesign, setUIDesign] = useState(() => (typeof window !== 'undefined' ? loadUIDesignCfg() : undefined));

  // 계정(세션)이 바뀔 때마다 Intro 용 아이 정보 요약 상태를 초기화합니다.
  // 이렇게 하면 이전 계정의 registeredChildCount/firstChildSummary 값이
  // 새 계정으로 넘어와 noChild/hasChild 조건이 잘못 해석되는 것을 막을 수 있습니다.
  useEffect(() => {
    setRegisteredChildCount(undefined);
    setFirstChildSummary(undefined);
  }, [session]);

  // 로그인된 사용자의 Supabase user_metadata 에 mobile 이 없으면
  // 앱 시작 시 휴대폰 번호 입력 다이얼로그를 강제로 띄웁니다.
  useEffect(() => {
    if (!session || !supabase) {
      return;
    }
    if (mobileCheckedForSession) {
      return;
    }
    const meta: any = (session.user as any).user_metadata || {};
    const existing = meta.mobile as string | undefined;
    if (!existing || !String(existing).trim()) {
      setPendingMobile("");
      setShowMobileDialog(true);
    }
    setMobileCheckedForSession(true);
  }, [session, mobileCheckedForSession]);

  // Intro 3/5 페이지에 표시되는 "아이 등록" 정보는 Supabase children 테이블을 기준으로만 계산합니다.
  // - 세션이 바뀌거나,
  // - SettingsDialog 에서 아이 정보를 저장/삭제할 때 발생시키는
  //   "komensky:childrenChanged" 이벤트가 발생하면 Supabase 를 다시 조회합니다.
  useEffect(() => {
    const accountId = session?.user?.id;
    if (!supabase || !accountId || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const refreshFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("children")
          .select("name, birth_date")
          .eq("user_id", accountId)
          .order("slot_index", { ascending: true });

        if (cancelled || error) {
          if (error) {
            console.warn("[page] Failed to load children from Supabase", error);
          }
          return;
        }

        const rows = (data || []) as Array<{ name: string; birth_date: string }>;
        if (rows.length === 0) {
          setRegisteredChildCount(0);
          setFirstChildSummary(undefined);
          return;
        }

        setRegisteredChildCount(rows.length);
        const first = rows[0];
        setFirstChildSummary({
          name: (first.name || "").trim(),
          birthDate: String(first.birth_date || ""),
        });
      } catch (e) {
        if (!cancelled) {
          console.warn("[page] Unexpected error while loading children from Supabase", e);
        }
      }
    };

    const handleChildrenChanged = () => {
      if (!cancelled) {
        refreshFromSupabase();
      }
    };

    refreshFromSupabase();
    window.addEventListener("komensky:childrenChanged", handleChildrenChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("komensky:childrenChanged", handleChildrenChanged);
    };
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const handler = () => {
      const newCfg = loadUIDesignCfg();
      setUIDesign(newCfg);
      applyUIDesignCSS(newCfg);
    };

    const initUIDesign = async () => {
      // 1) 우선 localStorage 에 저장된 UI Set 을 읽어 둡니다.
      let cfg = loadUIDesignCfg();

      // 2) Supabase 전역 UI 설정이 있으면 항상 그것을 우선 적용하고,
      //    localStorage 에도 동일한 값으로 덮어써서 모든 기기에서 같은 UI 를 사용합니다.
      try {
        if (supabase) {
          const remote = await fetchGlobalUIDesignCfg();
          if (remote) {
            cfg = remote;
            saveUIDesignCfg(remote);
          }
        }
      } catch (e) {
        console.warn('[page] Failed to load global UI settings, fallback to local only:', e);
      }

      if (cancelled) return;

      setUIDesign(cfg);
      applyUIDesignCSS(cfg);

      // Save 버튼(전역 저장) 뿐 아니라, 편집 중 실시간 미리보기 이벤트도 모두 수신
      window.addEventListener('ui-design-updated', handler);
      window.addEventListener('ui-design-preview-updated', handler);
    };

    initUIDesign();

    return () => {
      cancelled = true;
      window.removeEventListener('ui-design-updated', handler);
      window.removeEventListener('ui-design-preview-updated', handler);
    };
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      // 로그인 세션이 준비되기 전에는 초기화를 미룹니다.
      if (!authReady || !session) return
      // play_data.txt 는 아래 loadPlayDataFromFiles() 에서 한 번만 로딩/파싱합니다.
      initializeGlobalCategories();

      const userEmail = session.user?.email ?? null;
      // 1순위: 계정별 저장된 아이 프로필, 2순위: 기존 전역 프로필 (메인 화면용)
      const profileFromEmail = loadChildProfileForEmail(userEmail);
      const profile = profileFromEmail ?? loadChildProfile();
      if (!profile) {
        setShowProfileDialog(true);
      } else {
        setChildProfile(profile);
      }

      // Supabase에서 해당 아이의 카테고리별 놀이 기록(CategoryRecord)을 불러와 localStorage에 반영
      try {
        if (supabase && profile) {
          const safeName = (profile.name || "").trim() || "아기";
          const datePart = profile.birthDate.toISOString().split("T")[0];
          const childId = `${safeName}_${datePart}`;

          const { data: sessionData } = await supabase.auth.getSession();
          const accountId = sessionData?.session?.user?.id;

          const { data, error } = await supabase
            .from("category_records")
            .select("category, record")
            .eq("child_id", childId);

          if (!error && data) {
            const remoteCategories = new Set<string>();
            for (const row of data as any[]) {
              const cat = row.category as string;
              remoteCategories.add(cat);
              try {
                const key = getChildCategoryStorageKey(cat as PlayCategory, profile);

                const remoteRecord = row.record as any;
                const existingStr = localStorage.getItem(key);
                let merged: any = remoteRecord;

                if (existingStr) {
                  try {
                    const existing = JSON.parse(existingStr);
                    merged = {
                      ...existing,
                      ...remoteRecord,
                      categoryName: existing.categoryName ?? remoteRecord?.categoryName ?? cat,
                      provided_playList:
                        existing.provided_playList ?? remoteRecord?.provided_playList ?? [],
                    };
                  } catch {
                    // fallback: use remoteRecord as-is
                    merged = remoteRecord;
                  }
                }

                localStorage.setItem(key, JSON.stringify(merged));
              } catch (e) {
                console.warn("[page] Failed to hydrate local category record from Supabase", cat, e);
              }
            }

            // 로컬에는 있는데 Supabase에는 없는 카테고리는 한 번 업로드(마이그레이션)
            try {
              const categories = getPlayCategories();
              for (const cat of categories) {
                if (remoteCategories.has(cat)) continue;
                const key = getChildCategoryStorageKey(cat as PlayCategory, profile);
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                try {
                  const record = JSON.parse(raw);
                  const payload = {
                    child_id: childId,
                    category: cat,
                    record,
                  };

                  await supabase.from("category_records").upsert(payload);
                } catch (e) {
                  console.warn("[page] Failed to migrate local category record to Supabase", cat, e);
                }
              }
            } catch (e) {
              console.warn("[page] Failed to run category_records migration:", e);
            }
          }
        }
      } catch (e) {
        console.warn("[page] Supabase category_records hydrate error:", e);
      }

      // 마지막 뷰 상태(카테고리/리스트·상세/스크롤/선택놀이)를 복원 시도
      let restoredTabFromLastView = false
      try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(LAST_VIEW_STATE_KEY) : null
        if (raw) {
          const parsed = JSON.parse(raw) as {
            selectedTab?: string
            selectedPlay?: { category: PlayCategory; number: number } | null
            categoryLastView?: Record<PlayCategory, CategoryLastView>
          }

          const categories = getPlayCategories()
          const tab = parsed.selectedTab
          const hasValidTab = !!(tab && (categories.includes(tab as PlayCategory) || tab === "그래프"))
          if (hasValidTab) {
            setSelectedTab(tab as PlayCategory | "그래프")
            restoredTabFromLastView = true
          }

          if (parsed.categoryLastView) {
            const nextView: Record<PlayCategory, CategoryLastView> = {} as any
            categories.forEach((cat) => {
              const v = (parsed.categoryLastView as any)[cat]
              if (v && (v.type === "list" || v.type === "detail")) {
                nextView[cat as PlayCategory] = {
                  type: v.type,
                  scrollPosition:
                    typeof v.scrollPosition === "number" ? v.scrollPosition : 0,
                  playNumber:
                    typeof v.playNumber === "number" ? v.playNumber : undefined,
                }
              }
            })
            setCategoryLastView(nextView)
          }

          if (
            parsed.selectedPlay &&
            parsed.selectedPlay.category &&
            getPlayCategories().includes(parsed.selectedPlay.category)
          ) {
            setSelectedPlay(parsed.selectedPlay)
          }
        }
      } catch (e) {
        console.warn("[page] Failed to load last view state", e)
      }

      // fallback: 예전 버전의 "마지막 선택 탭"만 복원
      if (!restoredTabFromLastView) {
        const lastTab = loadLastSelectedTab();
        const categories = getPlayCategories();
        if (categories.includes(lastTab as PlayCategory) || lastTab === "그래프") {
          setSelectedTab(lastTab as PlayCategory | "그래프");
        }
      }

      // Intro.txt 를 항상 파싱해서 pages 상태에 보관하고,
      // 아직 본 적 없는 사용자에게만 자동으로 한 번 띄웁니다.
      try {
        if (typeof window !== "undefined") {
          const userId = session?.user?.id || "anonymous";
          const seenKey = `komensky_intro_seen_v2_${userId}`;
          const seen = INTRO_TEST_MODE ? null : window.localStorage.getItem(seenKey);

          const resIntro = await fetch("/Intro.txt");
          if (resIntro.ok) {
            const txt = await resIntro.text();
            const pages = parseIntroText(txt);
            if (pages.length > 0) {
              setIntroPages(pages);
              if (!seen) {
                setShowIntro(true);
              }
            }
          }
        }
      } catch (e) {
        console.warn("[page] Failed to load Intro.txt", e);
      }

      // 여기까지 오면, 마지막 뷰/탭 복원 로직이 한 번 완료된 상태이므로
      // 이후부터는 selectedTab/selectedPlay/categoryLastView 변경을 localStorage에 저장해도 안전함
      hasHydratedLastView.current = true
    };

    initializeApp();

    const handleCategoryRecalculation = (event: CustomEvent) => {
      const targetCategory = event.detail.category as string

      // "*" 가 오면 모든 카테고리에 대해 발달 나이를 다시 계산합니다.
      if (targetCategory === "*") {
        const categories = getPlayCategories()
        const next: Record<PlayCategory, number> = {} as any
        for (const category of categories) {
          try {
            const record = loadCategoryRecord(category)
            const categoryAge =
              record ? calculateCategoryDevelopmentalAgeFromRecord(record) : 0
            next[category] = Math.round(categoryAge * 100) / 100
          } catch (error) {
            console.error(`Failed to load achievements for ${category}:`, error)
            next[category] = 0
          }
        }
        setCategoryDevelopmentAges(next)
        return
      }

      try {
        const record = loadCategoryRecord(targetCategory as PlayCategory)
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
      if (isDataLoaded) return;
      try {
        const res = await fetch("/play_data.txt");
        const text = await res.text();
        const parsed = parsePlayData(text);
        setPlayData(parsed as Record<PlayCategory, any[]>);

        const initialCategoryAges: Record<PlayCategory, number> = {} as any;
        const categories = getPlayCategories();
        for (const category of categories) {
          try {
            const record = loadCategoryRecord(category);
            const categoryAge =
              record ? calculateCategoryDevelopmentalAgeFromRecord(record) : 0;
            initialCategoryAges[category] = Math.round(categoryAge * 100) / 100;
          } catch (error) {
            console.error(`Failed to load initial category ${category}:`, error);
            initialCategoryAges[category] = 0;
          }
        }
        setCategoryDevelopmentAges(initialCategoryAges);
        isDataLoaded = true;
      } catch (error) {
        console.error("Failed to load play data:", error);
      }
    };

    loadPlayDataFromFiles();

    return () => {
      window.removeEventListener("recalculateCategory", handleCategoryRecalculation as EventListener)
    }
  }, [authReady, session])

  useEffect(() => {
    const updateScrollPosition = () => {
      if (selectedTab !== "그래프") {
        const scrollContainer = document.querySelector(`[data-category="${selectedTab}"]`)
        if (scrollContainer) {
          const currentScrollTop = (scrollContainer as HTMLElement).scrollTop
          setCategoryLastView((prev) => ({
            ...prev,
            [selectedTab]: {
              ...(prev[selectedTab] || {}),
              type: prev[selectedTab]?.type || "list",
              scrollPosition: currentScrollTop,
            },
          }))
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

  // 앱 재시작/새로고침 후, 마지막으로 보던 카테고리 리스트의 스크롤 위치를 복원
  useEffect(() => {
    // 초기 복원이 끝나기 전에는 DOM 스크롤을 건드리지 않는다.
    if (!hasHydratedLastView.current) return
    if (selectedTab === "그래프") return

    const view = categoryLastView[selectedTab as PlayCategory]
    if (!view || view.type !== "list") return

    const savedPosition = typeof view.scrollPosition === "number" ? view.scrollPosition : 0
    const scrollContainer =
      document.querySelector(`[data-category="${selectedTab}"]`) ||
      document.querySelector(".overflow-y-auto")

    if (scrollContainer) {
      ;(scrollContainer as HTMLElement).scrollTop = savedPosition
    }
  }, [selectedTab, categoryLastView])

  // 현재 선택된 상단 탭(카테고리 또는 "그래프")을 항상 저장
  useEffect(() => {
    // 아직 초기 복원 단계라면, 예전 상태를 덮어쓰지 않도록 저장을 건너뜁니다.
    if (!hasHydratedLastView.current) return
    saveLastSelectedTab(selectedTab)
  }, [selectedTab])

  // 카테고리별 마지막 뷰 상태 + 선택된 놀이를 localStorage 에 저장
  useEffect(() => {
    if (typeof window === "undefined") return
    // 초기 복원이 끝나기 전에는, 잘못된 기본값(예: 첫 카테고리)을 저장하지 않도록 우선 건너뜁니다.
    if (!hasHydratedLastView.current) return
    try {
      const payload = {
        selectedTab,
        selectedPlay,
        categoryLastView,
      }
      window.localStorage.setItem(LAST_VIEW_STATE_KEY, JSON.stringify(payload))
    } catch (e) {
      console.warn("[page] Failed to save last view state", e)
    }
  }, [selectedTab, selectedPlay, categoryLastView])

  // 탭(카테고리)을 다시 열 때마다 Supabase에서 해당 카테고리의 최신 놀이 기록을 가져와
  // localStorage 및 발달나이 상태를 갱신하여 PC/모바일 간 Level UI를 동기화
  useEffect(() => {
    if (!childProfile || !supabase) return
    if (selectedTab === "그래프") return

    let cancelled = false

    const refreshCategoryFromSupabase = async () => {
      try {
        const safeName = (childProfile.name || "").trim() || "아기"
        const datePart = childProfile.birthDate.toISOString().split("T")[0]
        const childId = `${safeName}_${datePart}`

        const { data, error } = await supabase
          .from("category_records")
          .select("record")
          .eq("child_id", childId)
          .eq("category", selectedTab)
          .maybeSingle()

        if (!error && data && !cancelled) {
          try {
            const key = getChildCategoryStorageKey(selectedTab as PlayCategory, childProfile)

            const remoteRecord = (data as any).record as any
            const existingStr = localStorage.getItem(key)
            let merged: any = remoteRecord

            if (existingStr) {
              try {
                const existing = JSON.parse(existingStr)
                merged = {
                  ...existing,
                  ...remoteRecord,
                  categoryName: existing.categoryName ?? remoteRecord?.categoryName ?? selectedTab,
                  provided_playList:
                    existing.provided_playList ?? remoteRecord?.provided_playList ?? [],
                }
              } catch {
                merged = remoteRecord
              }
            }

            localStorage.setItem(key, JSON.stringify(merged))
          } catch (e) {
            console.warn("[page] Failed to refresh local category record from Supabase", selectedTab, e)
          }

          try {
            const record = loadCategoryRecord(selectedTab as PlayCategory)
            const categoryAge = record
              ? calculateCategoryDevelopmentalAgeFromRecord(record)
              : 0
            setCategoryDevelopmentAges((prev) => ({
              ...prev,
              [selectedTab as PlayCategory]: Math.round(categoryAge * 100) / 100,
            }))
          } catch (e) {
            console.warn("[page] Failed to recalc category age after Supabase refresh", selectedTab, e)
          }
        }
      } catch (e) {
        console.warn("[page] Supabase refresh error for category", selectedTab, e)
      }
    }

    refreshCategoryFromSupabase()

    return () => {
      cancelled = true
    }
  }, [selectedTab, childProfile])

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

  const childIdentity = useMemo(() => {
    if (!childProfile) return undefined
    const safeName = (childProfile.name || "").trim() || "아기"
    const datePart = childProfile.birthDate.toISOString().split("T")[0]
    return {
      id: `${safeName}_${datePart}`,
      name: safeName,
    }
  }, [childProfile])

  const hasRegisteredChild = (registeredChildCount ?? 0) > 0

  // Intro 3/5 페이지용 가상 상태 (테스트 모드에서만 사용)
  const [introTestPhase, setIntroTestPhase] = useState<"none" | "idOnly" | "idAndChild">("none")

  const introEffectiveEmail = INTRO_TEST_MODE
    ? (introTestPhase === "none" ? null : "test0001@gmail.com")
    : (session?.user?.email ?? null)

  const introEffectiveRegisteredChildCount = INTRO_TEST_MODE
    ? (introTestPhase === "idAndChild" ? 1 : 0)
    : registeredChildCount

  const introEffectiveFirstChildName = INTRO_TEST_MODE && introTestPhase === "idAndChild"
    ? "김TT"
    : firstChildSummary?.name

  const introEffectiveFirstChildBirthDate = INTRO_TEST_MODE && introTestPhase === "idAndChild"
    ? "2025년 1월 1일"
    : firstChildSummary?.birthDate

  const handleIntroOpenSignup = () => {
    if (INTRO_TEST_MODE) {
      // 가상 id 등록 완료 상태로 전환 (Intro 내에서만 사용)
      setIntroTestPhase("idOnly")
    } else {
      setShowAuthDialog(true)
    }
  }

  const handleIntroOpenSettings = () => {
    if (INTRO_TEST_MODE) {
      // 가상 아이 정보 등록 완료 상태로 전환 (Intro 내에서만 사용)
      setIntroTestPhase("idAndChild")
    } else {
      // Intro에서는 아이 정보 설정 창을 여는 것이 자연스럽습니다.
      setShowChildSettingsDialog(true)
    }
  }

  // 로그인 준비 전에는 아무 것도 렌더링하지 않음
  if (!authReady) {
    return null
  }

  // 세션이 없으면 로그인/회원가입 다이얼로그만 표시
  if (!session) {
    return (
      <UISettingsProvider>
        <HideDocScrollbar />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <h1 className="text-lg font-semibold">Komensky Play</h1>
          <Button onClick={() => setShowAuthDialog(true)}>Log In / Sign Up</Button>
          <AuthDialog
            open={showAuthDialog}
            onAuthenticated={() => {
              setShowAuthDialog(false)
            }}
          />
        </div>
      </UISettingsProvider>
    )
  }

  const handleTabChange = (value: string) => {
    if (selectedTab !== "그래프") {
      const scrollContainer =
        document.querySelector(`[data-category="${selectedTab}"]`) ||
        document.querySelector(".overflow-y-auto")
      if (scrollContainer) {
        const currentScrollTop = (scrollContainer as HTMLElement).scrollTop
        setCategoryLastView((prev) => ({
          ...prev,
          [selectedTab]: {
            ...(prev[selectedTab] || {}),
            ...(prev[selectedTab]?.type === 'detail' ? { playNumber: prev[selectedTab].playNumber } : {}),
            type: prev[selectedTab]?.type || 'list',
            scrollPosition: currentScrollTop
          }
        }))
      }
    }

    setSelectedTab(value as PlayCategory | "그래프")

    // 카테고리별 마지막 뷰 타입/상태로 복원
    if (value !== "그래프") {
      const lastView = categoryLastView[value as PlayCategory];
      if (lastView) {
        if (lastView.type === 'detail' && lastView.playNumber) {
          setSelectedPlay({ category: value as PlayCategory, number: lastView.playNumber });
        } else {
          setSelectedPlay(null);
        }
      } else {
        setSelectedPlay(null);
      }
    } else {
      setSelectedPlay(null);
    }

    setTimeout(() => {
      if (value !== "그래프") {
        const newScrollContainer =
          document.querySelector(`[data-category="${value}"]`) ||
          document.querySelector(".overflow-y-auto")
        const lastView = categoryLastView[value as PlayCategory];
        const savedPosition = lastView?.type === 'list' ? (lastView.scrollPosition || 0) : 0;
        if (newScrollContainer) {
          (newScrollContainer as HTMLElement).scrollTop = savedPosition
        } else {
          window.scrollTo(0, savedPosition)
        }
      }
    }, 150)
  }

  const handlePlaySelect = (category: PlayCategory, number: number) => {
    setSelectedPlay({ category, number })
    setCategoryLastView((prev) => ({
      ...prev,
      [category]: {
        type: 'detail',
        playNumber: number,
        scrollPosition: prev[category]?.scrollPosition || 0
      }
    }))
    // 기본 선택에서는 댓글 자동 오픈 플래그 초기화
    setPendingOpenComment(null)
  }

  const handleBackToList = () => {
    // 현재 탭에서 리스트를 보던 스크롤 위치를 우선 읽어 둔다.
    const lastView = categoryLastView[selectedTab]
    const lastPosition = lastView?.scrollPosition || 0
    const lastPlayNumber = lastView?.playNumber

    setSelectedPlay(null)
    setCategoryLastView((prev) => {
      return {
        ...prev,
        [selectedTab]: {
          type: "list",
          scrollPosition: lastPosition,
          playNumber:
            lastPlayNumber !== undefined
              ? lastPlayNumber
              : prev[selectedTab]?.playNumber || undefined,
        },
      }
    })
    // 약간의 지연 후, 실제 스크롤 컨테이너(카테고리 div)의 scrollTop 을 복원한다.
    setTimeout(() => {
      if (selectedTab !== "그래프") {
        const scrollContainer =
          document.querySelector(`[data-category="${selectedTab}"]`) ||
          document.querySelector(".overflow-y-auto")
        if (scrollContainer) {
          ;(scrollContainer as HTMLElement).scrollTop = lastPosition
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
        {/* UIDesignDialog는 헤더 내부로 이동 */}
        {introPages && (
          <IntroDialog
            open={showIntro && !showMobileDialog}
            pages={introPages}
            currentEmail={introEffectiveEmail}
            registeredChildCount={introEffectiveRegisteredChildCount}
            firstChildName={introEffectiveFirstChildName}
            firstChildBirthDate={introEffectiveFirstChildBirthDate}
            onOpenSettings={handleIntroOpenSettings}
            onOpenSignup={handleIntroOpenSignup}
            onComplete={() => {
              setShowIntro(false)
              try {
                if (typeof window !== "undefined") {
                  if (!INTRO_TEST_MODE) {
                    const userId = session?.user?.id || "anonymous"
                    const seenKey = `komensky_intro_seen_v2_${userId}`
                    window.localStorage.setItem(seenKey, "true")
                  }
                }
              } catch {
                // ignore
              }
            }}
          />
        )}
      </UISettingsProvider>
    )
  }


  return (
    <UISettingsProvider>
      <div className="min-h-screen bg-background">
        {/* 좌측 상단 고정 햄버거 메뉴 */}
        <HamburgerMenu
          onOpenGuardianSettings={() => setShowGuardianSettingsDialog(true)}
          onOpenChildSettings={() => setShowChildSettingsDialog(true)}
          onOpenAdminTools={() => setShowAdminDialog(true)}
          onOpenIntro={() => {
            if (introPages && introPages.length > 0) {
              setShowIntro(true)
            }
          }}
        />
          {/* 관리자 전용 다이얼로그 */}
          <AdminDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} childProfile={childProfile} playData={playData} />
        {/* 휴대폰 번호 필수 입력 다이얼로그 */}
        {showMobileDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-md shadow-lg p-4 w-[90vw] max-w-sm space-y-3">
              <h2 className="text-base font-semibold">휴대폰 번호 등록</h2>
              <p className="text-xs text-gray-600 whitespace-pre-line">
                {"서비스 이용을 위해 휴대폰 번호가 필요합니다.\n본인 연락이 가능한 번호를 입력해 주세요."}
              </p>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                type="tel"
                value={pendingMobile}
                placeholder="예: 010-1234-5678"
                onChange={(e) => setPendingMobile(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={savingMobile}
                  onClick={async () => {
                    const raw = pendingMobile;
                    const normalized = raw.replace(/\D/g, "");
                    if (!normalized) return;
                    // 한국 휴대폰 기준으로 10~11자리만 허용
                    if (normalized.length < 10 || normalized.length > 11) {
                      alert("휴대폰 번호 형식이 올바르지 않습니다. 예: 010-1234-5678");
                      return;
                    }
                    if (!supabase || !session) return;
                    try {
                      setSavingMobile(true);
                      const { error } = await supabase.auth.updateUser({
                        // 항상 숫자만 저장 (예: 01040422450)
                        data: { mobile: normalized },
                      } as any);
                      if (error) {
                        console.error("[page] updateUser(mobile) error", error);
                        return;
                      }
                      // 세션 정보를 갱신하여 user_metadata 를 업데이트
                      const { data, error: sErr } = await supabase.auth.getSession();
                      if (!sErr && data?.session) {
                        setSession(data.session);
                      }
                      setShowMobileDialog(false);
                    } finally {
                      setSavingMobile(false);
                    }
                  }}
                >
                  저장
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* 헤더 */}
        <div
          data-ui="top-header"
          style={{
            background: uiDesign?.topHeaderBox?.bg,
            borderWidth: uiDesign?.topHeaderBox?.border?.width,
            borderColor: uiDesign?.topHeaderBox?.border?.color,
            borderStyle: 'solid',
            padding: uiDesign?.topHeaderBox?.padding ? `${uiDesign.topHeaderBox.padding}px` : undefined,
          }}
        >
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            {/* 왼쪽 공간 비움 (uSet 버튼 제거) */}
            <div className="justify-self-start"></div>
            <h2
              data-ui="title"
              className="justify-self-center"
              style={{
                fontSize: uiDesign?.title?.size ? `${uiDesign.title.size}px` : undefined,
                fontWeight: uiDesign?.title?.bold ? 700 : 400,
                color: uiDesign?.title?.color,
                fontFamily: uiDesign?.title?.family,
              }}
            >
              Komensky 1000 (V2.10A)
            </h2>
            <div className="flex items-center justify-end gap-2">
              <UIDesignDialog />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
            <div
              data-ui="namebio"
              className="text-center"
              style={{
                fontSize: uiDesign?.namebio?.size ? `${uiDesign.namebio.size}px` : undefined,
                fontWeight: uiDesign?.namebio?.bold ? 700 : 400,
                color: uiDesign?.namebio?.color,
                fontFamily: uiDesign?.namebio?.family,
                lineHeight: 1.2,
              }}
            >
              {hasRegisteredChild
                ? `${((childProfile?.name || "").trim() || "아이")} 나이: ${biologicalAge.toFixed(2)}개월`
                : "등록된 아이가 없습니다. 아이 정보를 먼저 등록해 주세요."}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-center gap-3">
            <div
              data-ui="devage"
              style={{
                fontSize: uiDesign?.devage?.size ? `${uiDesign.devage.size}px` : undefined,
                fontWeight: uiDesign?.devage?.bold ? 700 : 400,
                color: uiDesign?.devage?.color,
                fontFamily: uiDesign?.devage?.family,
                lineHeight: 1.2,
                whiteSpace: 'pre-line',
              }}
            >
              {`발달 나이:\n${overallDevelopmentAge.toFixed(2)}개월`}
            </div>
            <div
              data-ui="catag"
              style={{
                fontSize: uiDesign?.catag?.size ? `${uiDesign.catag?.size}px` : undefined,
                fontWeight: uiDesign?.catag?.bold ? 700 : 400,
                color: uiDesign?.catag?.color,
                lineHeight: 1.2,
                whiteSpace: 'pre-line',
              }}
            >
              {selectedTab !== "그래프" ? `${selectedTab} 나이:\n${currentCategoryAge.toFixed(2)}개월` : " "}
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

        {introPages && (
          <IntroDialog
            open={showIntro && !showMobileDialog}
            pages={introPages}
            currentEmail={introEffectiveEmail}
            registeredChildCount={introEffectiveRegisteredChildCount}
            firstChildName={introEffectiveFirstChildName}
            firstChildBirthDate={introEffectiveFirstChildBirthDate}
            onOpenSettings={handleIntroOpenSettings}
            onOpenSignup={handleIntroOpenSignup}
            onComplete={() => {
              setShowIntro(false)
              try {
                if (typeof window !== "undefined") {
                  if (!INTRO_TEST_MODE) {
                    const userId = session?.user?.id || "anonymous"
                    const seenKey = `komensky_intro_seen_v2_${userId}`
                    window.localStorage.setItem(seenKey, "true")
                  }
                }
              } catch {
                // ignore
              }
            }}
          />
        )}

        {/* 본문 */}
        <div>
          {getPlayCategories().map((category) => {
            if (selectedTab !== category) return null
            return (
              <div key={category}>
                {selectedPlay?.category === category ? (
                  <PlayDetailPanel
                    category={category}
                    playNumber={selectedPlay.number}
                    onBack={handleBackToList}
                    onNavigate={handlePlayNavigate}
                    totalPlays={playData?.[category]?.length || 25}
                    uiDesign={uiDesign}
                    childProfile={childIdentity}
                    autoOpenComment={!!(pendingOpenComment && pendingOpenComment.category === category && pendingOpenComment.number === selectedPlay.number)}
                    activity={(() => {
                      const found = (playData?.[category] || []).find((a: any) => {
                        const num = a.playNumber ?? a.num ?? a.number;
                        return num === selectedPlay.number;
                      });
                      if (found) return found;
                      // fallback: minimal object to prevent null
                      return {
                        number: selectedPlay.number,
                        title: '',
                        ageRange: '',
                        minAge: 0,
                        maxAge: 0,
                        category,
                      };
                    })()}
                  />
                ) : (
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto" data-category={category}>
                    {/* ✅ PlayListPanel이 요구하는 items 형태로 변환해서 전달 */}
                    <PlayListPanel
                      items={(playData?.[category] || []).map((a: any) => {
                        const num = a.playNumber ?? a.num ?? a.number;
                        const minAge = (a.minAge ?? a.min ?? 0) as number;
                        const maxAge = (a.maxAge ?? a.max ?? a.minAge ?? a.min ?? 0) as number;

                        // CategoryRecord에서 달성 정보 가져오기
                        let highestLevel = 0;
                        try {
                          // 최신 달성 정보는 localStorage에 저장된 CategoryRecord에서 가져옴
                          const { loadCategoryRecord } = require("@/lib/storage-category");
                          const rec = loadCategoryRecord(category);
                          if (rec && Array.isArray(rec.playData)) {
                            const pd = rec.playData.find((p: any) => p.playNumber === num);
                            if (pd && Array.isArray(pd.achievedLevelFlags)) {
                              for (let i = pd.achievedLevelFlags.length; i >= 1; i--) {
                                if (pd.achievedLevelFlags[i - 1]) { highestLevel = i; break; }
                              }
                            }
                          }
                        } catch (e) { /* ignore */ }

                        let levelColorClass = "level-color-0";
                        if (highestLevel >= 4) levelColorClass = "level-color-4-5";
                        else if (highestLevel === 3) levelColorClass = "level-color-3";
                        else if (highestLevel >= 1) levelColorClass = "level-color-1-2";

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
                      onOpenCommentDialog={(cat, num) => {
                        // 상세 화면으로 이동한 뒤 해당 놀이 댓글창 자동 오픈 요청
                        setPendingOpenComment({ category: cat as PlayCategory, number: num })
                      }}
                      childProfile={childIdentity}
                      restoreScrollPosition={categoryLastView[category]?.type === 'list' ? (categoryLastView[category]?.scrollPosition || 0) : 0}
                      onScrollChange={(pos, topItemNum) => {
                        setCategoryLastView(prev => ({
                          ...prev,
                          [category]: {
                            type: 'list',
                            scrollPosition: pos,
                            playNumber: topItemNum
                          }
                        }));
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {selectedTab === "그래프" && Object.keys(playData || {}).length > 0 && (registeredChildCount ?? 0) > 0 && (
            <section data-ui="graph-container">
              <GraphTabs
                childProfile={childProfile}
                categoryDevelopmentAges={categoryDevelopmentAges}
                playData={playData}
              />
            </section>
          )}

          {selectedTab === "그래프" && Object.keys(playData || {}).length > 0 && (registeredChildCount ?? 0) === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              등록된 아이가 없어 그래프를 표시할 수 없습니다.
              
            </div>
          )}

          {selectedTab === "그래프" && Object.keys(playData || {}).length === 0 && (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">데이터를 로딩 중입니다...</span>
            </div>
          )}
        </div>

        <ChildProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          onSave={handleProfileSave}
          initialProfile={childProfile}
        />

        {/* 보호자 정보 설정 창 */}
        <SettingsDialog
          mode="guardian"
          open={showGuardianSettingsDialog}
          onOpenChange={setShowGuardianSettingsDialog}
          childProfile={childProfile as ChildProfile}
          setChildProfile={setChildProfile as (p: ChildProfile) => void}
          playData={playData}
          title="보호자 정보 설정"
        />

        {/* 아이 정보 설정 창 */}
        <SettingsDialog
          mode="child"
          open={showChildSettingsDialog}
          onOpenChange={setShowChildSettingsDialog}
          childProfile={childProfile as ChildProfile}
          setChildProfile={setChildProfile as (p: ChildProfile) => void}
          playData={playData}
          title="아이 정보 설정"
        />
      </div>
    </UISettingsProvider>
  )
}
