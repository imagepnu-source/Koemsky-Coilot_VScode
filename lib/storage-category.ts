// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/storage-category.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
import type { PlayRecord, CategoryRecord, PlayCategory, GraphDataEntry } from "./types"
import { getCategoryStorageKey } from "./storage-core"
import { loadChildProfile } from "./storage-core"
import { loadCategoryDataSync } from "./data-parser"
import { CalculateDevAgeFromPlayData } from "@/lib/development-calculator"
import { calculateCategoryDevelopmentalAgeFromRecord } from "@/lib/storage-core"


// Component: saveCategoryPlayRecords — entry point


export function saveCategoryPlayRecords(category: string, records: PlayRecord[]): void {
  try {
    const storageKey = getCategoryStorageKey(category)
    if (!storageKey) {
      console.error(`[v0] Invalid category for storage: ${category}`)
      return
    }

    console.log(`[v0] Saving ${records.length} records for category ${category}`)
    localStorage.setItem(storageKey, JSON.stringify(records))
  } catch (error) {
    console.error(`[v0] Failed to save play records for category ${category}:`, error)
  }
}

// Component: loadCategoryPlayRecords — entry point

export function loadCategoryPlayRecords(category: string): PlayRecord[] {
  try {
    const storageKey = getCategoryStorageKey(category)
    if (!storageKey) {
      console.error(`[v0] Invalid category for loading: ${category}`)
      return []
    }

    const data = localStorage.getItem(storageKey)
    if (!data) return []

    const records = JSON.parse(data)
    // Convert date strings back to Date objects
    return records// List render — each item must have stable key
.map((record: any) => ({
      ...record,
      achievedDate: new Date(record.achievedDate),
    }))
  } catch (error) {
    console.error(`[v0] Failed to load play records for category ${category}:`, error)
    return []
  }
}

// Component: saveCategoryRecord — entry point

export function saveCategoryRecord(categoryRecord: CategoryRecord): void {
  const storageKey = `komensky_category_record_${categoryRecord.categoryName}`

  try {
    localStorage.setItem(storageKey, JSON.stringify(categoryRecord))
  } catch (error) {
    console.error(`[v0] SAVE_CATEGORY: ERROR - Failed to save: ${error}`)
  }
}

// Component: loadCategoryRecord — entry point

export function loadCategoryRecord(categoryName: PlayCategory): CategoryRecord | null {
  try {
    const storageKey = `komensky_category_record_${categoryName}`
    const data = localStorage.getItem(storageKey)

    if (!data) {
      console.log(`[v0] No existing record for ${categoryName}, creating empty record`)
      return createEmptyCategoryRecord(categoryName)
    }

    const record = JSON.parse(data)

    console.log(
      `[v0] DEBUG: Loading ${categoryName} - provided_playList length: ${record.provided_playList?.length || 0}`,
    )

    if (!record.provided_playList || record.provided_playList.length === 0) {
      console.log(`[v0] provided_playList is empty for ${categoryName}, loading from source data...`)
      const sourceData = loadCategoryDataSync(categoryName)

      if (sourceData && sourceData.length > 0) {
        record.provided_playList = sourceData
        console.log(`[v0] Successfully loaded ${sourceData.length} activities from source for ${categoryName}`)

        // 자동 로드 후 저장
        saveCategoryRecord(record)
      } else {
        console.error(`[v0] Failed to load source data for ${categoryName} - please generate test data`)
        return record
      }
    }

    if (record.provided_playList && record.provided_playList.length > 0) {
      // 첫 3개 항목의 나이 정보 확인
      const sampleItems = record.provided_playList.slice(0, 3)
      sampleItems.forEach((item: any, index: number) => {
        console.log(
          `[v0] DEBUG: provided_playList[${index}] - number: ${item.number}, minAge: ${item.minAge}, maxAge: ${item.maxAge}`,
        )
      })
    }

    // Convert date strings back to Date objects
    record.playData = record.playData// List render — each item must have stable key
.map((play: any) => ({
      ...play,
      achievedDates: play.achievedDates// List render — each item must have stable key
.map((date: string | null) => (date ? new Date(date) : undefined)),
    }))

    let needsSave = false

    record.playData.forEach((playData: any) => {
      if (
        playData.minAge === undefined ||
        playData.maxAge === undefined ||
        typeof playData.minAge !== "number" ||
        typeof playData.maxAge !== "number"
      ) {
        const playActivity = record.provided_playList.find((p: any) => p.number === playData.playNumber)
        if (playActivity) {
          console.log(
            `[v0] Fixing PlayData #${playData.playNumber}: setting minAge=${playActivity.minAge}, maxAge=${playActivity.maxAge}`,
          )
          playData.minAge = playActivity.minAge
          playData.maxAge = playActivity.maxAge
          needsSave = true
        } else {
          console.error(`[v0] Cannot fix PlayData #${playData.playNumber}: not found in provided_playList`)
        }
      }
    })

    if (!record.graphData || record.graphData.length === 0) {
      if (record.playData && record.playData.length > 0) {
        record.graphData = generateGraphDataFromPlayData(record)
        if (record.graphData.length > 0) {
          needsSave = true
        }
      }
    } else {
      // Convert date strings in GraphData back to Date objects
      record.graphData = record.graphData// List render — each item must have stable key
.map((entry: any) => ({
        ...entry,
        achieveDate: new Date(entry.achieveDate),
      }))
    }

    if (needsSave) {
      console.log(`[v0] Saving updated record for ${categoryName}`)
      saveCategoryRecord(record)
    }

    return record
  } catch (error) {
    console.error(`[v0] Failed to load category record for ${categoryName}:`, error)
    return createEmptyCategoryRecord(categoryName)
  }
}

// Component: createEmptyCategoryRecord — entry point

export function createEmptyCategoryRecord(categoryName: PlayCategory): CategoryRecord {
  const emptyRecord: CategoryRecord = {
    categoryName,
    provided_playList: [],
    playData: [],
    graphData: [],
    topAchievements: [],
    categoryDevelopmentalAge: 0,
  }

  return emptyRecord
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
      // Calculate achieved month from the child's birth date instead of fixed 2023 date
      const childProfile = loadChildProfile()
      const referenceDate = childProfile?.birthDate || new Date(2023, 0, 1)

      const achievedMonth =
        Math.round(
          ((latestDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) * 100
        ) / 100

      const graphEntry: GraphDataEntry = {
        achieveDate: latestDate,
        // ↓ 여기를 "실제로 스코프에 있는 플레이 식별자"로 교체
        playNumber: /* e.g. */ playData.playNumber,  // ← 정확한 변수명 알려주시면 즉시 확정 패치 드립니다
        achievedLevel_Highest: highestLevel,
        AchieveMonthOfThePlay: achievedMonth,
        achievedMonth: achievedMonth,
      }
      graphData.push(graphEntry)
    }
  })
  graphData.sort((a, b) => a.achieveDate.getTime() - b.achieveDate.getTime())
  return graphData
}

// Component: updateCategoryPlayData — entry point

export function updateCategoryPlayData(
  category: PlayCategory,
  playNumber: number,
  levelIndex: number,
  checked: boolean,
): void {
  try {
    console.log(`[v0] DEBUG: updateCategoryPlayData called with category: "${category}"`)

    const categoryRecord = loadCategoryRecord(category)
    if (!categoryRecord) {
      console.error(`[v0] No category record found for ${category}`)
      return
    }

    // Find or create the play data entry
    let playData = categoryRecord.playData.find((p) => p.playNumber === playNumber)

    if (!playData) {
      console.log(`[v0] DEBUG: No existing playData found for play #${playNumber}, creating new one`)

      const playActivity = categoryRecord.provided_playList.find((p) => p.number === playNumber)

      // PlayData 생성 시 provided_playList에서 정보를 가져오되, 없으면 기본값 대신 에러 처리
      if (!playActivity) {
        console.error(
          `[v0] Cannot create PlayData: Activity #${playNumber} not found in provided_playList for ${category}`,
        )
        console.error(`[v0] provided_playList length: ${categoryRecord.provided_playList.length}`)
        return
      }

      playData = {
        playNumber,
        playTitle: playActivity.title,
        minAge: playActivity.minAge,
        maxAge: playActivity.maxAge,
        achievedLevelFlags: [false, false, false, false, false],
        achievedDates: [undefined, undefined, undefined, undefined, undefined],
      }

      console.log(
        `[v0] DEBUG: Created PlayData - playNumber: ${playData.playNumber}, title: "${playData.playTitle}", minAge: ${playData.minAge}, maxAge: ${playData.maxAge}`,
      )
      categoryRecord.playData.push(playData)
    }

    // Update the specific level
    playData.achievedLevelFlags[levelIndex] = checked
    playData.achievedDates[levelIndex]       = checked ? new Date() : undefined

    // [2-1] 모든 레벨이 해제되면 해당 playData를 제거
    if (playData.achievedLevelFlags.every((f) => f === false)) {
      categoryRecord.playData = categoryRecord.playData.filter((p) => p.playNumber !== playNumber)
    }

    // [2-2] 파생 데이터 즉시 재계산: 그래프데이터 & 카테고리 발달나이
    //  - 그래프데이터는 현재 playData만으로 생성
    categoryRecord.graphData = generateGraphDataFromPlayData(categoryRecord)
    //  - 카테고리 발달나이 갱신
    categoryRecord.categoryDevelopmentalAge = calculateCategoryDevelopmentalAgeFromRecord(categoryRecord)

    // 변경 저장
    saveCategoryRecord(categoryRecord)
  } catch (error) {
    console.error(`[v0] Error updating category play data for ${category}:`, error)
  }
}
