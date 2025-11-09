// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/development-calculator.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
// lib/development-calculator.ts
import type { TopAchievement } from "./types"

//
// 1) 난이도 기반 발달개월 계산 (소수점 2자리)
//   - delta = (maxAge - minAge) / 4
//   - level > 0 → minAge + delta * (level-1)
//   - level <= 0 → 0
//
// Component: computeAchieveMonthOfThePlay — entry point
export function computeAchieveMonthOfThePlay(minAge: number, maxAge: number, level: number): number {
  if (!level || level <= 0) return 0
  const delta = (maxAge - minAge) / 4
  const v = minAge + delta * (level - 1)
  return Number(v.toFixed(2))
}

// 2) 카테고리별 devAge 계산: 최고 레벨만 채택 → 상위 3개 평균
type PlayDataEntry = {
  playNumber: number
  playTitle: string
  minAge: number
  maxAge: number
  achievedLevelFlags: [boolean, boolean, boolean, boolean, boolean]
  achievedDates: [Date?, Date?, Date?, Date?, Date?]
}

// 결과 확인/디버그에 유용한 구조 (요구하신 이름 유지)
export type PlayDataWithHighestLevelOnly = {
  playNumber: number
  AchievedDate: Date
  AchieveMonthOfThePlay: number
}

/**
 * CalculateDevAgeFromPlayData
 * 입력: 카테고리의 PlayData 목록
 * 출력: devlopedAge (최상 3개의 AchieveMonthOfThePlay 평균), 그리고 선택적으로 변환 리스트
 *
 * 알고리즘:
 *  - 각 놀이에서 최고 난이도 1개만 채택 (나머지 탈락)
 *  - 채택된 항목들을 AchieveMonthOfThePlay(개월)로 변환
 *  - 이를 날짜 오름차순으로 정렬 (요구사항 반영)
 *  - 그 중 "최상의 3개"(= 값이 큰 상위 3개)의 평균을 devlopedAge로 계산 (소수점 2자리)
 */
// Component: CalculateDevAgeFromPlayData — entry point
export function CalculateDevAgeFromPlayData(
  playDataList: PlayDataEntry[],
): { devlopedAge: number; items: Array<{ playNumber: number; AchievedDate: Date; AchieveMonthOfThePlay: number }> } {
  if (!Array.isArray(playDataList) || playDataList.length === 0) {
    return { devlopedAge: 0, items: [] }
  }

  const highestOnly: Array<{ playNumber: number; AchievedDate: Date; AchieveMonthOfThePlay: number }> = []

  for (const p of playDataList) {
    let highestLevel = 0
    let dateForHighest: Date | undefined

    p.achievedLevelFlags.forEach((achieved, idx) => {
      if (achieved) {
        const level = idx + 1
        if (level > highestLevel) {
          highestLevel = level
          dateForHighest = p.achievedDates[idx]
        }
      }
    })

    // level만 켰고 날짜가 비어있는 경우도 안전하게 필터
    if (highestLevel > 0 && dateForHighest instanceof Date) {
      const m = computeAchieveMonthOfThePlay(p.minAge, p.maxAge, highestLevel)
      highestOnly.push({
        playNumber: p.playNumber,
        AchievedDate: dateForHighest,
        AchieveMonthOfThePlay: m,
      })
    }
  }

  if (highestOnly.length === 0) return { devlopedAge: 0, items: [] }

  // 날짜 오름차순(요구사항)
  highestOnly.sort((a, b) => a.AchievedDate.getTime() - b.AchievedDate.getTime())

  // “최상의 3개”(값 큰 순) 평균
  const top3 = [...highestOnly].sort((a, b) => b.AchieveMonthOfThePlay - a.AchieveMonthOfThePlay).slice(0, 3)
  const avg = top3.reduce((s, r) => s + r.AchieveMonthOfThePlay, 0) / top3.length

  return { devlopedAge: Number(avg.toFixed(2)), items: highestOnly }
}

// Component: calculateBiologicalAge — entry point

export function calculateBiologicalAge(birthDate: Date, refDate: Date = new Date()): number {
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44
  const months = (refDate.getTime() - new Date(birthDate).getTime()) / msPerMonth
  return Number(months.toFixed(2))
}

/**
 * (호환용) 최고치 3개 평균으로 카테고리 발달나이 계산
 * - page.tsx / storage-core.ts 등에서 import 기대
 * - TopAchievement.developmentAge 기준 상위 3개 평균
 */
// Component: calculateCategoryDevelopmentalAgeFromTopAchievements — entry point
export function calculateCategoryDevelopmentalAgeFromTopAchievements(
  top: TopAchievement[],
): number {
  if (!Array.isArray(top) || top.length === 0) return 0
  const top3 = [...top].sort((a, b) => b.developmentAge - a.developmentAge).slice(0, 3)
  const avg = top3.reduce((s, t) => s + t.developmentAge, 0) / top3.length
  return Number(avg.toFixed(2))
}