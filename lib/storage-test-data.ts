// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/storage-test-data.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
import type { ChildProfile, CategoryAchievements } from "./types"
import { getPlayCategoriesSync } from "./types"
import { saveCategoryRecord, loadCategoryRecord, createEmptyCategoryRecord, generateGraphDataFromPlayData } from "./storage-category"
import { computeAchieveMonthOfThePlay } from "./development-calculator"
import { calculateCategoryDevelopmentalAgeFromRecord } from "./storage-core"

// Component: generateTestData — entry point

export function generateTestData(
  childProfile: ChildProfile,
  playData: Record<string, any[]>,
  testDataCount = 10,
  progressCallback?: (category: string, total: number, index: number, phase: "generating" | "loading") => void,
): CategoryAchievements {
  console.log("[v0] Starting test data generation...")
  console.log(`[v0] Test data count per category: ${testDataCount}`)

  const testAchievements: CategoryAchievements = {}
  const csvData: string[] = []
  csvData.push("Category,PlayNumber,PlayTitle,MinAge,MaxAge,AchievedLevel,DevelopmentAge,AchievedDate")

  const categories = getPlayCategoriesSync()
  console.log(`[v0] Loaded ${categories.length} categories dynamically:`, categories)

  categories.forEach((category, categoryIndex) => {
    const categoryActivities = playData[category] || []
    
    // 전체 놀이에서 랜덤 선택 (필터링 제거)
    const filteredActivities = categoryActivities
    
    const actualCount = filteredActivities.length
    const targetCount = Math.min(testDataCount, actualCount)

    console.log(`[v0] Processing category ${category}: ${actualCount} activities from total ${categoryActivities.length}`)

    if (progressCallback) {
      progressCallback(category, categories.length, categoryIndex, "generating")
    }

    if (filteredActivities.length === 0) {
      console.log(`[v0] No activities found for ${category}, skipping...`)
      return
    }

    const selectedActivities = []
    const usedIndices = new Set<number>()

    for (let i = 0; i < targetCount; i++) {
      let randomIndex: number
      do {
        randomIndex = Math.floor(Math.random() * filteredActivities.length)
      } while (usedIndices.has(randomIndex))

      usedIndices.add(randomIndex)
      const randomActivity = filteredActivities[randomIndex]

      const rotatingLevel = (i % 5) + 1

      const developmentAge = computeAchieveMonthOfThePlay(randomActivity.minAge, randomActivity.maxAge, rotatingLevel)

      selectedActivities.push({
        playNumber: randomActivity.number,
        playTitle: randomActivity.title,
        minAge: randomActivity.minAge,
        maxAge: randomActivity.maxAge,
        achievedLevel: rotatingLevel,
        developmentAge: developmentAge,
      })
    }

    selectedActivities.sort((a, b) => a.developmentAge - b.developmentAge)
    console.log(
      `[v0] Step A completed for ${category}: Selected ${selectedActivities.length} activities, sorted by development age`,
    )

    const birthDateTime = childProfile.birthDate.getTime()
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const randomDates = new Set<number>()

    while (randomDates.size < selectedActivities.length) {
      const randomTime = birthDateTime + Math.random() * (oneMonthAgo - birthDateTime)
      randomDates.add(Math.floor(randomTime / (1000 * 60 * 60)))
    }

    const sortedDates = Array.from(randomDates)
      .map((time) => new Date(time * 1000 * 60 * 60))
      .sort((a, b) => a.getTime() - b.getTime())

    console.log(
      `[v0] Step B completed for ${category}: Generated ${sortedDates.length} unique dates, sorted chronologically`,
    )

    const categoryAchievements: any[] = []

    selectedActivities.forEach((activity, index) => {
      const achievedDate = sortedDates[index]

      categoryAchievements.push({
        playNumber: activity.playNumber,
        playTitle: activity.playTitle,
        achievedLevel: activity.achievedLevel,
        developmentAge: activity.developmentAge,
        achievedDate: achievedDate,
        category: category,
        minAge: activity.minAge,
        maxAge: activity.maxAge,
      })

      csvData.push(
        `"${category}",${activity.playNumber},"${activity.playTitle}",${activity.minAge},${activity.maxAge},${activity.achievedLevel},${activity.developmentAge},"${achievedDate.toISOString()}"`,
      )
    })

    console.log(`[v0] Step C completed for ${category}: Combined ${categoryAchievements.length} activities with dates`)

    testAchievements[category] = categoryAchievements

    const categoryRecord = loadCategoryRecord(category) || createEmptyCategoryRecord(category)

    categoryRecord.playData = []
    categoryRecord.graphData = []
    categoryRecord.provided_playList = categoryActivities// List render — each item must have stable key
.map((activity) => ({
      number: activity.number,
      title: activity.title,
      // ageRange는 string 타입이므로 "min-max" 형태 등으로 직렬화
      ageRange: `${activity.minAge}-${activity.maxAge}`,
      minAge: activity.minAge, 
      maxAge: activity.maxAge,
      category: activity.category,
      description: activity.description || "",
      materials: activity.materials || [],
      instructions: activity.instructions || [],
      tips: activity.tips || [],
      variations: activity.variations || [],
      safetyNotes: activity.safetyNotes || [],
    }))

    categoryAchievements.forEach((achievement) => {
      const playDataEntry = {
        playNumber: achievement.playNumber,
        playTitle: achievement.playTitle,
        minAge: achievement.minAge,
        maxAge: achievement.maxAge,
        // 길이 5 고정 튜플로 단언
        achievedLevelFlags: [false, false, false, false, false] as [
          boolean, boolean, boolean, boolean, boolean
        ],
        achievedDates: [undefined, undefined, undefined, undefined, undefined] as [
          Date | undefined,
          Date | undefined,
          Date | undefined,
          Date | undefined,
          Date | undefined
        ],      
      }

      const levelIndex = achievement.achievedLevel - 1
      playDataEntry.achievedLevelFlags[levelIndex] = true
      playDataEntry.achievedDates[levelIndex] = achievement.achievedDate

      categoryRecord.playData.push(playDataEntry)
    })

    // Generate graphData from playData using the same logic as production
    categoryRecord.graphData = generateGraphDataFromPlayData(categoryRecord)

    // Calculate developmental age from playData (production logic)
    categoryRecord.categoryDevelopmentalAge = calculateCategoryDevelopmentalAgeFromRecord(categoryRecord)

    saveCategoryRecord(categoryRecord)
    console.log(
      `[v0] Saved CategoryRecord for ${category} with ${categoryRecord.playData.length} PlayData and ${categoryRecord.graphData.length} GraphData entries`,
    )
    
    // Verify saved data immediately
    const storageKey = `komensky_category_record_${category}`
    const savedData = localStorage.getItem(storageKey)
    if (savedData) {
      const parsed = JSON.parse(savedData)
      console.log(`[v0] ✅ Verified storage for ${category}:`, {
        key: storageKey,
        playDataCount: parsed.playData?.length || 0,
        graphDataCount: parsed.graphData?.length || 0,
        categoryAge: parsed.categoryDevelopmentalAge
      })
    } else {
      console.error(`[v0] ❌ Failed to verify storage for ${category} - key: ${storageKey}`)
    }

    if (progressCallback) {
      progressCallback(category, categories.length, categoryIndex, "loading")
    }
  })

  downloadCSV(csvData.join("\n"), `test_data_${new Date().toISOString().split("T")[0]}.csv`)

  console.log(`[v0] Test data generation completed for ${Object.keys(testAchievements).length} categories`)
  console.log(`[v0] Total test achievements generated: ${Object.values(testAchievements).flat().length}`)
  console.log(`[v0] CSV file downloaded with ${csvData.length - 1} data rows`)

  return testAchievements
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  console.log(`[v0] CSV file "${filename}" download initiated`)
}
