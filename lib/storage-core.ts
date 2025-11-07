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
  localStorage.setItem("komensky_child_profile", JSON.stringify({
    ...normalized,
    // 직렬화 안전성: Date -> ISO
    birthDate: normalized.birthDate.toISOString(),
  }));
  return normalized;
}

// Component: loadChildProfile — entry point

export function loadChildProfile(): ChildProfile {
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
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SELECTED_TAB, tab)
  } catch (error) {
    console.error("Failed to save last selected tab:", error)
  }
}

// Component: loadLastSelectedTab — entry point

export function loadLastSelectedTab(): string {
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

// Component: generateGraphDataFromPlayData — entry point

export function generateGraphDataFromPlayData(record: CategoryRecord): GraphDataEntry[] {
  const graphData: GraphDataEntry[] = []

  record.playData.forEach((playData) => {
    // Find the highest achieved level for this play
    let highestLevel = 0
    let latestDate: Date | undefined

    playData.achievedLevelFlags.forEach((achieved, levelIndex) => {
      if (achieved) {
        const level = levelIndex + 1
        if (level > highestLevel) {
          highestLevel = level
          latestDate = playData.achievedDates[levelIndex]
        }
      }
    })

    if (highestLevel > 0 && latestDate) {
      // 난이도 기반 발달 개월 계산 (소수점 2자리)
      const month = computeAchieveMonthOfThePlay(playData.minAge, playData.maxAge, highestLevel)
      const graphEntry: GraphDataEntry = {
        achieveDate: latestDate,
        playNumber: playData.playNumber,
        achievedLevel_Highest: highestLevel,
        AchieveMonthOfThePlay: month,
        achievedMonth: month,        // ← 레거시 호환: 기존 그래프 코드가 참조
        playTitle: playData.playTitle, // (옵션) 시각화·디버그에 유용
      }
      graphData.push(graphEntry)
    }
  })

  return graphData
}

// Component: saveTopAchievements — entry point

export function saveTopAchievements(achievements: CategoryAchievements): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TOP_ACHIEVEMENTS, JSON.stringify(achievements))
    console.log(`[v0] Saved global top achievements for ${Object.keys(achievements).length} categories`)
  } catch (error) {
    console.error("Failed to save top achievements:", error)
  }
}

// Component: loadTopAchievements — entry point

export function loadTopAchievements(): CategoryAchievements {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TOP_ACHIEVEMENTS)
    if (!data) return {}

    const achievements = JSON.parse(data)

    // Convert date strings back to Date objects
    Object.keys(achievements).forEach((category) => {
      achievements[category] = achievements[category]// List render — each item must have stable key
.map((achievement: any) => ({
        ...achievement,
        achievedDate: new Date(achievement.achievedDate),
      }))
    })

    console.log(`[v0] Loaded global top achievements for ${Object.keys(achievements).length} categories`)
    return achievements
  } catch (error) {
    console.error("Failed to load top achievements:", error)
    return {}
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
  const { devlopedAge } = CalculateDevAgeFromPlayData(record.playData)
  record.categoryDevelopmentalAge = devlopedAge
  return devlopedAge
 }