// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/category-achievements-manager.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
import type { TopAchievement, AvailablePlayList, CategoryRecord } from "./types"
import { computeAchieveMonthOfThePlay } from "./development-calculator"
import { loadCategoryRecord, saveCategoryRecord } from "./storage-category"

/**
 * 놀이 완료시 해당 영역의 CategoryRecord topAchievements 업데이트
 */
// Component: updateCategoryAchievement — entry point
export function updateCategoryAchievement(
  categoryName: string,
  activity: AvailablePlayList,
  achievedLevel: number,
  achievedDate: Date,
): TopAchievement[] {
  console.log(`[v0] === UPDATE CATEGORY ACHIEVEMENT START (${categoryName}) ===`)
  console.log(`[v0] Play: ${activity.title} (#${activity.number}), Level: ${achievedLevel}`)

  // 발달나이 계산
const developmentAge = computeAchieveMonthOfThePlay(activity.minAge, activity.maxAge, achievedLevel)

  const newAchievement: TopAchievement = {
    playNumber: activity.number,
    playTitle: activity.title,
    achievedLevel,
    developmentAge,
    achievedDate,
  }

  console.log(`[v0] New achievement: ${newAchievement.playTitle} (${newAchievement.developmentAge} months)`)

  // CategoryRecord 로드
  const categoryRecord = loadCategoryRecord(categoryName)
  if (!categoryRecord) {
    console.error(`[v0] CategoryRecord not found for ${categoryName}`)
    return []
  }

  const currentTop3 = categoryRecord.topAchievements || []

  console.log(
    `[v0] Current top 3 for ${categoryName}:`,
    currentTop3.map((a) => `#${a.playNumber}: ${a.developmentAge}개월`),
  )

  // 같은 놀이 번호가 있으면 제거 (더 높은 레벨로 업데이트)
  const filteredCurrent = currentTop3.filter((a) => a.playNumber !== activity.number)

  // 새로운 성취 추가하고 발달나이 순으로 정렬 (높은 순)
  const updated = [...filteredCurrent, newAchievement].sort((a, b) => b.developmentAge - a.developmentAge).slice(0, 3) // 최대 3개만 유지

  console.log(
    `[v0] Updated top 3 for ${categoryName}:`,
    updated.map((a) => `#${a.playNumber}: ${a.developmentAge}개월`),
  )

  // CategoryRecord 업데이트
  categoryRecord.topAchievements = updated
  saveCategoryRecord(categoryRecord)

  console.log(`[v0] === UPDATE CATEGORY ACHIEVEMENT END (${categoryName}) ===`)
  return updated
}

/**
 * 놀이 레벨 삭제시 해당 영역의 CategoryRecord topAchievements에서 제거하고 필요시 PlayData에서 새로운 Top 3 재계산
 */
// Component: removeCategoryAchievement — entry point
export function removeCategoryAchievement(
  categoryName: string,
  playNumber: number,
  achievedLevel: number,
  developmentAge: number,
): TopAchievement[] {
  console.log(`[v0] === REMOVE CATEGORY ACHIEVEMENT START (${categoryName}) ===`)
  console.log(`[v0] Removing play #${playNumber}, Level ${achievedLevel}, Age ${developmentAge} from ${categoryName}`)

  // CategoryRecord 로드
  const categoryRecord = loadCategoryRecord(categoryName)
  if (!categoryRecord) {
    console.error(`[v0] CategoryRecord not found for ${categoryName}`)
    return []
  }

  const currentTop3 = categoryRecord.topAchievements || []

  console.log(
    `[v0] Current top 3 for ${categoryName}:`,
    currentTop3.map((a) => `#${a.playNumber}: ${a.developmentAge}개월 (Level ${a.achievedLevel})`),
  )

  const isInTop3 = currentTop3.some(
    (a) =>
      a.playNumber === playNumber &&
      a.achievedLevel === achievedLevel &&
      Math.abs(a.developmentAge - developmentAge) < 0.01, // 부동소수점 비교를 위한 허용 오차
  )

  console.log(
    `[v0] Is achievement in Top 3? ${isInTop3} (playNumber: ${playNumber}, level: ${achievedLevel}, age: ${developmentAge})`,
  )

  // 해당 놀이의 특정 레벨 PlayData 제거
  categoryRecord.playData.forEach((playData) => {
    if (playData.playNumber === playNumber) {
      // 특정 레벨만 제거 (레벨은 0-based 인덱스)
      const levelIndex = achievedLevel - 1
      if (levelIndex >= 0 && levelIndex < playData.achievedLevelFlags.length) {
        playData.achievedLevelFlags[levelIndex] = false
        playData.achievedDates[levelIndex] = undefined
        console.log(`[v0] Removed Level ${achievedLevel} from PlayData for #${playNumber}`)
      }
    }
  })

  let newTop3: TopAchievement[]

  if (isInTop3) {
    console.log(`[v0] Achievement was in Top 3, recalculating from PlayData`)

    // PlayData에서 새로운 Top 3 재계산
    const allAchievements: TopAchievement[] = []

    categoryRecord.playData.forEach((playData) => {
      // 각 놀이의 최고 달성 레벨 찾기
      let highestLevel = -1
      let highestLevelDate: Date | undefined

      for (let i = playData.achievedLevelFlags.length - 1; i >= 0; i--) {
        if (playData.achievedLevelFlags[i]) {
          highestLevel = i + 1 // 레벨은 1부터 시작
          highestLevelDate = playData.achievedDates[i]
          break
        }
      }

      if (highestLevel > 0 && highestLevelDate) {
        // PlayData에서 직접 발달나이 계산 (provided_playList 사용하지 않음)
        const developmentAge = calculateDevelopmentAgeFromPlayData(playData, highestLevel)

        if (developmentAge > 0) {
          allAchievements.push({
            playNumber: playData.playNumber,
            playTitle: playData.playTitle,
            achievedLevel: highestLevel,
            developmentAge,
            achievedDate: highestLevelDate,
          })
        }
      }
    })

    // 발달나이 순으로 정렬하고 상위 3개 선택
    newTop3 = allAchievements.sort((a, b) => b.developmentAge - a.developmentAge).slice(0, 3)

    console.log(
      `[v0] Recalculated top 3 from PlayData:`,
      newTop3.map((a) => `#${a.playNumber}: ${a.developmentAge}개월 (Level ${a.achievedLevel})`),
    )
  } else {
    console.log(`[v0] Achievement was not in Top 3, keeping existing Top 3`)
    newTop3 = currentTop3
  }

  // CategoryRecord 업데이트
  categoryRecord.topAchievements = newTop3
  saveCategoryRecord(categoryRecord)

  console.log(`[v0] === REMOVE CATEGORY ACHIEVEMENT END (${categoryName}) ===`)
  return newTop3
}

/**
 * 특정 영역의 CategoryRecord topAchievements 가져오기
 * 실시간으로 모든 PlayData에서 계산 (제한 없음)
 */
// Component: getCategoryTopAchievements — entry point
export function getCategoryTopAchievements(categoryName: string): TopAchievement[] {
  console.log(`[v0] DEBUG: getCategoryTopAchievements called for ${categoryName}`)

  const categoryRecord = loadCategoryRecord(categoryName)
  if (!categoryRecord) {
    console.error(`[v0] CategoryRecord not found for ${categoryName}`)
    return []
  }

  const allAchievements: TopAchievement[] = []

  categoryRecord.playData.forEach((playData) => {
    // 각 놀이의 최고 달성 레벨 찾기
    let highestLevel = -1
    let highestLevelDate: Date | undefined

    for (let i = playData.achievedLevelFlags.length - 1; i >= 0; i--) {
      if (playData.achievedLevelFlags[i]) {
        highestLevel = i + 1 // 레벨은 1부터 시작
        highestLevelDate = playData.achievedDates[i]
        break
      }
    }

    if (highestLevel > 0 && highestLevelDate) {
      // PlayData에서 직접 발달나이 계산
      const developmentAge = calculateDevelopmentAgeFromPlayData(playData, highestLevel)

      if (developmentAge >= 0) {
        allAchievements.push({
          playNumber: playData.playNumber,
          playTitle: playData.playTitle,
          achievedLevel: highestLevel,
          developmentAge,
          achievedDate: highestLevelDate,
        })
      }
    }
  })

  // Sort by development age (highest first) but keep all items
  const sortedAchievements = allAchievements.sort((a, b) => b.developmentAge - a.developmentAge)

  console.log(
    `[v0] DEBUG: Calculated all achievements for ${categoryName} (${sortedAchievements.length} total):`,
    sortedAchievements.map((a) => `#${a.playNumber}: ${a.developmentAge}개월 (Level ${a.achievedLevel})`),
  )

  categoryRecord.topAchievements = sortedAchievements
  saveCategoryRecord(categoryRecord)

  return sortedAchievements
}

/**
 * 영역별 발달나이 계산 (CategoryRecord topAchievements의 평균)
 */
// Component: calculateCategoryDevelopmentAge — entry point
export function calculateCategoryDevelopmentAge(categoryName: string): number {
  const achievements = getCategoryTopAchievements(categoryName)

  if (achievements.length === 0) {
    return 0
  }

  const sum = achievements.reduce((acc, achievement) => acc + achievement.developmentAge, 0)
  const average = sum / achievements.length
  const result = Math.round(average * 100) / 100

  return result
}

/**
 * 전체 발달나이 계산 (7개 영역의 평균)
 */
// Component: calculateOverallDevelopmentAge — entry point
export function calculateOverallDevelopmentAge(categories: string[]): number {
  console.log("[v0] === CALCULATE OVERALL DEVELOPMENT AGE START ===")

  const categoryAges: Record<string, number> = {}

  categories.forEach((category) => {
    categoryAges[category] = calculateCategoryDevelopmentAge(category)
  })

  console.log("[v0] Category development ages:", categoryAges)

  const validAges = Object.values(categoryAges).filter((age) => age > 0)

  if (validAges.length === 0) {
    console.log("[v0] No valid category ages, returning 0")
    console.log("[v0] === CALCULATE OVERALL DEVELOPMENT AGE END ===")
    return 0
  }

  const sum = validAges.reduce((acc, age) => acc + age, 0)
  const average = sum / validAges.length
  const roundedAverage = Math.round(average * 100) / 100

  console.log(`[v0] Overall development age calculation:`)
  console.log(`[v0] - Valid categories: ${validAges.length}/${categories.length}`)
  console.log(`[v0] - Category ages: [${validAges.join(", ")}]`)
  console.log(`[v0] - Sum: ${sum}, Average: ${average}, Rounded: ${roundedAverage}`)
  console.log("[v0] === CALCULATE OVERALL DEVELOPMENT AGE END ===")

  return roundedAverage
}

/**
 * 모든 영역의 CategoryRecord topAchievements 초기화
 */
// Component: clearAllCategoryAchievements — entry point
export function clearAllCategoryAchievements(): void {
  console.log("[v0] Clearing all category achievements from CategoryRecords")
  // 각 카테고리의 CategoryRecord에서 topAchievements를 빈 배열로 설정
  const categories = ["대근육", "소근육", "스스로", "문제 해결", "사회적 감성", "수용 언어", "표현 언어"]

  categories.forEach((categoryName) => {
    const categoryRecord = loadCategoryRecord(categoryName)
    if (categoryRecord) {
      categoryRecord.topAchievements = []
      saveCategoryRecord(categoryRecord)
    }
  })
}

function calculateDevelopmentAgeFromPlayData(
  playData: {
    playNumber: number
    playTitle: string
    minAge: number
    maxAge: number
    achievedLevelFlags: [boolean, boolean, boolean, boolean, boolean]
    achievedDates: [Date?, Date?, Date?, Date?, Date?]
  },
  achievedLevel: number,
): number {
  const { minAge, maxAge } = playData

  console.log(
    `[v0] Calculating development age for play #${playData.playNumber}: minAge=${minAge}, maxAge=${maxAge}, level=${achievedLevel}`,
  )

  if (
    typeof minAge !== "number" ||
    typeof maxAge !== "number" ||
    isNaN(minAge) ||
    isNaN(maxAge) ||
    minAge === undefined ||
    maxAge === undefined
  ) {
    console.error(`[v0] Invalid age data for play #${playData.playNumber}: minAge=${minAge}, maxAge=${maxAge}`)
    console.error(`[v0] PlayData must contain valid minAge and maxAge values`)
    return 0
  }

  if (minAge < 0 || maxAge < 0 || maxAge < minAge) {
    console.error(`[v0] Invalid age range for play #${playData.playNumber}: minAge=${minAge}, maxAge=${maxAge}`)
    return 0
  }

  if (achievedLevel < 1 || achievedLevel > 5) {
    console.error(`[v0] Invalid achieved level for play #${playData.playNumber}: ${achievedLevel}`)
    return 0
  }

return computeAchieveMonthOfThePlay(minAge, maxAge, achievedLevel)
}

/**
 * ===== NEW CALCULATION FUNCTIONS (Phase 1) =====
 * Based on corrected requirements:
 * - Use only HIGHEST level per playNumber
 * - New formula for AchieveMonthOfThePlay
 * - Category devAge = average of TOP 3 AchieveMonthOfThePlay
 */

/**
 * NEW: Calculate AchieveMonthOfThePlay using the new formula
 * Formula: delta = (max - min) / 4
 * If level > 0: AchieveMonthOfThePlay = min + delta * (level - 1)
 * Else: AchieveMonthOfThePlay = 0
 * Round to 2 decimal places
 */
// Component: calculateAchieveMonthOfThePlay — entry point
export function calculateAchieveMonthOfThePlay(minAge: number, maxAge: number, level: number): number {
  console.log(`[v0] NEW: calculateAchieveMonthOfThePlay(min=${minAge}, max=${maxAge}, level=${level})`)

  if (level <= 0) {
    console.log(`[v0] NEW: Level is 0 or negative, returning 0`)
    return 0
  }

  const delta = (maxAge - minAge) / 4
  const result = minAge + delta * (level - 1)
  const rounded = Math.round(result * 100) / 100

  console.log(`[v0] NEW: delta=${delta}, result=${result}, rounded=${rounded}`)
  return rounded
}

/**
 * NEW: Calculate category development age from PlayData
 * Uses only HIGHEST level per playNumber
 * Returns average of TOP 3 AchieveMonthOfThePlay values
 */
// Component: calculateDevAgeFromPlayData — entry point
export function calculateDevAgeFromPlayData(categoryRecord: CategoryRecord): number {
  console.log(`[v0] NEW: calculateDevAgeFromPlayData for ${categoryRecord.categoryName}`)

  // Step 1: Extract highest level for each playNumber
  const playDataWithHighestLevel: Array<{
    playNumber: number
    playTitle: string
    achievedDate: Date
    achieveMonthOfThePlay: number
  }> = []

  categoryRecord.playData.forEach((playData) => {
    // Find highest achieved level
    let highestLevel = 0
    let highestLevelDate: Date | undefined

    for (let i = playData.achievedLevelFlags.length - 1; i >= 0; i--) {
      if (playData.achievedLevelFlags[i]) {
        highestLevel = i + 1
        highestLevelDate = playData.achievedDates[i]
        break
      }
    }

    if (highestLevel > 0 && highestLevelDate) {
      const achieveMonth = calculateAchieveMonthOfThePlay(playData.minAge, playData.maxAge, highestLevel)

      playDataWithHighestLevel.push({
        playNumber: playData.playNumber,
        playTitle: playData.playTitle,
        achievedDate: highestLevelDate,
        achieveMonthOfThePlay: achieveMonth,
      })

      console.log(`[v0] NEW: Play #${playData.playNumber} highest level=${highestLevel}, achieveMonth=${achieveMonth}`)
    }
  })

  if (playDataWithHighestLevel.length === 0) {
    console.log(`[v0] NEW: No achieved plays found, returning 0`)
    return 0
  }

  // Step 2: Sort by achieveMonthOfThePlay (descending) and take TOP 3
  const sortedByMonth = playDataWithHighestLevel
    .sort((a, b) => b.achieveMonthOfThePlay - a.achieveMonthOfThePlay)
    .slice(0, 3)

  console.log(
    `[v0] NEW: Top 3 plays:`,
    sortedByMonth.map((p) => `#${p.playNumber}: ${p.achieveMonthOfThePlay}개월`),
  )

  // Step 3: Calculate average
  const sum = sortedByMonth.reduce((acc, p) => acc + p.achieveMonthOfThePlay, 0)
  const average = sum / sortedByMonth.length
  const rounded = Math.round(average * 100) / 100

  console.log(`[v0] NEW: Category devAge = ${rounded} (average of ${sortedByMonth.length} plays)`)
  return rounded
}

/**
 * NEW: Generate GraphData from PlayData
 * Uses only HIGHEST level per playNumber
 * Sorted by date ascending
 * Output: {playNumber, playTitle, achievedDate, achieveMonthOfThePlay}
 */
// Component: generateGraphDataFromPlayData — entry point
export function generateGraphDataFromPlayData(categoryRecord: CategoryRecord): Array<{
  playNumber: number
  playTitle: string
  achievedDate: Date
  achieveMonthOfThePlay: number
}> {
  console.log(`[v0] NEW: generateGraphDataFromPlayData for ${categoryRecord.categoryName}`)

  const graphData: Array<{
    playNumber: number
    playTitle: string
    achievedDate: Date
    achieveMonthOfThePlay: number
  }> = []

  categoryRecord.playData.forEach((playData) => {
    // Find highest achieved level
    let highestLevel = 0
    let highestLevelDate: Date | undefined

    for (let i = playData.achievedLevelFlags.length - 1; i >= 0; i--) {
      if (playData.achievedLevelFlags[i]) {
        highestLevel = i + 1
        highestLevelDate = playData.achievedDates[i]
        break
      }
    }

    if (highestLevel > 0 && highestLevelDate) {
      const achieveMonth = calculateAchieveMonthOfThePlay(playData.minAge, playData.maxAge, highestLevel)

      graphData.push({
        playNumber: playData.playNumber,
        playTitle: playData.playTitle,
        achievedDate: highestLevelDate,
        achieveMonthOfThePlay: achieveMonth,
      })

      console.log(
        `[v0] NEW: GraphData entry - Play #${playData.playNumber}, level=${highestLevel}, month=${achieveMonth}, date=${highestLevelDate.toISOString()}`,
      )
    }
  })

  // Sort by date ascending
  graphData.sort((a, b) => a.achievedDate.getTime() - b.achievedDate.getTime())

  console.log(`[v0] NEW: Generated ${graphData.length} GraphData entries (sorted by date)`)
  return graphData
}
