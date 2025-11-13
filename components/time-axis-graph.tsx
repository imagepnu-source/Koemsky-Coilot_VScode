// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: components/time-axis-graph.tsx
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { generateCategoryColors } from "@/lib/types"
import type { ChildProfile } from "@/lib/types"
import { Slider } from "@/components/ui/slider"

interface TimeAxisGraphProps {
  childProfile: ChildProfile
}

// Component: TimeAxisGraph — entry point

export function TimeAxisGraph({ childProfile }: TimeAxisGraphProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryGraphDataCache, setCategoryGraphDataCache] = useState<Map<string, any[]>>(new Map())
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
  const svgRef = useRef<SVGSVGElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 300 })

  const tooltipRef = useRef<{ x: number; y: number; data: any } | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const tooltipDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const tooltipDebugCountRef = useRef(0)

  // Effect: runs on mount/update — keep deps accurate to avoid extra renders

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/play_data.txt")
        if (!response.ok) return

        const rawData = await response.text()
        const sections = rawData.split("\n\n").filter((section) => section.trim())
        const categories: string[] = []

        sections.forEach((section) => {
          const lines = section.split("\n").filter((line) => line.trim())
          if (lines.length > 0) {
            const categoryLine = lines[0].trim()
            const categoryName = categoryLine.includes(",") ? categoryLine.split(",")[0].trim() : categoryLine
            if (categoryName && !categories.includes(categoryName)) {
              categories.push(categoryName)
            }
          }
        })

        setAllCategories(categories)
        setCategoryColors(generateCategoryColors(categories))
      } catch (error) {
        console.error("Error loading categories:", error)
      }
    }

    loadCategories()
  }, [])

  const birthDate = new Date(childProfile.birthDate)
  const today = new Date()

  const totalDays = Math.ceil((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24))

  const getMaxPlayDate = useCallback(() => {
    let maxDate = birthDate.getTime()

    allCategories.forEach((category) => {
      try {
        const categoryKey = `komensky_category_record_${category}`
        const categoryRecordStr = localStorage.getItem(categoryKey)

        if (categoryRecordStr) {
          const categoryRecord = JSON.parse(categoryRecordStr)

          if (categoryRecord.graphData && categoryRecord.graphData.length > 0) {
            categoryRecord.graphData.forEach((entry: any) => {
              const entryDate = entry.achieveDate instanceof Date ? entry.achieveDate : new Date(entry.achieveDate)
              if (entryDate.getTime() > maxDate) {
                maxDate = entryDate.getTime()
              }
            })
          }
        }
      } catch (error) {
        console.error(`Error reading graph data for ${category}:`, error)
      }
    })

    return maxDate
  }, [allCategories, birthDate])

  const maxPlayDate = useMemo(() => getMaxPlayDate(), [getMaxPlayDate])

  const [rangeStart, setRangeStart] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("timeAxisGraph_rangeStart")
      return saved ? Number.parseInt(saved) : 0
    }
    return 0
  })

  const [rangeEnd, setRangeEnd] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("timeAxisGraph_rangeEnd")
      return saved ? Number.parseInt(saved) : totalDays
    }
    return totalDays
  })

  // Effect: runs on mount/update — keep deps accurate to avoid extra renders

  useEffect(() => {
    setRangeEnd(totalDays)
    setTempRangeEnd(totalDays)
  }, [totalDays])

  // Listen for recalculateCategory events and clear cache for that category
  useEffect(() => {
    const handleCategoryRecalculation = (event: CustomEvent<{ category: string }>) => {
      const category = event.detail.category
      console.log(`[TimeAxisGraph] Clearing cache for category: ${category}`)
      setCategoryGraphDataCache((prevCache) => {
        const newCache = new Map(prevCache)
        newCache.delete(category)
        return newCache
      })
    }

    window.addEventListener("recalculateCategory", handleCategoryRecalculation as EventListener)
    return () => {
      window.removeEventListener("recalculateCategory", handleCategoryRecalculation as EventListener)
    }
  }, [])

  const [tempRangeStart, setTempRangeStart] = useState(rangeStart)
  const [tempRangeEnd, setTempRangeEnd] = useState(rangeEnd)

  const xAxisDomain = useMemo<[number, number]>(() => {
    const DAY = 24 * 60 * 60 * 1000
    const start = birthDate.getTime() + rangeStart * DAY
    const end   = birthDate.getTime() + rangeEnd   * DAY   // ← 슬라이드의 끝값 사용
    return [start, end] as [number, number]
  }, [birthDate, rangeStart, rangeEnd])                     // ← today 대신 rangeEnd

  const visibleCategories = allCategories

  const loadGraphDataForCategory = useCallback(
    (category: string): any[] => {
      let graphData = categoryGraphDataCache.get(category)
      if (!graphData) {
        try {
          const categoryKey = `komensky_category_record_${category}`
          const categoryRecordStr = localStorage.getItem(categoryKey)
          
          console.log(`[TimeAxisGraph] Loading data for category: "${category}", key: "${categoryKey}"`)
          
          if (!categoryRecordStr) {
            console.warn(`[TimeAxisGraph] No data found for key: ${categoryKey}`)
            return []
          }

          const categoryRecord = JSON.parse(categoryRecordStr)
          console.log(`[TimeAxisGraph] Parsed data for ${category}:`, {
            playDataCount: categoryRecord.playData?.length || 0,
            graphDataCount: categoryRecord.graphData?.length || 0
          })
          
          if (!categoryRecord.graphData || categoryRecord.graphData.length === 0) {
            console.warn(`[TimeAxisGraph] Empty graphData for ${category}`)
            return []
          }

          graphData = categoryRecord.graphData as any[]
          console.log(`[TimeAxisGraph] Loaded ${graphData.length} graph entries for ${category}`)
        } catch (error) {
          console.error(`[TimeAxisGraph] Error loading data for ${category}:`, error)
          return []
        }
      } else {
        console.log(`[TimeAxisGraph] Using cached data for ${category}: ${graphData.length} entries`)
      }
      return graphData ?? []  // ← 항상 배열 보장
    },
    [categoryGraphDataCache],
)

  const handleTooltipShow = useCallback((x: number, y: number, data: any) => {
    if (tooltipDebounceRef.current) {
      clearTimeout(tooltipDebounceRef.current)
    }

    tooltipDebounceRef.current = setTimeout(() => {
      tooltipRef.current = { x, y, data }
      setTooltipVisible(true)

      if (tooltipDebugCountRef.current < 10) {
        console.log(`[v0] TOOLTIP_SHOW #${tooltipDebugCountRef.current + 1}:`, { x, y, data })
        tooltipDebugCountRef.current++
      }
    }, 100)
  }, [])

  const handleTooltipHide = useCallback(() => {
    if (tooltipDebounceRef.current) {
      clearTimeout(tooltipDebounceRef.current)
    }

    tooltipDebounceRef.current = setTimeout(() => {
      tooltipRef.current = null
      setTooltipVisible(false)

      if (tooltipDebugCountRef.current < 10) {
        console.log(`[v0] TOOLTIP_HIDE #${tooltipDebugCountRef.current + 1}`)
        tooltipDebugCountRef.current++
      }
    }, 100)
  }, [])

  const DrawChart = useCallback(
    (
      svgElement: SVGSVGElement,
      color: string,
      lineWidth: number,
      circleSize: number,
      xAxisRange: [number, number],
      graphData: any[],
      yAxisRange: [number, number],
      category: string,
    ) => {
      const chartWidth = chartDimensions.width
      const chartHeight = chartDimensions.height
      const margin = { top: 20, right: 50, bottom: 50, left: 50 }
      const plotWidth = chartWidth - margin.left - margin.right
      const plotHeight = chartHeight - margin.top - margin.bottom
      const [xMin, xMax] = xAxisRange
      const [yMin, yMax] = yAxisRange

      const currentOpacity = (selectedCategory === null || selectedCategory === category) ? 1 : 0.4


      const birthPoint = {
        timestamp: birthDate.getTime(),
        achievedMonth: 0,
        x: 0,
        y: 0,
        isActualData: true,
        isBirthPoint: true,
        originalData: {
          playNumber: 0,
          playTitle: "출생",
          achievedMonth: 0,
          achieveDate: birthDate,
        },
      }

      const allPoints = [
        ...graphData
          .filter((entry: any) => {
            const recordDate = entry.achieveDate instanceof Date ? entry.achieveDate : new Date(entry.achieveDate)
            const timestamp = recordDate.getTime()
            const isValid = 
                    // (A) 0개월짜리(=출생점) 제거
              entry.achievedMonth > 0 &&
              // (B) 날짜/수치 유효성 (원래 쓰던 검증이 있으면 유지)
              !Number.isNaN(recordDate.getTime());

            return isValid
          })
          .map((entry: any) => {
            const recordDate = entry.achieveDate instanceof Date ? entry.achieveDate : new Date(entry.achieveDate)
            const timestamp = recordDate.getTime()
            const x = margin.left + ((timestamp - xMin) / (xMax - xMin)) * plotWidth
            const y = margin.top + plotHeight - ((entry.achievedMonth - yMin) / (yMax - yMin)) * plotHeight

            return {
              timestamp,
              achievedMonth: entry.achievedMonth,
              x,
              y,
              isActualData: true,
              isBirthPoint: false,
              originalData: entry,
            }
          }),
      ].sort((a, b) => a.timestamp - b.timestamp)

      // Update birth point coordinates
      birthPoint.x = margin.left + ((birthPoint.timestamp - xMin) / (xMax - xMin)) * plotWidth
      birthPoint.y = margin.top + plotHeight - ((birthPoint.achievedMonth - yMin) / (yMax - yMin)) * plotHeight

      // Debug log for 대근육 category
      if (category === "대근육") {
        console.log(`[v0] GRAPH_ALL_POINTS: ${category}`, {
          totalPoints: allPoints.length,
          points: allPoints// List render — each item must have stable key
.map((p) => ({
            playNumber: p.originalData.playNumber,
            date: new Date(p.timestamp).toISOString(),
            devAge: p.achievedMonth,
            x: p.x,
            y: p.y,
            isBirth: p.isBirthPoint,
            inRange: p.timestamp >= xMin && p.timestamp <= xMax,
          })),
        })
        console.log(`[v0] GRAPH_POINTS_COUNT: ${category} has ${allPoints.length} points`)
        allPoints.forEach((p, index) => {
          console.log(`[v0] GRAPH_POINT_${index}: ${category} #${p.originalData.playNumber}`, {
            date: new Date(p.timestamp).toISOString(),
            devAge: p.achievedMonth,
            x: Math.round(p.x),
            y: Math.round(p.y),
            isBirth: p.isBirthPoint,
            inXRange: p.timestamp >= xMin && p.timestamp <= xMax,
          })
        })
      }

      if (allPoints.length === 0) return

// ▼▼▼ 여기부터 교체 ▼▼▼
const visiblePoints: any[] = [];

// Build boundary points **only when needed**, and never mutate originals
const EPS = 1; // 1ms tolerance

// 1) 실제 데이터 포인트만(출생점/보간 제외), 시간 오름차순
const actualPoints = allPoints
  .filter(p => p.isActualData)
  .sort((a, b) => a.timestamp - b.timestamp);

// 2) 헬퍼들
const lastLT  = (t: number) => { const arr = actualPoints.filter(p => p.timestamp <  t - EPS); return arr.at(-1); };
const lastLE  = (t: number) => { const arr = actualPoints.filter(p => p.timestamp <= t + EPS); return arr.at(-1); };
const firstGE = (t: number) =>  actualPoints.find(p => p.timestamp >= t - EPS);
const firstGT = (t: number) =>  actualPoints.find(p => p.timestamp >  t + EPS);

const lerp = (a: number, b: number, r: number) => a + (b - a) * r;

// 경계 보간점 생성(항상 새 객체 생성, 원본 변조 금지)
function makeBoundaryAt(targetT: number, p1: any, p2: any, xFixed?: number) {
  const r = (targetT - p1.timestamp) / (p2.timestamp - p1.timestamp);
  const bx = (typeof xFixed === 'number') ? xFixed : lerp(p1.x, p2.x, r);
  const by = lerp(p1.y, p2.y, r);
  return {
    timestamp: targetT,
    x: bx,
    y: by,
    isActualData: false,
    isBirthPoint: false,
    originalData: null, // 경계점은 원본 참조를 갖지 않음
  };
}

// 3) 왼쪽 경계: xMin을 '끼는' 실제점 쌍이 있을 때만
{
  const prev = lastLT(xMin);
  const next = firstGE(xMin);
  if (prev && next) {
    visiblePoints.push(makeBoundaryAt(xMin, prev, next, margin.left)); // x를 왼쪽 경계로 고정
  }
}

// 4) 범위 내 실제 데이터 모두(원은 여기서만 그려짐)
for (const p of actualPoints) {
  if (p.timestamp >= xMin - EPS && p.timestamp <= xMax + EPS) {
    visiblePoints.push(p); // 원본 그대로 (변조 금지)
  }
}

// 5) 오른쪽 경계: xMax를 '끼는' 실제점 쌍이 있을 때만
{
  const prev = lastLE(xMax);
  const next = firstGT(xMax);
  if (prev && next) {
    visiblePoints.push(makeBoundaryAt(xMax, prev, next, margin.left + plotWidth)); // x를 오른쪽 경계로 고정
  }
}
// ▲▲▲ 여기까지 교체 ▲▲▲


  // === DevAge trend (top-3 running max average) ===
  try {
    // actualPoints: already built above as time-ordered raw data points
    const sortedActual = actualPoints.slice().sort((a,b) => a.timestamp - b.timestamp);
    const devPoints: { timestamp: number; devAge: number; x: number; y: number }[] = [];
    const top3: number[] = [];

    for (const p of sortedActual) {
      const v = Number(p.achievedMonth) || 0;
      top3.push(v);
      top3.sort((a,b) => b - a);
      if (top3.length > 3) top3.length = 3;

      const avg = top3.reduce((s, n) => s + n, 0) / top3.length;

      if (p.timestamp >= xMin && p.timestamp <= xMax) {
        const x = margin.left + ((p.timestamp - xMin) / (xMax - xMin)) * plotWidth;
        const y = margin.top + plotHeight - ((avg - yMin) / (yMax - yMin)) * plotHeight;
        devPoints.push({ timestamp: p.timestamp, devAge: avg, x, y });
      }
    }

    if (devPoints.length >= 2) {
      const dPath = "M " + devPoints[0].x + " " + devPoints[0].y +
        devPoints.slice(1).map(p => " L " + p.x + " " + p.y).join("");
      const devPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      devPath.setAttribute("d", dPath);
      devPath.setAttribute("fill", "none");
      devPath.setAttribute("stroke", color);
      devPath.setAttribute("stroke-width", (lineWidth + 0.5).toString());
      devPath.setAttribute("opacity", String(0.9 * currentOpacity));
      svgElement.appendChild(devPath);

      // devAge points are filled circles
      devPoints.forEach((pt) => {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", pt.x.toString());
        c.setAttribute("cy", pt.y.toString());
        c.setAttribute("r", Math.max(2, circleSize).toString());
        c.setAttribute("fill", color);
        c.setAttribute("stroke", color);
        c.setAttribute("stroke-width", "0.5");
        c.setAttribute("opacity", String(currentOpacity));
        svgElement.appendChild(c);
      });
    }
  } catch (e) {
    console.warn("[devAge] compute/draw error:", e);
  }
  // === end DevAge trend ===
// (disabled) original connecting line removed; keep hollow circles only
visiblePoints.forEach((point) => {
        if (point.isActualData && point.timestamp >= xMin - EPS && point.timestamp <= xMax + EPS) {
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
          circle.setAttribute("cx", point.x.toString())
          circle.setAttribute("cy", point.y.toString())
          circle.setAttribute("r", circleSize.toString())

          if (point.isBirthPoint) {
            // Birth point: filled circle
            circle.setAttribute("fill", color)
          } else {
            // Play points: hollow circle
            circle.setAttribute("fill", "white")
            circle.setAttribute("stroke", color)
            circle.setAttribute("stroke-width", "2")
          }

          circle.style.cursor = "pointer"

          circle.addEventListener("mouseenter", (e) => {
            if (selectedCategory === category || selectedCategory === null) {
              const svgRect = svgElement.getBoundingClientRect()
              handleTooltipShow(e.clientX - svgRect.left, e.clientY - svgRect.top, {
                category,
                ...point.originalData,
                date: new Date(point.timestamp).toLocaleDateString("ko-KR"),
              })
            }
          })

          circle.addEventListener("mouseleave", () => {
            handleTooltipHide()
          })

          circle.setAttribute("opacity", String(currentOpacity));
        svgElement.appendChild(circle)
        }
      })
    },
    [chartDimensions, selectedCategory, handleTooltipShow, handleTooltipHide, birthDate],
  )

  const interpolateAtBoundary = (points: any[], boundaryTime: number, side: "left" | "right") => {
    if (points.length < 2) return null

    let beforePoint = null
    let afterPoint = null

    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].timestamp <= boundaryTime && points[i + 1].timestamp >= boundaryTime) {
        beforePoint = points[i]
        afterPoint = points[i + 1]
        break
      }
    }

    if (!beforePoint || !afterPoint) {
      if (side === "left") {
        return points.find((p) => p.timestamp >= boundaryTime) || points[points.length - 1]
      } else {
        return points.reverse().find((p) => p.timestamp <= boundaryTime) || points[0]
      }
    }

    const ratio = (boundaryTime - beforePoint.timestamp) / (afterPoint.timestamp - beforePoint.timestamp)
    const interpolatedMonth = beforePoint.achievedMonth + ratio * (afterPoint.achievedMonth - beforePoint.achievedMonth)

    return {
      timestamp: boundaryTime,
      achievedMonth: interpolatedMonth,
      x: 0,
      y: 0,
    }
  }

 const calculateYAxisRange = useCallback((): [number, number] => {
    let allValues: number[] = []

    visibleCategories.forEach((category) => {
      const graphData = loadGraphDataForCategory(category)
      const categoryValues = graphData
        .filter((entry: any) => {
          const recordDate = entry.achieveDate instanceof Date ? entry.achieveDate : new Date(entry.achieveDate)
          const timestamp = recordDate.getTime()
          return (
            timestamp >= rangeStart * 24 * 60 * 60 * 1000 + birthDate.getTime() &&
            timestamp <= rangeEnd * 24 * 60 * 60 * 1000 + birthDate.getTime() &&
            entry.achievedMonth >= 0
          )
        })
        .map((entry: any) => entry.achievedMonth)

      allValues = allValues.concat(categoryValues)
    })

   if (allValues.length === 0) {
     return [0, 24] as [number, number]
   }
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    const padding = (maxValue - minValue) * 0.1

   return [Math.max(0, Math.floor(minValue - padding)), Math.ceil(maxValue + padding)] as [number, number]
  }, [visibleCategories, loadGraphDataForCategory, rangeStart, rangeEnd, birthDate])

  const yAxisRange = useMemo<[number, number]>(() => calculateYAxisRange(), [calculateYAxisRange])

  // Effect: runs on mount/update — keep deps accurate to avoid extra renders

  useEffect(() => {
    if (!svgRef.current || allCategories.length === 0) return

    console.log("[v0] GRAPH: Rendering chart", {
      visibleCategories: visibleCategories.length,
      selectedCategory,
      rangeStart,
      rangeEnd,
    })

    const svgElement = svgRef.current
    const chartWidth = chartDimensions.width
    const chartHeight = chartDimensions.height
    const margin = { top: 20, right: 50, bottom: 50, left: 50 }
    const plotWidth = chartWidth - margin.left - margin.right
    const plotHeight = chartHeight - margin.top - margin.bottom

    svgElement.innerHTML = ""

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern")
    pattern.setAttribute("id", "grid")
    pattern.setAttribute("width", "40")
    pattern.setAttribute("height", "30")
    pattern.setAttribute("patternUnits", "userSpaceOnUse")

    const gridPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
 gridPath.setAttribute("d", `M ${margin.left} ${margin.top + plotHeight} L ${margin.left} ${margin.top}`)
    gridPath.setAttribute("fill", "none")
    gridPath.setAttribute("stroke", "#f0f0f0")
    gridPath.setAttribute("stroke-width", "1")

    pattern.appendChild(gridPath)
    defs.appendChild(pattern)
    svgElement.appendChild(defs)

    const gridRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    gridRect.setAttribute("x", margin.left.toString())
    gridRect.setAttribute("y", margin.top.toString())
    gridRect.setAttribute("width", plotWidth.toString())
    gridRect.setAttribute("height", plotHeight.toString())
    gridRect.setAttribute("fill", "url(#grid)")
    svgElement.appendChild(gridRect)

    const [xMin, xMax] = xAxisDomain

    const birthDateTime = birthDate.getTime()
    if (birthDateTime >= xMin && birthDateTime <= xMax) {
      const birthX = margin.left + ((birthDateTime - xMin) / (xMax - xMin)) * plotWidth
      const birthLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      birthLine.setAttribute("x1", birthX.toString())
      birthLine.setAttribute("y1", margin.top.toString())
      birthLine.setAttribute("x2", birthX.toString())
      birthLine.setAttribute("y2", (margin.top + plotHeight).toString())
      birthLine.setAttribute("stroke", "#3b82f6")
      birthLine.setAttribute("stroke-width", "2")
      birthLine.setAttribute("opacity", "0.7")
      svgElement.appendChild(birthLine)
    }

    const currentYear = new Date().getFullYear()
    const birthYear = birthDate.getFullYear()

    for (let year = birthYear + 1; year <= currentYear; year++) {
      const birthdayDate = new Date(year, birthDate.getMonth(), birthDate.getDate())
      const birthdayTime = birthdayDate.getTime()

      if (birthdayTime >= xMin && birthdayTime <= xMax) {
        const birthdayX = margin.left + ((birthdayTime - xMin) / (xMax - xMin)) * plotWidth
        const birthdayLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
        birthdayLine.setAttribute("x1", birthdayX.toString())
        birthdayLine.setAttribute("y1", margin.top.toString())
        birthdayLine.setAttribute("x2", birthdayX.toString())
        birthdayLine.setAttribute("y2", (margin.top + plotHeight).toString())
        birthdayLine.setAttribute("stroke", "#84cc16")
        birthdayLine.setAttribute("stroke-width", "2")
        birthdayLine.setAttribute("opacity", "0.6")
        svgElement.appendChild(birthdayLine)
      }
    }

    const startDate = new Date(xMin)
    const endDate = new Date(xMax)
    const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)

    while (currentDate <= endDate) {
      const monthlyTime = currentDate.getTime()

      if (monthlyTime >= xMin && monthlyTime <= xMax) {
        const monthlyX = margin.left + ((monthlyTime - xMin) / (xMax - xMin)) * plotWidth
        const monthlyLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
        monthlyLine.setAttribute("x1", monthlyX.toString())
        monthlyLine.setAttribute("y1", margin.top.toString())
        monthlyLine.setAttribute("x2", monthlyX.toString())
        monthlyLine.setAttribute("y2", (margin.top + plotHeight).toString())
        monthlyLine.setAttribute("stroke", "#9ca3af")
        monthlyLine.setAttribute("stroke-width", "1")
        monthlyLine.setAttribute("opacity", "0.3")
        svgElement.appendChild(monthlyLine)
      }

      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line")
    yAxis.setAttribute("x1", margin.left.toString())
    yAxis.setAttribute("y1", margin.top.toString())
    yAxis.setAttribute("x2", margin.left.toString())
    yAxis.setAttribute("y2", (margin.top + plotHeight).toString())
    yAxis.setAttribute("stroke", "#666")
    yAxis.setAttribute("stroke-width", "1")
    svgElement.appendChild(yAxis)

    const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line")
    xAxis.setAttribute("x1", margin.left.toString())
    xAxis.setAttribute("y1", (margin.top + plotHeight).toString())
    xAxis.setAttribute("x2", (margin.left + plotWidth).toString())
    xAxis.setAttribute("y2", (margin.top + plotHeight).toString())
    xAxis.setAttribute("stroke", "#666")
    xAxis.setAttribute("stroke-width", "1")
    svgElement.appendChild(xAxis)

    const [yMin, yMax] = yAxisRange
    const yTickCount = 5
    for (let i = 0; i <= yTickCount; i++) {
      const value = yMin + (i / yTickCount) * (yMax - yMin)
      const y = margin.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight

      const tick = document.createElementNS("http://www.w3.org/2000/svg", "line")
      tick.setAttribute("x1", (margin.left - 5).toString())
      tick.setAttribute("y1", y.toString())
      tick.setAttribute("x2", margin.left.toString())
      tick.setAttribute("y2", y.toString())
      tick.setAttribute("stroke", "#666")
      tick.setAttribute("stroke-width", "1")
      svgElement.appendChild(tick)

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
      label.setAttribute("x", (margin.left - 10).toString())
      label.setAttribute("y", (y + 3).toString())
      label.setAttribute("text-anchor", "end")
      label.setAttribute("font-size", "12")
      label.setAttribute("fill", "#666")
      label.textContent = Math.round(value).toString()
      svgElement.appendChild(label)
    }

    const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text")
    yLabel.setAttribute("x", "15")
    yLabel.setAttribute("y", (margin.top + plotHeight / 2).toString())
    yLabel.setAttribute("text-anchor", "middle")
    yLabel.setAttribute("font-size", "12")
    yLabel.setAttribute("fill", "#666")
    yLabel.setAttribute("transform", `rotate(-90, 15, ${margin.top + plotHeight / 2})`)
    yLabel.textContent = "발달 나이 (개월)"
    svgElement.appendChild(yLabel)

    const xTickCount = 5
    for (let i = 0; i <= xTickCount; i++) {
      const tickTime = xMin + (i / xTickCount) * (xMax - xMin)
      const tickDate = new Date(tickTime)
      const x = margin.left + (i / xTickCount) * plotWidth

      const tick = document.createElementNS("http://www.w3.org/2000/svg", "line")
      tick.setAttribute("x1", x.toString())
      tick.setAttribute("y1", (margin.top + plotHeight).toString())
      tick.setAttribute("x2", x.toString())
      tick.setAttribute("y2", (margin.top + plotHeight + 5).toString())
      tick.setAttribute("stroke", "#666")
      tick.setAttribute("stroke-width", "1")
      svgElement.appendChild(tick)

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
      label.setAttribute("x", x.toString())
      label.setAttribute("y", (chartHeight - 25).toString())
      label.setAttribute("text-anchor", "middle")
      label.setAttribute("font-size", "11")
      label.setAttribute("fill", "#666")
      label.textContent = tickDate.toLocaleDateString("ko-KR", {
        year: "2-digit",
        month: "short",
      })
      svgElement.appendChild(label)
    }
    // 아래 내용 Display 하기 전에 위와의 견격을 조금 주려면?
    const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text")
    xLabel.setAttribute("x", (margin.left + plotWidth / 2).toString())
    xLabel.setAttribute("y", (chartHeight - 5).toString())
    xLabel.setAttribute("text-anchor", "middle")
    xLabel.setAttribute("font-size", "12")
    xLabel.setAttribute("fill", "#666")
    xLabel.textContent = "날짜 (생년월일부터 현재까지)"
    svgElement.appendChild(xLabel)

    visibleCategories.forEach((category) => {
      const graphData = loadGraphDataForCategory(category)
      const color = categoryColors[category] || "#666666"

      const isSelected = selectedCategory === category
      const isAnySelected = selectedCategory !== null

      let lineWidth = 2
      let circleSize = 3

      if (isAnySelected) {
        if (isSelected) {
          lineWidth = 4
          circleSize = 5
        } else {
          lineWidth = 1
          circleSize = 2
        }
      }

      DrawChart(
        svgElement,
        color,
        lineWidth,
        circleSize,
        xAxisDomain, // Use xAxisDomain instead of xAxisRange parameter for correct X coordinate calculation
        graphData,
        yAxisRange,
        category,
      )
    })
  }, [
    visibleCategories,
    selectedCategory,
    rangeStart,
    rangeEnd,
    DrawChart,
    chartDimensions,
    yAxisRange,
    birthDate,
    allCategories,
    categoryColors,
    loadGraphDataForCategory,
    xAxisDomain,
  ])

  const handleLegendClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category)
  }

  const handleRangeChange = useCallback(
    (values: number[]) => {
      const [newStart, newEnd] = values

      const minRange = 30
      let adjustedStart = newStart
      let adjustedEnd = newEnd

      if (adjustedEnd - adjustedStart < minRange) {
        if (newStart !== tempRangeStart) {
          adjustedEnd = Math.min(totalDays, adjustedStart + minRange)
        } else {
          adjustedStart = Math.max(0, adjustedEnd - minRange)
        }
      }

      setTempRangeStart(adjustedStart)
      setTempRangeEnd(adjustedEnd)

      // 100ms debounce: commit to actual range only after user stops moving
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        setRangeStart(adjustedStart)
        setRangeEnd(adjustedEnd)
        if (typeof window !== "undefined") {
          localStorage.setItem("timeAxisGraph_rangeStart", String(adjustedStart))
          localStorage.setItem("timeAxisGraph_rangeEnd",   String(adjustedEnd))
        }
        debounceTimerRef.current = null
      }, 100)
    },
    [tempRangeStart, totalDays],
  )

  // Effect: runs on mount/update — keep deps accurate to avoid extra renders

  useEffect(() => {
    const updateChartSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        // 최대 너비 제한 제거: 컨테이너 전체 너비 사용 (양쪽 패딩 32px만 제외)
        const chartWidth = containerWidth - 32
        // 높이는 최소 375px, 최대 500px, 기본은 너비의 50% (16:9 비율보다 약간 낮음)
        const chartHeight = Math.max(375, Math.min(500, chartWidth * 0.5))

        setChartDimensions({ width: chartWidth, height: chartHeight })
      }
    }

    updateChartSize()
    window.addEventListener("resize", updateChartSize)
    return () => window.removeEventListener("resize", updateChartSize)
  }, [])

  // Effect: runs on mount/update — keep deps accurate to avoid extra renders

  useEffect(() => {
    if (tooltipDebugCountRef.current < 10) {
      console.log(`[v0] TOOLTIP_STATE_CHANGE #${tooltipDebugCountRef.current + 1}:`, {
        isVisible: tooltipVisible,
        data: tooltipRef.current?.data,
      })
      tooltipDebugCountRef.current++
    }
  }, [tooltipVisible])

  // Render: UI markup starts here

  return (

  <div className="w-full">    {
    //   배경색 외부 지정 필요
  }
      <div className="flex justify-center mb-4"> {// 색상 별도 지정 필요
      }
        <h3 className="text-default font-bold">발달 그래프 - 모든 카테고리</h3>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-4 mb-2">
          <label className="text-sm font-medium">기간 선택:</label>
          <div className="flex-1 px-4">
            <Slider
              value={[tempRangeStart, tempRangeEnd]}
              onValueChange={handleRangeChange}
              max={totalDays}
              min={0}
              step={Math.max(1, Math.floor(totalDays / 200))}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 px-4">
          <span>
            시작: {new Date(birthDate.getTime() + tempRangeStart * 24 * 60 * 60 * 1000).toLocaleDateString("ko-KR")}
          </span>
          <span>
            종료: {new Date(birthDate.getTime() + tempRangeEnd * 24 * 60 * 60 * 1000).toLocaleDateString("ko-KR")}
          </span>
        </div>
        <div className="text-center text-sm text-gray-600 mt-1">
          선택된 기간: {tempRangeEnd - tempRangeStart}일 ({Math.round((tempRangeEnd - tempRangeStart) / 30.44)}개월)
        </div>
      </div>

      <div ref={containerRef} className="bg-white border rounded-lg p-4">   {// color 외부 지정 필요
        }
        {visibleCategories.length > 0 && (
          <>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {visibleCategories// List render — each item must have stable key
              //  7개중 4개 3개로 2줄에 render 필요, 가로 4칸으로 나누고, 윗 줄에 4개 아랫줄에 3개
                .map((category) => (
                <div
                  key={category}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                  onClick={() => handleLegendClick(category)}
                >
                  <div
                    className="w-4 h-0.5 rounded"
                    style={{
                      backgroundColor: categoryColors[category] || "#666666",
                      opacity: selectedCategory === null || selectedCategory === category ? 1 : 0.3,
                    }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: categoryColors[category] || "#666666",
                      opacity: selectedCategory === null || selectedCategory === category ? 1 : 0.3,
                    }}
                  >
                    {category}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <div className="relative w-full">
                <svg
                  ref={svgRef}
                  width={chartDimensions.width}
                  height={chartDimensions.height}
                  viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
                  preserveAspectRatio="none"  
                  style={{ display: "block", width: "100%", height: "auto" }}
                  className="border"    
                />
                {tooltipVisible && tooltipRef.current && (
                  <div
                    className="absolute bg-white border border-gray-300 rounded shadow-lg p-2 text-xs pointer-events-none z-10"
                    style={{
                      left: `${tooltipRef.current.x + 10}px`,
                      top: `${tooltipRef.current.y - 10}px`,
                    }}
                  >
                    <div className="font-semibold text-primary">{tooltipRef.current.data.category}</div>
                    <div>놀이 번호: {tooltipRef.current.data.playNumber}</div>
                    <div>달성 레벨: {tooltipRef.current.data.achievedLevel_Highest}</div>
                    <div>발달 나이: {tooltipRef.current.data.achievedMonth}개월</div>
                    <div>날짜: {tooltipRef.current.data.date}</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
////