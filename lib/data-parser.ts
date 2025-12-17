// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/data-parser.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
import type { AvailablePlayList, PlayCategory, DetailedActivity } from "./types"
import { initializeGlobalCategories, reinitializeGlobalCategories } from "./global-categories"

// Component: getCachedCategories — entry point
export function getCachedCategories(): { korean: string; english: string }[] {
  // This function is only used for category name mapping, not for data loading.
  // The actual available play list is loaded from play_data.txt.
  return [
     { korean: "대 근육", english: "gross-motor" },
     { korean: "소 근육", english: "fine-motor" },
     { korean: "스스로", english: "self-care" },
     { korean: "문제 해결", english: "problem-solving" },
     { korean: "사회 정서", english: "social-emotion" },
     { korean: "수용 언어", english: "receptive-language" },
     { korean: "표현 언어", english: "expressive-language" },
  ];
}

// Component: extractCategoriesFromPlayData — entry point

export function extractCategoriesFromPlayData(rawData: string): { korean: string; english: string }[] {
  // console.log("[v0] Extracting categories from play data")

  if (rawData.includes("<!DOCTYPE html") || rawData.includes("<html")) {
    console.error("[v0] Received HTML instead of play data - file not found or wrong path")
    return []
  }

  // Normalize Windows/Mac line endings to \n so blank-line splitting works reliably
  const normalized = rawData.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const sections = normalized.split(/\n\n+/).filter((section) => section.trim())
  const categories: { korean: string; english: string }[] = []

  sections.forEach((section, index) => {
    const lines = section.split("\n").filter((line) => line.trim())
    if (lines.length > 0) {
      const rawCategoryName = lines[0].trim() // trim to remove any trailing newlines

      const match = rawCategoryName.match(/^(.+?),\s*(.+)$/)

      let koreanName = ""
      let englishName = ""

      if (match) {
        koreanName = match[1].trim()
        englishName = match[2].trim()
        // console.log(
        //   `[v0] Section ${index}: Successfully extracted - Korean: "${koreanName}", English: "${englishName}"`,
        // )
      } else {
        // 쉼표가 없는 경우 기존 방식 사용
        koreanName = rawCategoryName.trim()
        englishName = koreanName // fallback
        // console.log(
        //   `[v0] Section ${index}: No comma found, using fallback - Korean: "${koreanName}", English: "${englishName}"`,
        // )
      }

      // console.log(`[v0] Section ${index}: Raw category name: "${rawCategoryName}" (length: ${rawCategoryName.length})`)
      // console.log(`[v0] Section ${index}: Korean name: "${koreanName}", English name: "${englishName}"`)

      if (koreanName && !categories.find((cat) => cat.korean === koreanName)) {
        categories.push({ korean: koreanName, english: englishName })
        // console.log(`[v0] Added category: Korean="${koreanName}", English="${englishName}"`)
      } else if (!koreanName) {
        // console.log(`[v0] Empty category name in section ${index}`)
      } else {
        // console.log(`[v0] Duplicate category name: "${koreanName}"`)
      }
    }
  })

  // console.log("[v0] Extracted categories:", categories)
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
  // 입력이 "한글, 영문" 형태로 전달되는 경우가 있어
  // 먼저 콤마로 분리하여 한글 부분만 사용하도록 안전하게 처리합니다.
  const input = typeof koreanName === "string" && koreanName.includes(",") ? koreanName.split(",")[0].trim() : koreanName

  const categories = getCachedCategories()

  // 동적으로 로드된 카테고리에서 영문명 찾기 (한글명 비교)
  const category = categories.find((cat) => cat.korean === input)
  if (category) {
    return category.english
  }

  const staticMapping: Record<string, string> = {
     "대 근육": "gross-motor",
     "소 근육": "fine-motor",
     스스로: "self-care",
     "문제 해결": "problem-solving",
     "사회 정서": "social-emotion",
     "수용 언어": "receptive-language",
     "표현 언어": "expressive-language",
  }

  // 정적 매핑에서 찾기
  if (staticMapping[input]) {
    return staticMapping[input]
  }

  // 찾지 못한 경우 fallback: 입력 문자열을 영문형 파일명 스타일로 변환
  return input.toLowerCase().replace(/\s+/g, "-")
}

// Component: parsePlayData — entry point

export function parsePlayData(rawData: string): Record<string, AvailablePlayList[]> {
  // Parse play_data.txt and return available play list by category
  const extractedCategories = extractCategoriesFromPlayData(rawData)
  const categories: Record<string, AvailablePlayList[]> = {}
  extractedCategories.forEach(({ korean }) => {
    categories[korean] = []
  })
  const categoryMapping = createCategoryMapping(extractedCategories)
  if (rawData.includes("<!DOCTYPE html") || rawData.includes("<html")) {
    return categories
  }
  const normalizedData = rawData.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const sections = normalizedData.split(/\n\n+/).filter((section) => section.trim())
  sections.forEach((section) => {
    const lines = section.split("\n").filter((line) => line.trim())
    if (lines.length === 0) return
    const rawCategoryName = lines[0].trim()
    const match = rawCategoryName.match(/^(.+?),\s*(.+)$/)
    const koreanName = match ? match[1].trim() : rawCategoryName
    if (!categories[koreanName]) return
    for (let i = 2; i < lines.length; i++) {
      let parts = lines[i].split("\t");
      if (parts.length < 3) {
        parts = lines[i].split(/\s{2,}/);
      }
      if (parts.length >= 3) {
        const [numberStr, title, ageRange] = parts;
        if (numberStr === "Number" || title === "Korean Title" || ageRange === "Age Range") {
          continue;
        }
        const number = Number.parseInt(numberStr);
        const ageParts = ageRange.split("-");
        let minAge: number, maxAge: number;
        if (ageParts.length === 1) {
          const singleAge = Number.parseFloat(ageParts[0]);
          minAge = singleAge;
          maxAge = singleAge;
        } else {
          minAge = Number.parseFloat((ageParts[0] || '').trim());
          maxAge = Number.parseFloat((ageParts[1] || '').trim());
        }
        if (maxAge === 0 && minAge > 0) {
          maxAge = minAge;
        }
        if (isNaN(minAge) || isNaN(maxAge)) {
          continue;
        }
        if (maxAge < minAge) {
          continue;
        }
        categories[koreanName].push({
          number,
          title,
          ageRange,
          category: koreanName as PlayCategory,
          minAge,
          maxAge,
        });
      }
    }
  })
  reinitializeGlobalCategories()
  return categories
}

// Minimal helper: loadCategoryData
// For build/type-check purposes provide a simple exported function.
// In the original project this may read parsed data from disk; here
// we return an empty array as a safe default for tools that import it.
export async function loadCategoryData(korean: string): Promise<AvailablePlayList[]> {
  return []
}

// Component: parseDetailedActivity — entry point

export function parseDetailedActivity(rawData: string, activityNumber: number): DetailedActivity | null {
  // console.log(`[v0] DEBUG: parseDetailedActivity called for activity ${activityNumber}`)
  // console.log(`[v0] DEBUG: Raw data length: ${rawData.length}`)

  // Normalize line endings for Windows/Mac compatibility
  let normalizedData = rawData.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // /* ... */ 주석 블록 제거 (줄바꿈 포함, 여러 개 가능)
  normalizedData = normalizedData.replace(/\/\*[\s\S]*?\*\//g, "")

  // 각 활동은 "Number X:" 패턴으로 시작하고, 다음 "Number Y:" 또는 파일 끝까지가 하나의 활동
  const numberPattern = /^Number (\d+):\s/gm
  const matches = [...normalizedData.matchAll(numberPattern)]
  // console.log(`[v0] DEBUG: Found ${matches.length} activity sections`)

  // 요청된 활동 번호 찾기
  const targetMatch = matches.find((match) => Number.parseInt(match[1]) === activityNumber)
  if (!targetMatch) {
    // console.log(`[v0] DEBUG: No matching activity found for number ${activityNumber}`)
    return null
  }

  // 활동 시작 위치와 끝 위치 계산
  const startIndex = targetMatch.index!
  const nextMatch = matches.find((match) => Number.parseInt(match[1]) > activityNumber)
  const endIndex = nextMatch ? nextMatch.index! : normalizedData.length

  // 해당 활동의 텍스트 추출
  const activityText = normalizedData.substring(startIndex, endIndex).trim()
  // 빈 줄만 제거하되, 공백이 있는 줄은 유지 (줄바꿈 보존)
  const lines = activityText.split("\n").filter((line) => line.trim() !== "")
  // console.log(`[v0] DEBUG: Found matching activity section with ${lines.length} lines`)
  // console.log(`[v0] DEBUG: Activity section content:`, lines.slice(0, 10).join(" | "))

  const result: any = {
    number: activityNumber,
    sections: [], // 동적으로 파싱된 섹션들을 저장
  }

  let currentSection: any = null

  const saveCurrentSection = () => {
    if (currentSection && currentSection.title) {
      let contentLines = currentSection.lines.filter((line: string) => line.trim() !== "---");
      // console.log(`[증거] Section "${currentSection.title}" contentLines(before join):`, JSON.stringify(contentLines));
      currentSection.content = contentLines.join("\n"); // .trim() 제거: 앞/뒤 공백 보존
      // console.log(`[증거] Section "${currentSection.title}" content(after join):`, JSON.stringify(currentSection.content));
      // 난이도 조절 섹션은 content가 비어있어도 저장 (Level 정보는 별도로 파싱됨)
      const isDifficulty = currentSection.title.includes("난이도") || currentSection.title.includes("조절");
      // console.log(`[v0] DEBUG: saveCurrentSection - title: "${currentSection.title}", isDifficulty: ${isDifficulty}, lines: ${contentLines.length}, content: "${currentSection.content}"`);
      // 섹션 저장 (난이도 조절은 항상 저장)
      if (isDifficulty || currentSection.content || contentLines.length > 0) {
        result.sections.push(currentSection);
        // console.log(`[v0] DEBUG: ✓ Saved section "${currentSection.title}"`);
      } else {
        // console.log(`[v0] DEBUG: ✗ Skipped section "${currentSection.title}" (empty and not difficulty)`);
      }
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    if (trimmedLine === "---") {
      continue
    }

    // Level 처리 (기존 방식 유지)
    const levelMatch = trimmedLine.match(/^Level (\d+):\s*(.*)/)
    if (levelMatch) {
      saveCurrentSection() // 이전 섹션 저장
      currentSection = null

      if (!result.levels) result.levels = {} as any
      const levelNum = levelMatch[1]
      const levelContent = levelMatch[2]
      ;(result.levels as any)[`level${levelNum}`] = levelContent
      continue
    }


    // 소제목 찾기 (콜론으로 끝나는 줄: 들여쓰기/공백 상관없이)
    // 예: "놀이 방법:", "놀이 목표:" 등
    const subtitleMatch = trimmedLine.match(/^([^(:]+?):\s*(.*)$/)

    // "놀이 방법" 섹션 내부의 숫자로 시작하는 줄(1. 준비:, 2. 단서...)은 섹션이 아닌 내용으로 처리
    const isInMethodSection = currentSection && (currentSection.title === "놀이 방법" || currentSection.title === "놀이방법")
    const isNumberedStep = trimmedLine.match(/^\d+\.\s/)

    if (subtitleMatch && !(isInMethodSection && isNumberedStep)) {
      saveCurrentSection() // 이전 섹션 저장

      const title = subtitleMatch[1].trim()
      let initialContent = subtitleMatch[2].trim()

      // "난이도 조절" 섹션일 때 연령 범위 패턴 제거 (display에서 사용하지 않음)
      if (title.includes("난이도") || title.includes("조절")) {
        const beforeRemoval = initialContent
        // 하이픈(-), en-dash(–), em-dash(—) 모두 매칭, 시작 위치와 관계없이
        initialContent = initialContent.replace(/\([0-9.]+[-–—][0-9.]+개월\)\s*/g, '')
        // console.log(`[v0] DEBUG: 난이도 조절 섹션 - 연령 제거: "${beforeRemoval}" → "${initialContent}"`)
      }

      currentSection = {
        title: title,
        lines: initialContent ? [initialContent] : [],
      }
      // console.log(`[v0] DEBUG: Starting new section "${title}" with initial content: "${initialContent}"`)
    } else if (currentSection) {
      // 이미지 포맷: [이미지, 파일명.png, scale=1.0, "설명 텍스트"]
      const imageMatch = trimmedLine.match(/^\[이미지,\s*([^,\]]+),\s*scale=([\d.]+),\s*"([^"]*)"\s*\]$/);
      if (imageMatch) {
        currentSection.lines.push({
          type: 'image',
          src: imageMatch[1].trim(),
          scale: parseFloat(imageMatch[2]),
          desc: imageMatch[3].trim()
        });
        // console.log(`[v0] DEBUG: 이미지 파싱(라인 삽입): src=${imageMatch[1].trim()}, scale=${imageMatch[2]}, desc=${imageMatch[3].trim()}`);
      } else if (trimmedLine) {
        // 원본 line을 사용하여 들여쓰기 보존 (앞의 공백 유지)
        currentSection.lines.push(line)
        // console.log(`[v0] DEBUG: Adding to section "${currentSection.title}": "${line}"`)
      }
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

  // console.log(
  //   `[v0] DEBUG: Final parsed result with ${result.sections.length} sections:`,
  //   result.sections.map((s: any) => s.title),
  // )

  return result as DetailedActivity
}



// (Next.js 클라이언트/서버 분리: 서버 환경에서만 파일 접근 필요)
// 클라이언트 코드에서는 details 파일을 직접 읽지 않음. SSR/API에서만 파일 접근.
