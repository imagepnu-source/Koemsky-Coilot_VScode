// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: components/test-data-progress-dialog.tsx
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface TestDataProgressDialogProps {
  isOpen: boolean
  currentCategory: string
  totalCategories: number
  currentIndex: number
  phase?: "generating" | "loading"
}

// Component: TestDataProgressDialog — entry point

export function TestDataProgressDialog({
  isOpen,
  currentCategory,
  totalCategories,
  currentIndex,
  phase = "generating",
}: TestDataProgressDialogProps) {
  const progress = totalCategories > 0 ? (currentIndex / totalCategories) * 100 : 0

  const phaseMessage =
    phase === "generating"
      ? "각 카테고리별로 10개의 테스트 데이터를 생성하고 있습니다..."
      : "생성된 테스트 데이터를 PlayData와 GraphData에 로드하고 있습니다..."

  const phaseTitle = phase === "generating" ? "테스트 데이터 생성 중..." : "테스트 데이터 로드 중..."

  // Render: UI markup starts here

  return (

  <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{phaseTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium">{currentCategory}</p>
            <p className="text-sm text-muted-foreground">
              {currentIndex + 1} / {totalCategories} 카테고리
            </p>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="text-center text-sm text-muted-foreground">{phaseMessage}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
