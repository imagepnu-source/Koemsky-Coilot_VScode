// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/types.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
export interface AvailablePlayList {
  number: number
  title: string
  ageRange: string
  category: string // PlayCategory에서 string으로 변경하여 동적 카테고리 지원
  minAge: number
  maxAge: number
}

export interface DetailedActivity {
  number: number
  sections?: Array<{
    title: string
    content: string
  }>
  // 기존 필드들은 호환성을 위해 유지
  prepTime?: string
  playTime?: string
  objective?: string
  materials?: string
  method?: string
  developmentStimulation?: string
  levels?: {
    level1: string
    level2: string
    level3: string
    level4: string
    level5: string
  }
  extensionActivity?: string
  comeniusPhilosophy?: string
}

export interface PlayRecord {
  id: string
  category: string // PlayCategory에서 string으로 변경
  playNumber: number
  playTitle: string
  achievedLevel: number // 0-5 (0 = not completed, 1-5 = difficulty levels)
  achievedDate: Date
}

export interface TopAchievement {
  playNumber: number
  playTitle: string
  achievedLevel: number
  developmentAge: number // calculated age in months
  achievedDate: Date
}

export interface CategoryAchievements {
  [key: string]: TopAchievement[] // top 3 achievements per category
}

export interface ChildProfile {
  name: string
  birthDate: Date
  biologicalAge: number // in months
}

export type PlayCategory = string

export interface CategoryRecord {
  categoryName: string // PlayCategory에서 string으로 변경
  provided_playList: AvailablePlayList[] // playList를 provided_playList로 변경하여 의미를 명확히 함
  playData: {
    playNumber: number
    playTitle: string
    minAge: number
    maxAge: number
    achievedLevelFlags: [boolean, boolean, boolean, boolean, boolean] // level 1-5
    achievedDates: [Date?, Date?, Date?, Date?, Date?] // level 1-5
  }[]
  graphData: GraphDataEntry[]
  topAchievements: TopAchievement[] // 최고치 3개 (MaxLevels, PlayNumber, HighestLevelOfTheMax 포함)
  categoryDevelopmentalAge: number
}

export interface CategoryRecords {
  [key: string]: CategoryRecord
}

export interface GraphDataEntry {
  achieveDate: Date
  playNumber: number
  achievedLevel_Highest: number
  /**
   * 새 명칭(정식): AchieveMonthOfThePlay
   * - min/max/level(1~5)로 계산한 발달 개월, 소수점 2자리
   */
  AchieveMonthOfThePlay: number
  /**
   * 레거시 호환: 기존 코드(time-axis-graph.tsx)가 참조
   * - 위 값과 동일하게 채워줍니다.
   */
  achievedMonth: number
  /**
   * (선택) 시각화·디버그 편의를 위한 제목
   */
  playTitle?: string
}


import { getGlobalKoreanNames, initializeGlobalCategories, generateCategoryColors } from "./global-categories"

// Component: getPlayCategories — entry point

export function getPlayCategories(): string[] {
  initializeGlobalCategories()
  return getGlobalKoreanNames()
}

// Component: getPlayCategoriesSync — entry point

export function getPlayCategoriesSync(): string[] {
  return getGlobalKoreanNames()
}

// Component: getCategoryColors — entry point

export function getCategoryColors(): Record<string, string> {
  initializeGlobalCategories()
  const categories = getGlobalKoreanNames()
  return generateCategoryColors(categories)
}

export { generateCategoryColors }

export const PLAY_CATEGORIES = new Proxy([] as string[], {
  get(target, prop) {
    if (typeof prop === "string" && !isNaN(Number(prop))) {
      // Array index access
      const categories = getPlayCategories()
      return categories[Number(prop)]
    }
    if (prop === "length") {
      return getPlayCategories().length
    }
    if (prop === "includes") {
      return (item: string) => getPlayCategories().includes(item)
    }
    if (prop === "map") {
      return (callback: (item: string, index: number) => any) => getPlayCategories().map(callback)
    }
    if (prop === "forEach") {
      return (callback: (item: string, index: number) => void) => getPlayCategories().forEach(callback)
    }
    if (prop === Symbol.iterator) {
      return function* () {
        const categories = getPlayCategories()
        for (const category of categories) {
          yield category
        }
      }
    }
    return (target as any)[prop]
  },
})

export const CATEGORY_COLORS = new Proxy({} as Record<string, string>, {
  get(target, prop: string) {
    const colors = getCategoryColors()
    return colors[prop]
  },
  ownKeys() {
    return getPlayCategories()
  },
  has(target, prop: string) {
    return getPlayCategories().includes(prop)
  },
})

export const ACHIEVEMENT_COLORS: Record<number, string> = {
  0: "#6b7280", // gray - not completed
  1: "#3b82f6", // blue - easy levels
  2: "#3b82f6", // blue - easy levels
  3: "#000000", // black - normal level
  4: "#ef4444", // red - hard levels
  5: "#ef4444", // red - hard levels
}
