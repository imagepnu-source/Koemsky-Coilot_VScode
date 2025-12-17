// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/global-categories.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
import { getCachedCategories } from "./data-parser"

// Global category data interface
export interface GlobalCategory {
  korean: string
  english: string
  index: number
}

// Global category constants - will be populated dynamically
let GLOBAL_CATEGORIES: GlobalCategory[] = []
let GLOBAL_CATEGORY_COUNT = 0
let GLOBAL_KOREAN_NAMES: string[] = []
let GLOBAL_ENGLISH_NAMES: string[] = []
let GLOBAL_CATEGORY_MAP: Record<string, string> = {}
let isInitialized = false

// Initialize global category data
// Component: initializeGlobalCategories — entry point
export function initializeGlobalCategories(): void {
  if (isInitialized) return

  const categories = getCachedCategories()

  GLOBAL_CATEGORIES = categories// List render — each item must have stable key
.map((cat, index) => ({
    korean: cat.korean,
    english: cat.english,
    index,
  }))

  GLOBAL_CATEGORY_COUNT = categories.length
  GLOBAL_KOREAN_NAMES = categories.map((cat) => cat.korean)
  GLOBAL_ENGLISH_NAMES = categories.map((cat) => cat.english)

  // Create bidirectional mapping
  GLOBAL_CATEGORY_MAP = {}
  categories.forEach(({ korean, english }) => {
    // Korean to Korean (identity)
    GLOBAL_CATEGORY_MAP[korean] = korean

    // English to Korean
    GLOBAL_CATEGORY_MAP[english] = korean

    // Handle hyphenated versions
    const hyphenated = korean.replace(/\s+/g, "-")
    if (hyphenated !== korean) {
      GLOBAL_CATEGORY_MAP[hyphenated] = korean
    }

    // Handle spaced versions of English names
    const spacedEnglish = english.replace(/-/g, " ")
    if (spacedEnglish !== english) {
      GLOBAL_CATEGORY_MAP[spacedEnglish] = korean
    }
  })

  isInitialized = true
}

// Global category accessors
// Component: getGlobalCategoryCount — entry point
export function getGlobalCategoryCount(): number {
  if (!isInitialized) initializeGlobalCategories()
  return GLOBAL_CATEGORY_COUNT
}

// Component: getGlobalKoreanNames — entry point

export function getGlobalKoreanNames(): string[] {
  if (!isInitialized) initializeGlobalCategories()
  return [...GLOBAL_KOREAN_NAMES] // Return copy to prevent mutation
}

// Component: getGlobalEnglishNames — entry point

export function getGlobalEnglishNames(): string[] {
  if (!isInitialized) initializeGlobalCategories()
  return [...GLOBAL_ENGLISH_NAMES] // Return copy to prevent mutation
}

// Component: getGlobalCategories — entry point

export function getGlobalCategories(): GlobalCategory[] {
  if (!isInitialized) initializeGlobalCategories()
  return [...GLOBAL_CATEGORIES] // Return copy to prevent mutation
}

// Component: getGlobalCategoryMap — entry point

export function getGlobalCategoryMap(): Record<string, string> {
  if (!isInitialized) initializeGlobalCategories()
  return { ...GLOBAL_CATEGORY_MAP } // Return copy to prevent mutation
}

// Utility functions using global data
// Component: normalizeGlobalCategoryName — entry point
export function normalizeGlobalCategoryName(name: string): string {
  if (!isInitialized) initializeGlobalCategories()
  return GLOBAL_CATEGORY_MAP[name] || name
}

// Component: getGlobalEnglishName — entry point

export function getGlobalEnglishName(koreanName: string): string {
  if (!isInitialized) initializeGlobalCategories()
  const category = GLOBAL_CATEGORIES.find((cat) => cat.korean === koreanName)
  return category?.english || koreanName.toLowerCase().replace(/\s+/g, "-")
}

// Component: getGlobalKoreanName — entry point

export function getGlobalKoreanName(englishName: string): string {
  if (!isInitialized) initializeGlobalCategories()
  return GLOBAL_CATEGORY_MAP[englishName] || englishName
}

// Force re-initialization (useful when data changes)
// Component: reinitializeGlobalCategories — entry point
export function reinitializeGlobalCategories(): void {
  isInitialized = false
  initializeGlobalCategories()
}

// Export constants for direct access (these will be populated after initialization)
export const CATEGORY_CONSTANTS = {
  get COUNT() {
    return getGlobalCategoryCount()
  },
  get KOREAN_NAMES() {
    return getGlobalKoreanNames()
  },
  get ENGLISH_NAMES() {
    return getGlobalEnglishNames()
  },
  get ALL_CATEGORIES() {
    return getGlobalCategories()
  },
  get CATEGORY_MAP() {
    return getGlobalCategoryMap()
  },
}

// Component: generateCategoryColors — entry point

export function generateCategoryColors(categories: string[]): Record<string, string> {
  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#10b981", // emerald
    "#f59e0b", // amber
  ]

  const colorMap: Record<string, string> = {}
  categories.forEach((category, index) => {
    colorMap[category] = colors[index % colors.length]
  })

  return colorMap
}
