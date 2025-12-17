// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: components/graph-tabs.tsx
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
"use client"

import { useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadarGraph } from "@/components/radar-graph"
import { TimeAxisGraph } from "@/components/time-axis-graph"
import type { ChildProfile, PlayCategory } from "@/lib/types"
import { usePersistentState } from "@/hooks/usePersistentState"

interface GraphTabsProps {
  childProfile: ChildProfile
  categoryDevelopmentAges: Record<PlayCategory, number>
  // ⬇ 추가: page.tsx에서 넘겨주는 playData를 받도록 (선택적)
  playData?: Record<string, any[]>;
}

// Component: GraphTabs — entry point

export function GraphTabs({ childProfile, categoryDevelopmentAges, playData }: GraphTabsProps) {
  const [selectedGraphTab, setSelectedGraphTab] = usePersistentState<string>(
    "komensky_last_graph_tab",
    "radar",
  )

  // [증거 수집] 탭 전환 타이밍 기록
  // Effect: runs on mount/update — keep deps accurate to avoid extra renders
  useEffect(() => {
    console.log("[GraphTabs] selectedGraphTab =", selectedGraphTab)
  }, [selectedGraphTab])

  // Render: UI markup starts here

  return (
    /* 
      그래프 영역 전체 래퍼
      - w-full: 가로폭 100%
    */
    <div className="w-full">
      {/*
        Tabs 루트 (Radix 기반 shadcn/ui 탭 컴포넌트 가정)
        - value / onValueChange: 완전 제어형(Controlled) 탭
          selectedGraphTab 값에 따라 활성 탭을 결정하고,
          setSelectedGraphTab으로 상태를 변경함.
        - className="w-full": 가로폭 100%
      */}
      <Tabs value={selectedGraphTab} onValueChange={setSelectedGraphTab} className="w-full">

        {/*
          탭 버튼 묶음 (리스트)
          - grid grid-cols-2: 2개 탭을 동일한 너비의 격자로 배치
          - h-12: 탭 버튼 세로 높이(일관된 높이 보장)
          - mb-2: 탭 버튼 아래쪽 외부 여백(콘텐츠와 간격)
          * 필요 시 반응형으로 grid-cols-1 → grid-cols-2 전환 가능
          Q: Tab 2개를 묶는 사각형(Round) 의 색깔은 어디서 정해지나요? 이것은 조정 가능해애 함.
        */}
        <TabsList className="grid w-full grid-cols-2 h-13 mb-1">
          {/*
            각 탭 버튼(트리거)
            - value="radar": 이 값을 기준으로 활성화 여부 판단 (Tabs.value와 매칭)
            - font-bold: 굵은 글씨
            - style fontSize: 12px로 고정 (Tailwind로 하려면 text-[12px] 사용 가능)
            - 접근성: Radix가 role="tab", aria-selected 등을 자동 부여
          */}
          <TabsTrigger
            value="radar"
            className="font-bold"
            style={{ fontSize: "var(--kp-graph-tab-font-size, 14px)" }}
          >
            레이더 그래프
          </TabsTrigger>

          {/* 두 번째 탭 버튼(시간축) */}
          <TabsTrigger
            value="timeline"
            className="font-bold"
            style={{ fontSize: "var(--kp-graph-tab-font-size, 14px)" }}
          >
            시간축 그래프
          </TabsTrigger>
        </TabsList>

        {/*
          레이더 탭 콘텐츠
          - value="radar": 활성 탭 값이 "radar"일 때만 시각적으로 표시
          - className="mt-0": 상단 여백 없음 (TabsList와의 간격은 위 mb-2로 관리)
        */}
        <TabsContent value="radar" className="mt-0">
          {/*
            시각적 카드 컨테이너
            - border/rounded-lg: 카드 테두리/모서리
            - p-4: 내부 여백 (그래프 캔버스와 테두리 사이 간격)
            - bg-white: 배경색 (테마 변수로 바꾸려면 bg-[var(--ui-card-bg)] 등으로 조정 가능) --> Color 독립적으로 제어를 원함.
            * 3D 효과/그림자 필요 시: shadow-sm/hover:shadow-md 또는 전용 클래스(.content-card) 사용
          */}
          <div className="content-card px-0 py-4">
            {/*
              조건부 마운트 (성능 최적화)
              - 시각적으로만 숨기는 것이 아니라, 실제로 컴포넌트를 마운트/언마운트함.
              - 장점: 비활성 탭의 무거운 그래프 연산/이벤트 리스너가 해제되어 성능에 유리
              - 단점: 탭을 전환할 때마다 재마운트되므로 초기 렌더 비용이 듬
              필요 시: 항상 마운트하고 CSS로만 숨기려면 조건을 제거하고 TabsContent만 사용
            */}
            {selectedGraphTab === "radar" ? (
              <RadarGraph
                childProfile={childProfile}                 // 그래프에 필요한 아동 프로필
                categoryDevelopmentAges={categoryDevelopmentAges} // 카테고리별 발달 나이 데이터
              />
            ) : null}
          </div>
        </TabsContent>

        {/*
          시간축 탭 콘텐츠
          - value="timeline": 활성 탭 값이 "timeline"일 때 표시
          - bg-white: 배경색 (테마 변수로 바꾸려면 bg-[var(--ui-card-bg)] 등으로 조정 가능) --> Color 독립적으로 제어를 원함.
        */}
        <TabsContent value="timeline" className="mt-0">
          <div className="border rounded-lg p-2 bg-white">
            {/*
              조건부 마운트(위와 동일한 의도)
              - TimeAxisGraph는 슬라이더/도메인/리사이즈 리스너 등 상태가 복잡할 수 있어,
                비활성 시 언마운트하면 리소스 절약 가능
            */}
            {selectedGraphTab === "timeline" ? (
              <TimeAxisGraph
                childProfile={childProfile} // 생년/기준일 등 내부 X축 도메인 계산에 사용
              />
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>

  )
}
