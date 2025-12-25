// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/storage-category.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
import type { PlayRecord, CategoryRecord, PlayCategory, GraphDataEntry, ChildProfile } from "./types"
import { getCategoryStorageKey } from "./storage-core"
import { loadChildProfile } from "./storage-core"
import { supabase } from "@/lib/supabaseClient"
// import { loadCategoryDataSync } from "./data-parser"
import { CalculateDevAgeFromPlayData, computeAchieveMonthOfThePlay } from "@/lib/development-calculator"
import { calculateCategoryDevelopmentalAgeFromRecord } from "@/lib/storage-core"

// Child-specific CategoryRecord storage key helper
export function getChildCategoryStorageKey(categoryName: PlayCategory, profile?: ChildProfile): string {
  const p = profile ?? loadChildProfile()
  const safeName = (p.name || "").trim() || "아기"
  const birth = p.birthDate instanceof Date ? p.birthDate : new Date(p.birthDate)
  const datePart = birth.toISOString().split("T")[0]
  const childId = `${safeName}_${datePart}`
  return `komensky_category_record_${childId}_${categoryName}`
}


// Component: saveCategoryRecord — entry point

export function saveCategoryRecord(categoryRecord: CategoryRecord): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  
  const profile = loadChildProfile()
  const storageKey = getChildCategoryStorageKey(categoryRecord.categoryName, profile)

  try {
    localStorage.setItem(storageKey, JSON.stringify(categoryRecord))
  } catch (error) {
    console.error(`[v0] SAVE_CATEGORY: ERROR - Failed to save: ${error}`)
  }

  // Supabase에 동기화하여 PC/모바일 간 놀이 Level 기록을 공유
  try {
    if (supabase) {
      const profile = loadChildProfile()
      const rawName = (profile.name || "").trim()

      // 이름이 비어 있거나 기본 플레이스홀더("아기")인 경우에는
      // 잘못된 child_id("아기_YYYY-MM-DD")로 Supabase에 동기화하지 않는다.
      if (!rawName || rawName === "아기") {
        return
      }

      const datePart = profile.birthDate.toISOString().split("T")[0]
      const childId = `${rawName}_${datePart}`

      ;(async () => {
        try {
          // Supabase에는 아이마다 달라지는 진행 상황만 저장하고,
          // provided_playList 등 콘텐츠 정의는 로컬/파일에서 관리합니다.
          const remoteRecord = {
            playData: categoryRecord.playData,
            graphData: categoryRecord.graphData,
            categoryDevelopmentalAge: categoryRecord.categoryDevelopmentalAge,
          }

          const payload = {
            child_id: childId,
            category: categoryRecord.categoryName,
            record: remoteRecord,
          }

          const { error } = await supabase
            .from("category_records")
            .upsert(payload)
          if (error) {
            console.warn("[storage-category] Failed to sync category_record to Supabase:", error)
          }
        } catch (err) {
          console.warn("[storage-category] Unexpected Supabase error:", err)
        }
      })()
    }
  } catch (err) {
    console.warn("[storage-category] Unexpected error preparing Supabase sync:", err)
  }
}

// Component: loadCategoryRecord — entry point

export function loadCategoryRecord(categoryName: PlayCategory): CategoryRecord | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return createEmptyCategoryRecord(categoryName);
  }
  
  try {
    const profile = loadChildProfile()
    const newKey = getChildCategoryStorageKey(categoryName, profile)
    const legacyKey = `komensky_category_record_${categoryName}`

    let data = localStorage.getItem(newKey)

    // 마이그레이션: 예전 키에만 있으면 새 키로 옮깁니다.
    if (!data) {
      const legacy = localStorage.getItem(legacyKey)
      if (legacy) {
        data = legacy
        try {
          localStorage.setItem(newKey, legacy)
        } catch {
          // ignore
        }
      }
    }

    if (!data) {
      return createEmptyCategoryRecord(categoryName)
    }

    const record = JSON.parse(data)

    // No longer auto-load from detail files. If provided_playList is empty, leave as is.

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
      // 놀이의 발달 나이 계산 (생물학적 나이가 아님!)
      const achievedMonth = computeAchieveMonthOfThePlay(playData.minAge, playData.maxAge, highestLevel)

      const graphEntry: GraphDataEntry = {
        achieveDate: latestDate,
        playNumber: playData.playNumber,
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

    // 그래프 및 기타 UI가 최신 데이터를 반영하도록 재계산 이벤트 송신
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("recalculateCategory", {
            detail: { category },
          }),
        )
      } catch {
        // 이벤트 실패는 무시 (저장은 이미 완료됨)
      }
    }
  } catch (error) {
    console.error(`[v0] Error updating category play data for ${category}:`, error)
  }
}
