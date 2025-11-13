// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/storage-core.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
import type { ChildProfile, CategoryRecord, GraphDataEntry, CategoryAchievements } from "./types"
import { getGlobalKoreanNames, initializeGlobalCategories } from "./global-categories"
import { CalculateDevAgeFromPlayData } from "./development-calculator"
import { computeAchieveMonthOfThePlay } from "./development-calculator"
import { calculateBiologicalAge } from "./development-calculator"
const STORAGE_KEYS = {
  PLAY_RECORDS: "komensky_play_records", // Legacy - will be migrated
  CHILD_PROFILE: "komensky_child_profile",
  LAST_SELECTED_TAB: "komensky_last_tab",
  TOP_ACHIEVEMENTS: "komensky_top_achievements",
} as const

// Component: getCategoryStorageKey — entry point

export function getCategoryStorageKey(categoryName: string): string {
  return `komensky_records_${categoryName}`
}

// Component: getCategoryStorageKeys — entry point

export function getCategoryStorageKeys(): Record<string, string> {
  initializeGlobalCategories()
  const categories = getGlobalKoreanNames()
  const keys: Record<string, string> = {}

  categories.forEach((korean) => {
    keys[korean] = getCategoryStorageKey(korean)
  })

  return keys
}

// Component: saveChildProfile — entry point

export function saveChildProfile(profile: ChildProfile): ChildProfile {
  const birthDate =
    profile.birthDate instanceof Date ? profile.birthDate : new Date(profile.birthDate);
  const normalized: ChildProfile = {
    name: profile.name.trim(),
    birthDate,
    biologicalAge: calculateBiologicalAge(birthDate),
  };
  
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem("komensky_child_profile", JSON.stringify({
      ...normalized,
      // 직렬화 안전성: Date -> ISO
      birthDate: normalized.birthDate.toISOString(),
    }));
  }
  
  return normalized;
}

// Component: loadChildProfile — entry point

export function loadChildProfile(): ChildProfile {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    const now = new Date();
    return {
      name: "아기",
      birthDate: now,
      biologicalAge: calculateBiologicalAge(now),
    };
  }

  const raw = localStorage.getItem("komensky_child_profile");
  if (!raw) {
    const now = new Date();
    const fresh: ChildProfile = {
      name: "아기",
      birthDate: now,
      biologicalAge: calculateBiologicalAge(now),
    };
    return fresh;
  }
  const parsed = JSON.parse(raw);
  const birthDate = new Date(parsed.birthDate);
  return {
    name: parsed.name,
    birthDate,
    biologicalAge: calculateBiologicalAge(birthDate),
  };
}

// Component: saveLastSelectedTab — entry point

export function saveLastSelectedTab(tab: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SELECTED_TAB, tab)
  } catch (error) {
    console.error("Failed to save last selected tab:", error)
  }
}

// Component: loadLastSelectedTab — entry point

export function loadLastSelectedTab(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    initializeGlobalCategories()
    const categories = getGlobalKoreanNames()
    return categories.length > 0 ? categories[0] : "그래프"
  }
  
  try {
    const savedTab = localStorage.getItem(STORAGE_KEYS.LAST_SELECTED_TAB)
    if (savedTab) return savedTab

    initializeGlobalCategories()
    const categories = getGlobalKoreanNames()
    return categories.length > 0 ? categories[0] : categories[0] || "그래프"
  } catch (error) {
    console.error("Failed to load last selected tab:", error)
    const categories = getGlobalKoreanNames()
    return categories.length > 0 ? categories[0] : "그래프"
  }
}

export const CATEGORY_STORAGE_KEYS = new Proxy({} as Record<string, string>, {
  get(target, prop: string) {
    return getCategoryStorageKey(prop)
  },
  ownKeys() {
    initializeGlobalCategories()
    return getGlobalKoreanNames()
  },
  has(target, prop: string) {
    initializeGlobalCategories()
    const categories = getGlobalKoreanNames()
    return categories.includes(prop)
  },
})


 // Component: calculateCategoryDevelopmentalAgeFromRecord — entry point


 export function calculateCategoryDevelopmentalAgeFromRecord(record: CategoryRecord): number {
   console.log(`[v0] STORAGE_CORE: Using centralized calculation for category developmental age`)
  const { devlopedAge, items } = CalculateDevAgeFromPlayData(record.playData)
  
  // 대근육 전용 디버그
  if (record.categoryName === "대근육") {
    console.log(`[DEBUG] 대근육 발달나이 계산:`, {
      총놀이수: record.playData.length,
      체크된놀이수: items.length,
      계산된발달나이: devlopedAge,
      상위3개: items.slice(0, 3).sort((a,b) => b.AchieveMonthOfThePlay - a.AchieveMonthOfThePlay).map(i => ({
        놀이번호: i.playNumber,
        발달개월: i.AchieveMonthOfThePlay
      }))
    });
  }
  
  record.categoryDevelopmentalAge = devlopedAge
  return devlopedAge
 }