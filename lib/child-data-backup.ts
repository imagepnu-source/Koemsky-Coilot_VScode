import { loadChildProfile, saveChildProfile } from "@/lib/storage-core"
import { getChildCategoryStorageKey } from "@/lib/storage-category"
import { getGlobalKoreanNames } from "@/lib/global-categories"

// 아이/카테고리별 성취 데이터 백업
export function exportChildData(): string {
  const childProfile = loadChildProfile()

  const achievements: Record<string, any[]> = {}
  const categories = getGlobalKoreanNames()
  categories.forEach((category) => {
    try {
      const categoryKey = getChildCategoryStorageKey(category as any, childProfile)
      const categoryRecordStr = typeof window !== "undefined" ? localStorage.getItem(categoryKey) : null
      if (categoryRecordStr) {
        const categoryRecord = JSON.parse(categoryRecordStr)
        if (categoryRecord.topAchievements && categoryRecord.topAchievements.length > 0) {
          achievements[category] = categoryRecord.topAchievements
        }
      }
    } catch (error) {
      console.error(`[v0] Error loading achievements for export from ${category}:`, error)
    }
  })

  const exportData = {
    childProfile,
    achievements,
    exportDate: new Date().toISOString(),
    version: "1.0",
  }

  return JSON.stringify(exportData, null, 2)
}

// 백업 JSON 을 다시 불러와 아이/성취 데이터를 복원
export function importChildData(jsonData: string): boolean {
  try {
    const importData = JSON.parse(jsonData)

    if (importData.childProfile) {
      const profile = {
        ...importData.childProfile,
        birthDate: new Date(importData.childProfile.birthDate),
      }
      saveChildProfile(profile)
    }

    if (importData.achievements) {
      const profile = loadChildProfile()
      Object.entries(importData.achievements).forEach(([category, categoryAchievements]: [string, any]) => {
        try {
          const categoryKey = getChildCategoryStorageKey(category as any, profile)
          const existingRecordStr = typeof window !== "undefined" ? localStorage.getItem(categoryKey) : null

          if (existingRecordStr) {
            const existingRecord = JSON.parse(existingRecordStr)
            existingRecord.topAchievements = (categoryAchievements as any[]).map((achievement: any) => ({
              ...achievement,
              achievedDate: new Date(achievement.achievedDate),
            }))
            localStorage.setItem(categoryKey, JSON.stringify(existingRecord))
          }
        } catch (error) {
          console.error(`[v0] Error importing achievements for ${category}:`, error)
        }
      })
    }

    return true
  } catch (error) {
    console.error("Failed to import data:", error)
    return false
  }
}
