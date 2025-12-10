// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: components/settings-dialog.tsx
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DialogDescription } from "@radix-ui/react-dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { generateTestData } from "@/lib/storage-test-data"
import { loadChildProfile, saveChildProfile } from "@/lib/storage-core"
import { TestDataProgressDialog } from "./test-data-progress-dialog"
import { getGlobalKoreanNames } from "@/lib/global-categories"
import type { ChildProfile } from "@/lib/types"
import { loadUIDesignCfg, saveUIDesignCfg } from "@/lib/ui-design"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  childProfile: ChildProfile
  setChildProfile: (profile: ChildProfile) => void
  playData?: Record<string, any[]>
}

// Component: SettingsDialog — entry point

export function SettingsDialog({
  open,
  onOpenChange,
  childProfile,
  setChildProfile,
  playData = {},
}: SettingsDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [editName, setEditName] = useState(childProfile.name)
  const [editBirthDate, setEditBirthDate] = useState(childProfile.birthDate.toISOString().split("T")[0])
  const [testDataCount, setTestDataCount] = useState(10)
  const [tempMessage, setTempMessage] = useState("")
  const [showProgress, setShowProgress] = useState(false)
  const [currentCategory, setCurrentCategory] = useState("")
  const [totalCategories, setTotalCategories] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<"generating" | "loading">("generating")

  // Effect: runs on mount/update — keep deps accurate to avoid extra renders

  useEffect(() => {
    const savedCount = localStorage.getItem("komensky_test_data_count")
    if (savedCount) {
      const count = Number.parseInt(savedCount, 10)
      if (count > 0) {
        setTestDataCount(count)
      }
    }
  }, [])

  const handleTestDataCountChange = (value: string) => {
    const count = Number.parseInt(value, 10)
    if (count > 0) {
      setTestDataCount(count)
      localStorage.setItem("komensky_test_data_count", count.toString())
    }
  }

  const handleSaveProfile = () => {
    const updatedProfile: ChildProfile = {
      ...childProfile,
      name: editName,
      birthDate: new Date(editBirthDate),
      biologicalAge: childProfile.biologicalAge,
    }

    saveChildProfile(updatedProfile)
    setChildProfile(updatedProfile)
    alert("아이 정보가 저장되었습니다.")
  }

  const handleGenerateTestData = () => {
    setIsGenerating(true)
    setShowProgress(true)
    try {
      console.log("[v0] Starting test data generation and loading...")

      generateTestData(childProfile, playData, testDataCount, (category, total, index, phase) => {
        setCurrentCategory(category)
        setTotalCategories(total)
        setCurrentIndex(index)
        setCurrentPhase(phase)
      })

      console.log("[v0] CATEGORY_INDEPENDENCE: Triggering recalculation for all categories after test data generation")
      const categories = getGlobalKoreanNames()
      categories.forEach((category) => {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("recalculateCategory", {
              detail: { category },
            }),
          )
        }, 0)
      })

      setTempMessage("테스트 데이터가 생성되었습니다. 페이지를 새로고침하세요.")
      
      // 그래프 캐시를 강제로 무효화하기 위해 2초 후 페이지 새로고침
      setTimeout(() => {
        console.log("[v0] Reloading page to refresh graph data...")
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("[v0] Test data generation error:", error)
      alert("테스트 데이터 생성 중 오류가 발생했습니다.")
      setIsGenerating(false)
      setShowProgress(false)
    }
  }

  const handleBackupData = () => {
    try {
      const jsonData = exportChildData()
      const blob = new Blob([jsonData], { type: "application/json;charset=utf-8;" })
      const link = document.createElement("a")

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `backup_data_${childProfile.name}_${new Date().toISOString().split("T")[0]}.json`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        console.log("[v0] Backup data export completed successfully")
      } else {
        throw new Error("브라우저에서 파일 다운로드를 지원하지 않습니다.")
      }

      alert("데이터가 백업되었습니다.")
    } catch (error) {
      console.error("[v0] Backup data error:", error)
      alert("데이터 백업 중 오류가 발생했습니다.")
    }
  }

  const handleRestoreData = () => {
    try {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          try {
            const reader = new FileReader()
            reader.onload = (event) => {
              const jsonData = event.target?.result as string
              const success = importChildData(jsonData)
              if (success) {
                alert("데이터가 복원되었습니다.")
              } else {
                alert("데이터 복원에 실패했습니다.")
              }
            }
            reader.readAsText(file)
          } catch (error) {
            console.error("[v0] Error reading file:", error)
            alert("데이터 복원 중 오류가 발생했습니다.")
          }
        }
      }
      input.click()
    } catch (error) {
      console.error("[v0] Restore data error:", error)
      alert("데이터 복원 중 오류가 발생했습니다.")
    }
  }

  const handleBackupUISettings = () => {
    try {
      const uiSettings = loadUIDesignCfg()
      const jsonData = JSON.stringify(uiSettings, null, 2)
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ui-settings-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      alert("UI 설정이 백업되었습니다.")
    } catch (error) {
      console.error("[v0] UI Settings backup error:", error)
      alert("UI 설정 백업 중 오류가 발생했습니다.")
    }
  }

  const handleRestoreUISettings = () => {
    try {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            try {
              const jsonData = event.target?.result as string
              const uiSettings = JSON.parse(jsonData)
              
              // 버전 정보 확인
              const importVersion = uiSettings._version || '구 버전'
              console.log(`[Settings] Importing UI settings from v${importVersion}`)
              
              // saveUIDesignCfg가 자동으로 버전 호환성 처리
              // - 모자라는 키는 기본값에서 추가
              // - 사용하지 않는 키는 자동 제거
              saveUIDesignCfg(uiSettings)
              
              alert(`UI 설정이 복원되었습니다.\n(${importVersion} → 현재 버전)\n페이지를 새로고침합니다.`)
              window.location.reload()
            } catch (error) {
              console.error("[v0] UI Settings restore error:", error)
              alert("UI 설정 복원에 실패했습니다. 파일 형식을 확인해주세요.")
            }
          }
          reader.readAsText(file)
        }
      }
      input.click()
    } catch (error) {
      console.error("[v0] UI Settings restore error:", error)
      alert("UI 설정 복원 중 오류가 발생했습니다.")
    }
  }

  const handleClearAllRecords = () => {
    try {
      console.log("[v0] Clearing all play records...")

      const categories = getGlobalKoreanNames()
      const categoryKeys = categories.map((category) => `komensky_records_${category}`)

      categoryKeys.forEach((key) => {
        localStorage.removeItem(key)
        console.log(`[v0] Cleared ${key}`)
      })

      categories.forEach((category) => {
        const categoryKey = `komensky_category_record_${category}`
        const existingRecordStr = localStorage.getItem(categoryKey)

        if (existingRecordStr) {
          try {
            const existingRecord = JSON.parse(existingRecordStr)
            // provided_playList는 보존하고 나머지만 초기화
            const clearedRecord = {
              ...existingRecord,
              playData: [],
              graphData: [],
              categoryDevelopmentalAge: 0,
            }
            localStorage.setItem(categoryKey, JSON.stringify(clearedRecord))
            console.log(`[v0] Cleared play data for ${category} while preserving provided_playList`)
          } catch (error) {
            console.error(`[v0] Error clearing category record for ${category}:`, error)
            // 파싱 실패 시에만 전체 삭제
            localStorage.removeItem(categoryKey)
            console.log(`[v0] Cleared category record for ${category}`)
          }
        }
      })

      console.log("[v0] CATEGORY_INDEPENDENCE: Triggering recalculation for all categories after clearing records")
      categories.forEach((category) => {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("recalculateCategory", {
              detail: { category },
            }),
          )
        }, 0)
      })

      alert("모든 놀이 기록이 삭제되었습니다.")
    } catch (error) {
      console.error("[v0] Error clearing records:", error)
      alert("놀이 기록 삭제 중 오류가 발생했습니다.")
    }
  }

  // Render: UI markup starts here

  return (

  <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            maxWidth: '100vw',
            width: '100%',
            maxHeight: '630px', // 50% taller than previous 420px
            minHeight: '320px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          <DialogHeader>
            <DialogTitle>설정</DialogTitle>
            <DialogDescription>
             아이 정보, 테스트 데이터, 백업 및 복원 기능을 관리할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">아이 정보</h3>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="childName">이름</Label>
                  <Input
                    id="childName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="아이 이름"
                  />
                </div>
                <div>
                  <Label htmlFor="birthDate">생년월일</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={handleSaveProfile} className="flex-1 bg-transparent" variant="outline">
                    정보 저장
                  </Button>
                  <Button
                    onClick={() => onOpenChange(false)}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    style={{ border: 'none' }}
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium"> 이하 UI는 개발자용입니다. </h3>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="testDataCount">카테고리별 테스트 데이터 개수</Label>
                  <Input
                    id="testDataCount"
                    type="number"
                    min="1"
                    max="50"
                    value={testDataCount}
                    onChange={(e) => handleTestDataCountChange(e.target.value)}
                    placeholder="테스트 데이터 개수"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    각 카테고리에서 생성할 테스트 데이터의 개수입니다. (최대 각 카테고리의 놀이 개수까지)
                  </p>
                </div>
                <Button
                  onClick={handleClearAllRecords}
                  className="w-full bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  variant="outline"
                >
                  모든 놀이 기록 삭제
                </Button>
                <Button
                  onClick={handleGenerateTestData}
                  disabled={isGenerating}
                  className="w-full bg-transparent"
                  variant="outline"
                >
                  {isGenerating ? "생성 중..." : "Generate & Load Test Data"}
                </Button>
                {tempMessage && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
                    {tempMessage}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">데이터 관리 (개발자용) </h3>
              <div className="space-y-2">
                <Button onClick={handleBackupData} className="w-full bg-transparent" variant="outline">
                  아이 데이터 백업
                </Button>
                <Button onClick={handleRestoreData} className="w-full bg-transparent" variant="outline">
                  아이 데이터 복원
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">UI 설정 관리 (개발자용)</h3>
              <div className="space-y-2">
                <Button onClick={handleBackupUISettings} className="w-full bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" variant="outline">
                  UI 설정 백업
                </Button>
                <Button onClick={handleRestoreUISettings} className="w-full bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" variant="outline">
                  UI 설정 복원
                </Button>
              </div>
            </div>

            <Separator />

            <Button onClick={() => onOpenChange(false)} className="w-full">
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TestDataProgressDialog
        isOpen={showProgress}
        currentCategory={currentCategory}
        totalCategories={totalCategories}
        currentIndex={currentIndex}
        phase={currentPhase}
      />
    </>
  )
}

function exportChildData(): string {
  const childProfile = loadChildProfile()

  const achievements: Record<string, any[]> = {}
  const categories = getGlobalKoreanNames()
  categories.forEach((category) => {
    try {
      const categoryKey = `komensky_category_record_${category}`
      const categoryRecordStr = localStorage.getItem(categoryKey)
      if (categoryRecordStr) {
        const categoryRecord = JSON.parse(categoryRecordStr)
        if (categoryRecord.topAchievements && categoryRecord.topAchievements.length > 0) {
          achievements[category] = categoryRecord.topAchievements
        }
      }
    } catch (error) {
      console.error(`[v0] Error loading achievements for export from ${category}:`, error)
    }
  })

  const exportData = {
    childProfile,
    achievements,
    exportDate: new Date().toISOString(),
    version: "1.0",
  }

  return JSON.stringify(exportData, null, 2)
}

function importChildData(jsonData: string): boolean {
  try {
    const importData = JSON.parse(jsonData)

    if (importData.childProfile) {
      const profile = {
        ...importData.childProfile,
        birthDate: new Date(importData.childProfile.birthDate),
      }
      saveChildProfile(profile)
    }

    if (importData.achievements) {
      Object.entries(importData.achievements).forEach(([category, categoryAchievements]: [string, any]) => {
        try {
          const categoryKey = `komensky_category_record_${category}`
          const existingRecordStr = localStorage.getItem(categoryKey)

          if (existingRecordStr) {
            const existingRecord = JSON.parse(existingRecordStr)
            existingRecord.topAchievements = categoryAchievements// List render — each item must have stable key
.map((achievement: any) => ({
              ...achievement,
              achievedDate: new Date(achievement.achievedDate),
            }))
            localStorage.setItem(categoryKey, JSON.stringify(existingRecord))
          }
        } catch (error) {
          console.error(`[v0] Error importing achievements for ${category}:`, error)
        }
      })
    }

    return true
  } catch (error) {
    console.error("Failed to import data:", error)
    return false
  }
}
