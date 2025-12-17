// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: components/radar-graph.tsx
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
// components/radar-graph.tsx
"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts"
import { calculateBiologicalAge } from "@/lib/development-calculator"
import { getGlobalKoreanNames } from "@/lib/global-categories"
import type { ChildProfile, PlayCategory } from "@/lib/types"

interface RadarGraphProps {
  childProfile: ChildProfile
  categoryDevelopmentAges: Record<PlayCategory, number>
}

// Component: RadarGraph — entry point

export function RadarGraph({ childProfile, categoryDevelopmentAges }: RadarGraphProps) {
  // 레이아웃/측정용 refs
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerHeight, setContainerHeight] = useState<number | null>(null)
  const [uiDesignVersion, setUiDesignVersion] = useState(0)

  // 디버그: wrapRef 실제 렌더 크기 확인
  // Effect: runs on mount/update — keep deps accurate to avoid extra renders
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    console.log("[RadarGraph] container rect", {
      w: rect.width,
      h: rect.height,
      display: getComputedStyle(el).display,
      visibility: getComputedStyle(el).visibility,
    })
    if (rect.width <= 0 || rect.height <= 0) {
      console.warn("[RadarGraph] container size is non-positive. Entering debugger.")
      debugger
    }
  })

  // 컴포넌트 내부 어딘가 상단
  const ANGLE_TICK_OFFSET_PX = 16;
  const renderAngleTick = ({ payload, x, y, cx, cy, textAnchor }: any) => {
    const angle = Math.atan2(y - cy, x - cx);
    const r = Math.hypot(x - cx, y - cy);

    const label = String(payload?.value ?? "");

    // 카테고리별 미세 조정
    // - "스스로", "수용 언어": 중심 쪽으로 10px 이동 (안쪽)
    // - "대 근육": 바깥쪽으로 13px 추가 이동 (기존보다 10px 더 위로)
    let delta = 0;
    if (label === "스스로" || label === "수용 언어") {
      delta = -10;
    } else if (label === "대 근육") {
      delta = 13;
    }

    const effectiveOffset = ANGLE_TICK_OFFSET_PX + delta;
    const nx = cx + Math.cos(angle) * (r + effectiveOffset);
    const ny = cy + Math.sin(angle) * (r + effectiveOffset);

    // 축 이름에 해당하는 발달 나이 찾기
    const devAgeRaw = categoryDevelopmentAges[label as PlayCategory];
    const hasDevAge = typeof devAgeRaw === "number" && !Number.isNaN(devAgeRaw);
    const devAgeText = hasDevAge ? `(${devAgeRaw.toFixed(2)}개월)` : "";

    return (
      <text
        x={nx}
        y={ny}
        textAnchor={textAnchor}
        fontSize="var(--kp-radar-axis-label-font-size, 13px)"
        fill="#3b82f6"
      >
        <tspan x={nx} dy={0}>{label}</tspan>
        {devAgeText && (
          <tspan x={nx} dy={16}>{devAgeText}</tspan>
        )}
      </text>
    );
  };

  // 그래프와 범례가 항상 동일해지도록 상수로 묶기
  const DEV_STROKE = '#f97fe7';     // stroke (끝의 ff는 불필요)
  const DEV_STROKE_WIDTH = 2;       // strokeWidth
  const DEV_FILL = '#aeff89';       // fill
  const DEV_FILL_OPACITY = 0.3;     // fillOpacity

  // 헥사를 rgba로 (fillOpacity 반영용)
  const hexToRgba = (hex: string, alpha: number) => {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2), 16);
    const g = parseInt(h.substring(2,4), 16);
    const b = parseInt(h.substring(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const biologicalAge = calculateBiologicalAge(childProfile.birthDate)

  const data = useMemo(() => {
    const categories = getGlobalKoreanNames()
    return categories
      // List render — each item must have stable key
      .map((category) => ({
      category,
      originalCategory: category,
      developmentAge:
        Math.round((categoryDevelopmentAges[category as PlayCategory] || 0) * 100) / 100,
      biologicalAge: Math.round(biologicalAge * 100) / 100,
    }))
  }, [categoryDevelopmentAges, biologicalAge, uiDesignVersion])

  const maxValue = Math.max(biologicalAge * 1.2, 24)
  const roundedMaxValue = Math.ceil(maxValue)

  // 마운트/언마운트 로그
  // Effect: runs on mount/update — keep deps accurate to avoid extra renders
  useEffect(() => {
    console.log("[RadarGraph] MOUNT")
    return () => console.log("[RadarGraph] UNMOUNT")
  }, [])

  // 렌더마다 containerRef 스냅샷
  // Effect: runs on mount/update — keep deps accurate to avoid extra renders
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    console.log("[RadarGraph] container snapshot", {
      display: cs.display,
      visibility: cs.visibility,
      position: cs.position,
      offsetParent: el.offsetParent && (el.offsetParent as HTMLElement).tagName,
      clientW: el.clientWidth,
      clientH: el.clientHeight,
      rectW: rect.width,
      rectH: rect.height,
    })
  })

  // 세로 크기 % (가로 대비 비율) 적용: height = width * (percent/100)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const compute = () => {
      const width = el.clientWidth
      if (!width) return

      const rootStyles = getComputedStyle(document.documentElement)
      const raw = rootStyles.getPropertyValue('--kp-radar-container-height-percent').trim() || '100'
      const percent = Number(raw)
      const ratio = Number.isFinite(percent) && percent > 0 ? percent : 100
      const h = Math.max(200, Math.round((width * ratio) / 100))
      setContainerHeight(h)
    }

    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  // UIDesignDialog 에서 UI 설정이 변경될 때마다 레이더 그래프도 다시 그리기 위해 버전 카운터를 증가
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleUIDesignUpdate = () => {
      setUiDesignVersion((v) => v + 1)
    }

    window.addEventListener("ui-design-preview-updated", handleUIDesignUpdate)
    window.addEventListener("ui-design-updated", handleUIDesignUpdate)

    return () => {
      window.removeEventListener("ui-design-preview-updated", handleUIDesignUpdate)
      window.removeEventListener("ui-design-updated", handleUIDesignUpdate)
    }
  }, [])

  // Render: UI markup starts here

  return (
  <div className="w-full min-w-0" ref={wrapRef}>
    {
      // "발달 영역별 그리래프" 글자 색상 지정 가능해야 함
    }
      <h3
        className="text-base font-bold text-center mb-4"
        style={{
          fontSize: "var(--kp-radar-title-font-size, 16px)",
          marginTop: "var(--kp-graph-container-y-offset, 16px)",
        }}
      >
        발달 영역별 레이더 그래프
      </h3>

      <div className="w-full min-w-0 flex justify-center">
        <div
          className="min-w-0 w-full"
          ref={containerRef}
          style={containerHeight ? { height: `${containerHeight}px` } : undefined}
        >

          {/* 높이는 가로 대비 비율(세로 크기 %)로 계산된 containerHeight를 100%로 채우도록 설정 */}
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                <RadarChart
              data={data}
              margin={{ top: 16, right: 8, bottom: 16, left: 8 }}
              outerRadius="60%" /* 모바일에서도 넘치지 않도록 그래프 자체를 축소 */
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="category" tick={renderAngleTick} tickLine={false} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, roundedMaxValue]}
                tick={{ fontSize: "var(--kp-radar-axis-tick-font-size, 13px)", fill: "#3b82f6" }}
                tickCount={6}
                tickFormatter={(value) => Math.round(value).toString()}
              />
                <Radar
                  name="발달 나이"
                  dataKey="developmentAge"
                  stroke={DEV_STROKE}
                  fill={DEV_FILL}
                  fillOpacity={DEV_FILL_OPACITY}
                  strokeWidth={DEV_STROKE_WIDTH}
                />

                <Radar
                  name="생물학적 나이"
                  dataKey="biologicalAge"
                  stroke="#70b892ff" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  fill="transparent"
                />
              </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    {/* 범례: 중앙 정렬 + 수평 한 줄 + 간격 */}
    <div className="flex items-center justify-center gap-6 mt-4">
      {/* 발달 나이 (fill + stroke 동일) */}
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded"
          style={{
            backgroundColor: hexToRgba(DEV_FILL, DEV_FILL_OPACITY), // fill + opacity
            border: `${DEV_STROKE_WIDTH}px solid ${DEV_STROKE}`,    // stroke + width
            boxSizing: 'border-box',
          }}
        />
        <span className="text-base text-gray-600">발달 나이</span>
      </div>

      {/* 생물학적 나이 (점선 stroke) */}
      <div className="flex items-center gap-2">
        <div
          className="w-6"
          style={{
            borderTop: "3px dashed #70b892", // 필요시 상수화(BIO_STROKE/BIO_STROKE_WIDTH)
            height: 0,
          }}
        />
        <span className="text-base text-gray-600">생물학적 나이</span>
      </div>
    </div>
  </div>
  )
}
