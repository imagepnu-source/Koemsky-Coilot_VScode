// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/data-parser.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
import type { AvailablePlayList, PlayCategory, DetailedActivity } from "./types"
import { initializeGlobalCategories, reinitializeGlobalCategories } from "./global-categories"

let cachedPlayData: Record<string, AvailablePlayList[]> | null = null
let cachedCategories: { korean: string; english: string }[] | null = null
let isLoading = false

// Component: getCachedCategories — entry point

export function getCachedCategories(): { korean: string; english: string }[] {
  return cachedCategories || []
}

// Component: extractCategoriesFromPlayData — entry point

export function extractCategoriesFromPlayData(rawData: string): { korean: string; english: string }[] {
  console.log("[v0] Extracting categories from play data")

  if (rawData.includes("<!DOCTYPE html") || rawData.includes("<html")) {
    console.error("[v0] Received HTML instead of play data - file not found or wrong path")
    return []
  }

  const sections = rawData.split("\n\n").filter((section) => section.trim())
  const categories: { korean: string; english: string }[] = []

  sections.forEach((section, index) => {
    const lines = section.split("\n").filter((line) => line.trim())
    if (lines.length > 0) {
      const rawCategoryName = lines[0]

      const match = rawCategoryName.match(/^(.+?),\s*(.+?)$/)

      let koreanName = ""
      let englishName = ""

      if (match) {
        koreanName = match[1].trim()
        englishName = match[2].trim()
        console.log(
          `[v0] Section ${index}: Successfully extracted - Korean: "${koreanName}", English: "${englishName}"`,
        )
      } else {
        // 쉼표가 없는 경우 기존 방식 사용
        koreanName = rawCategoryName.trim()
        englishName = koreanName // fallback
        console.log(
          `[v0] Section ${index}: No comma found, using fallback - Korean: "${koreanName}", English: "${englishName}"`,
        )
      }

      console.log(`[v0] Section ${index}: Raw category name: "${rawCategoryName}" (length: ${rawCategoryName.length})`)
      console.log(`[v0] Section ${index}: Korean name: "${koreanName}", English name: "${englishName}"`)

      if (koreanName && !categories.find((cat) => cat.korean === koreanName)) {
        categories.push({ korean: koreanName, english: englishName })
        console.log(`[v0] Added category: Korean="${koreanName}", English="${englishName}"`)
      } else if (!koreanName) {
        console.log(`[v0] Empty category name in section ${index}`)
      } else {
        console.log(`[v0] Duplicate category name: "${koreanName}"`)
      }
    }
  })

  console.log("[v0] Extracted categories:", categories)
  return categories
}

// Component: createCategoryMapping — entry point

export function createCategoryMapping(categories: { korean: string; english: string }[]): Record<string, string> {
  const mapping: Record<string, string> = {}

  categories.forEach(({ korean, english }) => {
    mapping[korean] = korean

    // 영문명도 한글명으로 매핑
    mapping[english] = korean

    // 공백을 하이픈으로 변환한 버전도 매핑
    const hyphenated = korean.replace(/\s+/g, "-")
    if (hyphenated !== korean) {
      mapping[hyphenated] = korean
    }
    // 하이픈을 공백으로 변환한 버전도 매핑
    const spaced = korean.replace(/-/g, " ")
    if (spaced !== korean) {
      mapping[spaced] = korean
    }
  })

  return mapping
}

// Component: getEnglishCategoryName — entry point

export function getEnglishCategoryName(koreanName: string): string {
  const categories = getCachedCategories()

  // 동적으로 로드된 카테고리에서 영문명 찾기
  const category = categories.find((cat) => cat.korean === koreanName)
  if (category) {
    return category.english
  }

  const staticMapping: Record<string, string> = {
    대근육: "gross-motor",
    소근육: "fine-motor",
    스스로: "self-care",
    "문제 해결": "problem-solving",
    "사회적 감성": "social-emotional",
    "수용 언어": "receptive-language",
    "표현 언어": "expressive-language",
  }

  // 정적 매핑에서 찾기
  if (staticMapping[koreanName]) {
    return staticMapping[koreanName]
  }

  // 찾지 못한 경우 fallback: 한글명을 영문 형식으로 변환
  return koreanName.toLowerCase().replace(/\s+/g, "-")
}

// Component: parsePlayData — entry point

export function parsePlayData(rawData: string): Record<string, AvailablePlayList[]> {
  console.log("[v0] parsePlayData called with data length:", rawData.length)

  const extractedCategories = extractCategoriesFromPlayData(rawData)
  cachedCategories = extractedCategories

  const categories: Record<string, AvailablePlayList[]> = {}

  // 추출된 카테고리로 초기화 (한글명을 키로 사용)
  extractedCategories.forEach(({ korean }) => {
    categories[korean] = []
  })

  const categoryMapping = createCategoryMapping(extractedCategories)

  if (rawData.includes("<!DOCTYPE html") || rawData.includes("<html")) {
    console.error("[v0] Received HTML instead of play data - file not found or wrong path")
    return categories
  }

  const sections = rawData.split("\n\n").filter((section) => section.trim())
  console.log("[v0] Found sections:", sections.length)

  sections.forEach((section, index) => {
    const lines = section.split("\n").filter((line) => line.trim())
    if (lines.length === 0) return

    const rawCategoryName = lines[0]
    const match = rawCategoryName.match(/^(.+?),\s*(.+?)$/)
    const koreanName = match ? match[1].trim() : rawCategoryName.trim()

    const categoryName = categoryMapping[koreanName]

    if (!categoryName || !categories[categoryName]) {
      console.log("[v0] Unknown category:", rawCategoryName)
      return
    }

    // Skip header line and process data lines
    let activitiesAdded = 0
    for (let i = 2; i < lines.length; i++) {
      const parts = lines[i].split("\t")
      if (parts.length >= 3) {
        const [numberStr, title, ageRange] = parts
        const number = Number.parseInt(numberStr)

        // Parse age range (e.g., "0.5-4" -> min: 0.5, max: 4, or "12" -> min=12, max=12)
        // Use parseFloat to preserve decimal ages (previously parseInt dropped decimals)
        const ageParts = ageRange.split("-")
        let minAge: number, maxAge: number

        if (ageParts.length === 1) {
          // Single age like "12" should be treated as min=max=12
          const singleAge = Number.parseFloat(ageParts[0])
          minAge = singleAge
          maxAge = singleAge
        } else {
          // Range like "0.5-4" should be parsed with decimals preserved
          minAge = Number.parseFloat((ageParts[0] || '').trim())
          maxAge = Number.parseFloat((ageParts[1] || '').trim())
        }

        if (maxAge === 0 && minAge > 0) {
          maxAge = minAge
        }

        // Validate parsed ages
        if (isNaN(minAge) || isNaN(maxAge)) {
          console.error(`[v0] Invalid age data for activity ${number}: "${ageRange}" -> min=${minAge}, max=${maxAge}`)
          continue // Skip this activity
        }

        if (maxAge < minAge) {
          console.error(`[v0] Invalid age range for activity ${number}: max (${maxAge}) < min (${minAge})`)
          continue // Skip this activity
        }

        categories[categoryName].push({
          number,
          title,
          ageRange,
          category: categoryName as PlayCategory,
          minAge,
          maxAge,
        })
        activitiesAdded++
      }
    }
    console.log(`[v0] Added ${activitiesAdded} activities to ${categoryName}`)
  })

  console.log(
    "[v0] Final categories with counts:",
    Object.keys(categories).map((key) => `${key}: ${categories[key].length}`),
  )

  reinitializeGlobalCategories()

  return categories
}

// Component: parseDetailedActivity — entry point

export function parseDetailedActivity(rawData: string, activityNumber: number): DetailedActivity | null {
  console.log(`[v0] DEBUG: parseDetailedActivity called for activity ${activityNumber}`)
  console.log(`[v0] DEBUG: Raw data length: ${rawData.length}`)

  // 각 활동은 "Number X:" 패턴으로 시작하고, 다음 "Number Y:" 또는 파일 끝까지가 하나의 활동
  const numberPattern = /^Number (\d+):\s/gm
  const matches = [...rawData.matchAll(numberPattern)]

  console.log(`[v0] DEBUG: Found ${matches.length} activity sections`)

  // 요청된 활동 번호 찾기
  const targetMatch = matches.find((match) => Number.parseInt(match[1]) === activityNumber)
  if (!targetMatch) {
    console.log(`[v0] DEBUG: No matching activity found for number ${activityNumber}`)
    return null
  }

  // 활동 시작 위치와 끝 위치 계산
  const startIndex = targetMatch.index!
  const nextMatch = matches.find((match) => Number.parseInt(match[1]) > activityNumber)
  const endIndex = nextMatch ? nextMatch.index! : rawData.length

  // 해당 활동의 텍스트 추출
  const activityText = rawData.substring(startIndex, endIndex).trim()
  const lines = activityText.split("\n").filter((line) => line.trim())

  console.log(`[v0] DEBUG: Found matching activity section with ${lines.length} lines`)
  console.log(`[v0] DEBUG: Activity section content:`, lines.slice(0, 10).join(" | "))

  const result: any = {
    number: activityNumber,
    sections: [], // 동적으로 파싱된 섹션들을 저장
  }

  let currentSection: any = null

  const saveCurrentSection = () => {
    if (currentSection && currentSection.title) {
      const contentLines = currentSection.lines.filter((line: string) => line.trim() !== "---")
      currentSection.content = contentLines.join("\n").trim()
      result.sections.push(currentSection)
      console.log(`[v0] DEBUG: Saved section "${currentSection.title}" with ${contentLines.length} lines`)
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim() === "---") {
      continue
    }

    // Level 처리 (기존 방식 유지)
    const levelMatch = line.match(/^Level (\d+):\s*(.*)/)
    if (levelMatch) {
      saveCurrentSection() // 이전 섹션 저장
      currentSection = null

      if (!result.levels) result.levels = {} as any
      const levelNum = levelMatch[1]
      const levelContent = levelMatch[2]
      ;(result.levels as any)[`level${levelNum}`] = levelContent
      continue
    }

    // 소제목 찾기 (콜론으로 끝나는 줄)
    const subtitleMatch = line.match(/^(.+?):\s*(.*)$/)
    if (subtitleMatch) {
      saveCurrentSection() // 이전 섹션 저장

      const title = subtitleMatch[1].trim()
      const initialContent = subtitleMatch[2].trim()

      currentSection = {
        title: title,
        lines: initialContent ? [initialContent] : [],
      }
      console.log(`[v0] DEBUG: Starting new section "${title}" with initial content: "${initialContent}"`)
    } else if (currentSection) {
      // 현재 섹션의 연속 내용
      currentSection.lines.push(line)
      console.log(`[v0] DEBUG: Adding to section "${currentSection.title}": "${line}"`)
    }
  }

  // 마지막 섹션 저장
  saveCurrentSection()

  // 기존 필드들도 호환성을 위해 유지 (첫 번째로 찾은 것들로 설정)
  result.sections.forEach((section: any) => {
    switch (section.title) {
      case "준비 시간":
      case "준비시간":
        if (!result.prepTime) result.prepTime = section.content
        break
      case "놀이 시간":
      case "놀이시간":
        if (!result.playTime) result.playTime = section.content
        break
      case "놀이 목표":
        if (!result.objective) result.objective = section.content
        break
      case "준비물":
        if (!result.materials) result.materials = section.content
        break
      case "놀이 방법":
      case "놀이방법":
        if (!result.method) result.method = section.content
        break
      case "발달 자극 요소":
        if (!result.developmentStimulation) result.developmentStimulation = section.content
        break
      case "확장 활동":
      case "확장활동":
        if (!result.extensionActivity) result.extensionActivity = section.content
        break
      case "코메니우스 교육철학 반영":
      case "코메니우스 철학 적용":
        if (!result.comeniusPhilosophy) result.comeniusPhilosophy = section.content
        break
    }
  })

  console.log(
    `[v0] DEBUG: Final parsed result with ${result.sections.length} sections:`,
    result.sections.map((s: any) => s.title),
  )

  return result as DetailedActivity
}

async function initializeCache(): Promise<Record<string, AvailablePlayList[]>> {
  if (cachedPlayData) {
    console.log("[v0] CACHE: Using existing cached data")
    initializeGlobalCategories()
    return cachedPlayData
  }

  if (isLoading) {
    console.log("[v0] CACHE: Already loading, waiting...")
    // 로딩 중이면 잠시 대기 후 재시도
    await new Promise((resolve) => setTimeout(resolve, 100))
    return initializeCache()
  }

  console.log("[v0] CACHE: Loading play_data.txt for the first time")
  isLoading = true

  try {
    const response = await fetch("/play_data.txt")
    if (!response.ok) {
      console.error(`[v0] CACHE: Failed to fetch play_data.txt: ${response.status}`)
      isLoading = false
      return {}
    }

    const rawData = await response.text()
    cachedPlayData = parsePlayData(rawData)
    console.log("[v0] CACHE: Successfully cached all play data")
    isLoading = false
    return cachedPlayData
  } catch (error) {
    console.error("[v0] CACHE: Error loading play data:", error)
    isLoading = false
    return {}
  }
}

export async function loadCategoryData(category: string): Promise<AvailablePlayList[]> {
  console.log(`[v0] CACHE: Loading ${category} data from cache`)

  const allData = await initializeCache()

  console.log(`[v0] DEBUG: Available categories in cache:`, Object.keys(allData))
  console.log(`[v0] DEBUG: Looking for category: "${category}"`)

  const categoryData = allData[category] || []

  if (categoryData.length === 0) {
    console.log(`[v0] DEBUG: No data found for "${category}", trying alternative lookups`)

    // Try to find by partial match or alternative names
    const alternativeKey = Object.keys(allData).find((key) => key.includes(category) || category.includes(key))

    if (alternativeKey) {
      console.log(`[v0] DEBUG: Found alternative key: "${alternativeKey}"`)
      const alternativeData = allData[alternativeKey] || []
      console.log(`[v0] CACHE: Found ${alternativeData.length} activities for alternative key "${alternativeKey}"`)
      return alternativeData
    }
  }

  console.log(`[v0] CACHE: Found ${categoryData.length} activities for ${category}`)
  return categoryData
}

// Component: loadCategoryDataSync — entry point

export function loadCategoryDataSync(category: string): AvailablePlayList[] {
  console.log(`[v0] CACHE: Loading ${category} data from cache (sync)`)

  if (!cachedPlayData) {
    console.log(`[v0] CACHE: No cached data available for sync load`)
    return []
  }

  console.log(`[v0] DEBUG: Available categories in cache:`, Object.keys(cachedPlayData))
  console.log(`[v0] DEBUG: Looking for category: "${category}"`)

  const categoryData = cachedPlayData[category] || []

  if (categoryData.length === 0) {
    console.log(`[v0] DEBUG: No data found for "${category}", trying alternative lookups`)

    // Try to find by partial match or alternative names
    const alternativeKey = Object.keys(cachedPlayData).find((key) => key.includes(category) || category.includes(key))

    if (alternativeKey) {
      console.log(`[v0] DEBUG: Found alternative key: "${alternativeKey}"`)
      const alternativeData = cachedPlayData[alternativeKey] || []
      console.log(`[v0] CACHE: Found ${alternativeData.length} activities for alternative key "${alternativeKey}"`)
      return alternativeData
    }
  }

  console.log(`[v0] CACHE: Found ${categoryData.length} activities for ${category}`)
  return categoryData
}

export async function loadAllCategoriesIndependently(): Promise<Record<string, AvailablePlayList[]>> {
  console.log("[v0] CACHE: Loading all categories from cache")

  const allData = await initializeCache()
  console.log("[v0] CACHE: Returning all cached categories")
  return allData
}

// Component: clearCache — entry point

export function clearCache(): void {
  console.log("[v0] CACHE: Clearing cached data")
  cachedPlayData = null
  cachedCategories = null
  isLoading = false
}

export { cachedPlayData }
