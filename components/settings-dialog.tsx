"use client"



import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DialogDescription } from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { generateTestData } from "@/lib/storage-test-data"
import { loadChildProfile, saveChildProfileForEmail } from "@/lib/storage-core"
import { getChildCategoryStorageKey } from "@/lib/storage-category"
import { TestDataProgressDialog } from "./test-data-progress-dialog"
import { getGlobalKoreanNames } from "@/lib/global-categories"
import type { ChildProfile } from "@/lib/types"
import { loadUIDesignCfg, saveUIDesignCfg, saveGlobalUIDesignCfg } from "@/lib/ui-design"
import { supabase } from "@/lib/supabaseClient"
// import { fetchCurrentSubscription, isPaidUser } from "@/lib/subscriptions"
import { exportChildData, importChildData } from "@/lib/child-data-backup"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  childProfile: ChildProfile
  setChildProfile: (profile: ChildProfile) => void
  playData?: Record<string, any[]>
  title?: string
  mode: "guardian" | "child"
}

type ChildSlot = {
  name: string
  birthDate: string
  gender?: string
}

const ADMIN_PASSWORD = "Christ4HGe!"
const CHILD_SLOT_COUNT = 3
const FALLBACK_EMAIL_KEY = "anonymous"
const TEST_DATA_COUNT_KEY = "komensky_test_data_count"

const makeEmailKey = (email?: string | null) => (email ?? "").trim().toLowerCase() || FALLBACK_EMAIL_KEY
const createEmptySlot = (): ChildSlot => ({ name: "", birthDate: "", gender: undefined })
const createSlotFromProfile = (profile?: ChildProfile): ChildSlot => ({
  name: profile?.name ?? "",
  birthDate: profile?.birthDate ? new Date(profile.birthDate).toISOString().split("T")[0] : "",
  gender: undefined,
})
const buildDefaultSlots = (profile: ChildProfile): ChildSlot[] => {
  const slots: ChildSlot[] = [createSlotFromProfile(profile)]
  while (slots.length < CHILD_SLOT_COUNT) slots.push(createEmptySlot())
  return slots
}
const normalizeSlots = (slots: ChildSlot[]): ChildSlot[] => {
  const normalized: ChildSlot[] = slots.map((slot): ChildSlot => ({
    name: slot?.name ?? "",
    birthDate: slot?.birthDate ?? "",
    gender: slot?.gender ?? undefined,
  }))
  while (normalized.length < CHILD_SLOT_COUNT) normalized.push(createEmptySlot())
  return normalized.slice(0, CHILD_SLOT_COUNT)
}
const getSlotStorageKey = (emailKey: string) => `komensky_child_profile_slots_${emailKey}`
const getActiveSlotStorageKey = (emailKey: string) => `komensky_child_profile_active_slot_${emailKey}`

export function SettingsDialog({
  open,
  onOpenChange,
  childProfile,
  setChildProfile,
  playData = {},
  title,
  mode,
}: SettingsDialogProps) {
  const [childSlots, setChildSlots] = useState<ChildSlot[]>(() => buildDefaultSlots(childProfile))
  const [activeChildSlot, setActiveChildSlot] = useState(0)
  const [hydratedEmailKey, setHydratedEmailKey] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [testDataCount, setTestDataCount] = useState(10)
  const [tempMessage, setTempMessage] = useState("")
  const [showProgress, setShowProgress] = useState(false)
  const [currentCategory, setCurrentCategory] = useState("")
  const [totalCategories, setTotalCategories] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<"generating" | "loading">("generating")
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [guardianBirthDate, setGuardianBirthDate] = useState("")
  const [guardianGender, setGuardianGender] = useState("")
  const [guardianRelation, setGuardianRelation] = useState("")
  const [guardianMobile, setGuardianMobile] = useState("")
  const [guardianAddress, setGuardianAddress] = useState("")
  const [isSavingGuardian, setIsSavingGuardian] = useState(false)

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [forgotEmail, setForgotEmail] = useState("")
  const [passwordStepVerified, setPasswordStepVerified] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [hasUnsavedChildChanges, setHasUnsavedChildChanges] = useState(false)

  // 초기 로딩: Supabase 사용자 정보와 로컬 child 슬롯/보호자 정보를 불러온다.
  useEffect(() => {
    if (!open) return
    if (!supabase) return

    let cancelled = false

    const hydrateFromSupabaseAndStorage = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error || !data?.user) return

        const email = (data.user.email as string | null | undefined) ?? null
        if (cancelled) return

        setCurrentEmail(email)
        const emailKey = makeEmailKey(email)
        setHydratedEmailKey(emailKey)
        setUserId(data.user.id ?? null)

        // Supabase user_metadata 에서 보호자 정보 로드
        const meta: any = data.user.user_metadata || {}
        setGuardianBirthDate(meta.guardian_birth_date || "")
        setGuardianGender(meta.guardian_gender || "")
        setGuardianRelation(meta.guardian_relation || "")
        setGuardianMobile(meta.guardian_mobile || "")
        setGuardianAddress(meta.guardian_address || "")

        // 1차: Supabase children 테이블에서 아이 슬롯 정보를 불러와 화면/로컬 모두 초기화
        let initializedFromSupabase = false
        try {
          const { data: childrenRows, error: childrenError } = await supabase
            .from("children")
            .select("name, birth_date, gender, slot_index")
            .eq("user_id", data.user.id)
            .order("slot_index", { ascending: true })

          if (!cancelled && !childrenError && childrenRows && childrenRows.length > 0) {
            const normalizedSlots = normalizeSlots(
              (childrenRows as Array<{ name: string | null; birth_date: string | null; gender?: string | null }>).map(
                (row) => ({
                  name: row.name || "",
                  birthDate: row.birth_date || "",
                  gender: row.gender || undefined,
                }),
              ),
            )

            setChildSlots(normalizedSlots)
            setActiveChildSlot(0)
            setHasUnsavedChildChanges(false)
            initializedFromSupabase = true

            // Supabase 에서 가져온 값을 로컬 캐시에도 기록해, 이후에는 빠르게 복원할 수 있게 합니다.
            if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
              try {
                localStorage.setItem(getSlotStorageKey(emailKey), JSON.stringify(normalizedSlots))
                localStorage.setItem(getActiveSlotStorageKey(emailKey), "0")
              } catch (e) {
                console.warn("[SettingsDialog] Failed to persist slots loaded from Supabase", e)
              }
            }
          }
        } catch (e) {
          console.warn("[SettingsDialog] Failed to load children from Supabase", e)
        }

        // 2차: Supabase children 이 없거나 오류인 경우에만, 기존 로컬스토리지를 사용
        if (!initializedFromSupabase && typeof window !== "undefined" && typeof localStorage !== "undefined") {
          try {
            const slotsRaw = localStorage.getItem(getSlotStorageKey(emailKey))
            if (slotsRaw) {
              const parsed = JSON.parse(slotsRaw)
              const normalized = normalizeSlots(Array.isArray(parsed) ? parsed : [])
              setChildSlots(normalized)
            }

            const activeRaw = localStorage.getItem(getActiveSlotStorageKey(emailKey))
            if (activeRaw != null) {
              const idx = Number(activeRaw)
              if (!Number.isNaN(idx) && idx >= 0 && idx < CHILD_SLOT_COUNT) {
                setActiveChildSlot(idx)
              }
            }

            setHasUnsavedChildChanges(false)
          } catch (e) {
            console.warn("[SettingsDialog] Failed to hydrate child slots from storage", e)
          }
        }
      } catch (e) {
        console.warn("[SettingsDialog] Failed to hydrate from Supabase", e)
      }
    }

    hydrateFromSupabaseAndStorage()

    return () => {
      cancelled = true
    }
  }, [open])

  const resetPasswordDialogState = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setForgotEmail("")
    setPasswordStepVerified(false)
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const handleVerifyCurrentPassword = async () => {
    if (!supabase) {
      alert("Supabase 설정이 필요합니다. (환경 변수 확인)")
      return
    }
    if (!currentPassword) {
      alert("현재 비밀번호를 입력해 주세요.")
      return
    }
    setIsChangingPassword(true)
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user?.email) {
        throw new Error("로그인 정보를 확인할 수 없습니다.")
      }
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: data.user.email,
        password: currentPassword,
      })
      if (reauthError) {
        throw new Error("현재 비밀번호가 올바르지 않습니다.")
      }
      setPasswordStepVerified(true)
    } catch (error: any) {
      console.error("[SettingsDialog] verify current password error", error)
      alert(error?.message || "현재 비밀번호 확인 중 오류가 발생했습니다.")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleChangePassword = async () => {
    if (!supabase) {
      alert("Supabase 설정이 필요합니다. (환경 변수 확인)")
      return
    }
    if (!newPassword || newPassword.length < 8) {
      alert("새 비밀번호는 8자 이상이어야 합니다.")
      return
    }
    if (newPassword !== confirmPassword) {
      alert("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.")
      return
    }
    setIsChangingPassword(true)
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user?.email) {
        throw new Error("로그인 정보를 확인할 수 없습니다.")
      }
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: data.user.email,
        password: currentPassword,
      })
      if (reauthError) {
        throw new Error("현재 비밀번호가 올바르지 않습니다.")
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      alert("비밀번호가 변경되었습니다.")
      resetPasswordDialogState()
    } catch (error: any) {
      console.error("[SettingsDialog] change password error", error)
      alert(error?.message || "비밀번호 변경 중 오류가 발생했습니다.")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleSendResetEmail = async () => {
    if (!supabase) {
      alert("Supabase 설정이 필요합니다. (환경 변수 확인)")
      return
    }
    const targetEmail = forgotEmail.trim()
    if (!targetEmail) {
      alert("비밀번호 재설정 메일을 받을 이메일을 입력해 주세요.")
      return
    }
    setIsSendingReset(true)
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user?.email) {
        throw new Error("로그인 정보를 확인할 수 없습니다.")
      }
      if (targetEmail.toLowerCase() !== data.user.email.toLowerCase()) {
        alert("현재 로그인한 계정의 이메일 주소와 일치할 때만 비밀번호 재설정 메일을 보낼 수 있습니다.")
        return
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      })
      if (resetError) throw resetError
      alert("비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.")
    } catch (error) {
      console.error("[SettingsDialog] reset password error", error)
      alert("비밀번호 재설정 요청을 처리했습니다. 메일함을 확인해 주세요.")
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleGenerateTestData = () => {
    setIsGenerating(true)
    setShowProgress(true)
    try {
      generateTestData(childProfile, playData, testDataCount, (category, total, index, phase) => {
        setCurrentCategory(category)
        setTotalCategories(total)
        setCurrentIndex(index)
        setCurrentPhase(phase)
      })
      const categories = getGlobalKoreanNames()
      categories.forEach((category) => {
        window.dispatchEvent(new CustomEvent("recalculateCategory", { detail: { category } }))
      })
      setTempMessage("테스트 데이터가 생성되었습니다. 페이지를 새로고침하세요.")
      setTimeout(() => setShowProgress(false), 600)
    } catch (error) {
      console.error("[SettingsDialog] Test data generation error", error)
      alert("테스트 데이터 생성 중 오류가 발생했습니다.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBackupData = () => {
    try {
      const jsonData = exportChildData()
      const blob = new Blob([jsonData], { type: "application/json;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `backup_data_${childProfile.name}_${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      alert("데이터가 백업되었습니다.")
    } catch (error) {
      console.error("[SettingsDialog] Backup data error", error)
      alert("데이터 백업 중 오류가 발생했습니다.")
    }
  }

  const handleRestoreData = () => {
    try {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (readerEvent) => {
          const jsonData = readerEvent.target?.result as string
          const success = importChildData(jsonData)
          alert(success ? "데이터가 복원되었습니다." : "데이터 복원에 실패했습니다.")
        }
        reader.readAsText(file)
      }
      input.click()
    } catch (error) {
      console.error("[SettingsDialog] Restore data error", error)
      alert("데이터 복원 중 오류가 발생했습니다.")
    }
  }

  const handleBackupUISettings = () => {
    try {
      const uiSettings = loadUIDesignCfg()
      const blob = new Blob([JSON.stringify(uiSettings, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `ui-settings-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
      alert("UI 설정이 백업되었습니다.")
    } catch (error) {
      console.error("[SettingsDialog] UI Settings backup error", error)
      alert("UI 설정 백업 중 오류가 발생했습니다.")
    }
  }

  const handleRestoreUISettings = () => {
    try {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (readerEvent) => {
          try {
            const jsonData = readerEvent.target?.result as string
            const uiSettings = JSON.parse(jsonData)
            const importVersion = uiSettings._version || "unknown"
            saveUIDesignCfg(uiSettings)
            alert(`UI 설정이 복원되었습니다.\n(${importVersion} → 현재 버전)\n페이지를 새로고침합니다.`)
            window.location.reload()
          } catch (error) {
            console.error("[SettingsDialog] UI Settings restore error", error)
            alert("UI 설정 복원에 실패했습니다. 파일 형식을 확인해주세요.")
          }
        }
        reader.readAsText(file)
      }
      input.click()
    } catch (error) {
      console.error("[SettingsDialog] UI Settings restore error", error)
      alert("UI 설정 복원 중 오류가 발생했습니다.")
    }
  }

  const handleApplyCurrentUIToAllUsers = async () => {
    try {
      const confirmed = window.confirm(
        "현재 이 브라우저에 적용된 UI 설정을\n모든 사용자에게 공통으로 적용합니다.\n\n계속하시겠습니까?",
      )
      if (!confirmed) return
      const current = loadUIDesignCfg()
      await saveGlobalUIDesignCfg(current)
      alert("현재 UI 설정이 전역으로 저장되었습니다. 다른 사용자는 새로고침 시 동일 UI가 적용됩니다.")
    } catch (error: any) {
      console.error("[SettingsDialog] Apply global UI settings error", error)
      alert(error?.message || "전역 UI 설정 저장 중 오류가 발생했습니다.")
    }
  }

  const handleClearAllRecords = () => {
    try {
      const categories = getGlobalKoreanNames()
      categories.forEach((category) => {
        localStorage.removeItem(`komensky_records_${category}`)
        const key = getChildCategoryStorageKey(category as any)
        const record = localStorage.getItem(key)
        if (!record) return
        try {
          const parsed = JSON.parse(record)
          const cleared = { ...parsed, playData: [], graphData: [], categoryDevelopmentalAge: 0 }
          localStorage.setItem(key, JSON.stringify(cleared))
        } catch {
          localStorage.removeItem(key)
        }
      })
      categories.forEach((category) => {
        window.dispatchEvent(new CustomEvent("recalculateCategory", { detail: { category } }))
      })
      alert("모든 놀이 기록이 삭제되었습니다.")
    } catch (error) {
      console.error("[SettingsDialog] Error clearing records", error)
      alert("놀이 기록 삭제 중 오류가 발생했습니다.")
    }
  }

  const persistChildSlotsForCurrentEmail = (slots: ChildSlot[], activeIndex: number) => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return
    const emailKey = makeEmailKey(currentEmail)
    try {
      localStorage.setItem(getSlotStorageKey(emailKey), JSON.stringify(normalizeSlots(slots)))
      localStorage.setItem(getActiveSlotStorageKey(emailKey), String(activeIndex))
    } catch (e) {
      console.warn("[SettingsDialog] Failed to persist child slots", e)
    }
  }

  const handleSaveProfile = async () => {
    if (!currentEmail || !supabase || !userId) {
      alert("로그인 정보가 필요합니다. 먼저 로그인해 주세요.")
      return
    }

    // 1) 비어있지 않은 슬롯만 앞으로 모으기
    const nonEmpty = childSlots.filter((slot) => slot.name?.trim() && slot.birthDate)
    if (nonEmpty.length === 0) {
      // 화면에서 모든 아이 정보를 지운 상태로 "정보 저장"을 누른 경우:
      // - Supabase children 테이블에서 이 계정의 아이 정보를 모두 삭제
      // - 로컬 슬롯/활성 슬롯도 비어진 상태로 캐시
      try {
        setIsSavingProfile(true)

        // children 테이블에서 현재 계정의 모든 아이 행 삭제
        const { error: delError } = await supabase.from("children").delete().eq("user_id", userId)
        if (delError) {
          console.warn("[SettingsDialog] Failed to delete children rows when clearing profile", delError)
          alert("아이 정보를 서버에서 삭제하는 중 오류가 발생했습니다.")
          return
        }

        // 현재 화면의 슬롯 상태(대부분 빈 슬롯)를 그대로 로컬 캐시에 저장
        persistChildSlotsForCurrentEmail(childSlots, 0)
        setActiveChildSlot(0)
        setHasUnsavedChildChanges(false)

        // 이 계정에 등록된 아이가 더 이상 없으므로,
        // 현재 childProfile 도 기본값으로 초기화합니다.
        const now = new Date()
        const clearedProfile = saveChildProfileForEmail(currentEmail, {
          name: "",
          birthDate: now,
          biologicalAge: 0,
        } as ChildProfile)
        setChildProfile(clearedProfile)

        // 모든 카테고리 발달 나이를 0 기준으로 다시 계산하도록 신호를 보냅니다.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("recalculateCategory", { detail: { category: "*" } }))
        }

        // Intro 3/5 요약이 바로 갱신되도록 전역 이벤트 전파
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("komensky:childrenChanged"))
        }

        alert("아이 정보가 모두 삭제되었습니다.")
      } finally {
        setIsSavingProfile(false)
      }

      return
    }

    const compacted: ChildSlot[] = [...nonEmpty]
    while (compacted.length < CHILD_SLOT_COUNT) compacted.push(createEmptySlot())

    // 2) 현재 선택된 아이를 가능한 한 유지
    const activeBefore = childSlots[activeChildSlot]
    let newActiveIndex = 0
    if (activeBefore?.name?.trim() && activeBefore?.birthDate) {
      const foundIndex = compacted.findIndex(
        (s) => s.name === activeBefore.name && s.birthDate === activeBefore.birthDate,
      )
      if (foundIndex >= 0) {
        newActiveIndex = foundIndex
      }
    }

    setIsSavingProfile(true)
    try {
      setChildSlots(compacted)
      setActiveChildSlot(newActiveIndex)

      // 3) 선택된 아이를 계정별 프로필로 저장 (로컬 캐시)
      const activeSlot = compacted[newActiveIndex]
      const profile = saveChildProfileForEmail(currentEmail, {
        name: (activeSlot.name || "").trim(),
        birthDate: new Date(activeSlot.birthDate),
        biologicalAge: childProfile?.biologicalAge ?? 0,
      } as ChildProfile)

      setChildProfile(profile)
      persistChildSlotsForCurrentEmail(compacted, newActiveIndex)

      // 4) Supabase children 테이블에 동기화 (계정 기준 전체 덮어쓰기)
      const rows = nonEmpty.map((slot, index) => ({
        user_id: userId,
        name: slot.name.trim(),
        birth_date: slot.birthDate,
        gender: slot.gender || null,
        slot_index: index,
      }))

      // 기존 children 레코드 삭제 후, 현재 슬롯 기준으로 다시 삽입
      const { error: delError } = await supabase.from("children").delete().eq("user_id", userId)
      if (delError) {
        console.warn("[SettingsDialog] Failed to clear existing children rows", delError)
      }
      if (rows.length > 0) {
        const { error: insError } = await supabase.from("children").insert(rows as any)
        if (insError) {
          console.error("[SettingsDialog] Failed to upsert children", insError)
          alert("아이 정보를 서버에 저장하는 중 오류가 발생했습니다.")
          return
        }
      }

      setHasUnsavedChildChanges(false)

      // Intro 3/5 요약이 바로 갱신되도록 전역 이벤트 전파
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("komensky:childrenChanged"))
      }
      // 카테고리 발달 나이도 현재 아이 기준으로 다시 계산하도록 신호
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("recalculateCategory", { detail: { category: "*" } }))
      }
      alert("아이 정보가 저장되었습니다.")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && mode === "child" && hasUnsavedChildChanges) {
      const ok = window.confirm("아이 정보가 아직 저장되지 않았습니다.\n저장하지 않고 닫으시겠습니까?")
      if (!ok) return
    }
    onOpenChange(nextOpen)
    if (!nextOpen && mode === "child") {
      setHasUnsavedChildChanges(false)
    }
  }

  const handleGuardianSave = async () => {
    if (!supabase || !userId) {
      alert("로그인 정보가 필요합니다.")
      return
    }
    setIsSavingGuardian(true)
    try {
      const payload = {
        user_id: userId,
        birth_date: guardianBirthDate || null,
        gender: guardianGender || null,
        relation: guardianRelation || null,
      }
      const { error } = await supabase.from("user_profiles").upsert(payload as any, {
        onConflict: "user_id",
      } as any)
      if (error) {
        throw error
      }
      await supabase.auth.updateUser({
        data: {
          guardian_birth_date: guardianBirthDate || null,
          guardian_gender: guardianGender || null,
          guardian_relation: guardianRelation || null,
          guardian_mobile: guardianMobile || null,
          guardian_address: guardianAddress || null,
        },
      } as any)
      alert("보호자 정보가 저장되었습니다.")
    } catch (error) {
      console.error("[SettingsDialog] Failed to save guardian profile", error)
      alert("보호자 정보 저장 중 오류가 발생했습니다.")
    } finally {
      setIsSavingGuardian(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md"
          style={{
            width: "80vw",
            maxWidth: "80vw",
            height: "60vh",
            maxHeight: "60vh",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            overscrollBehavior: "contain",
          }}
        >
          <DialogHeader>
            <DialogTitle>{title || '설정'}</DialogTitle>
            {mode === "child" && (
              <p className="mt-1 text-xs text-gray-500">
                사용자 id: <span className="font-mono">{currentEmail ?? "(로그인 정보 없음)"}</span>
              </p>
            )}
          </DialogHeader>

          <button
            type="button"
            className="absolute right-4 top-4 rounded px-3 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => handleDialogOpenChange(false)}
          >
            닫기
          </button>

          <div className="space-y-4">
            {/* 상단 컨테이너: 보호자 정보 + 비밀번호 (보호자 모드에서만 표시) */}
            {mode === "guardian" && (
              <div className="space-y-4 rounded-md border-[3px] border-gray-200 p-3">
                {/* 보호자 정보 섹션 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold">보호자 정보</h3>
                  <p className="text-sm text-gray-700">
                    현재 로그인 ID: <span className="font-mono font-semibold text-base">{currentEmail ?? "(로그인 정보 없음)"}</span>
                  </p>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="guardianBirth" className="whitespace-nowrap mr-1">
                          생년월일
                        </Label>
                        <Input
                          id="guardianBirth"
                          type="date"
                          className="flex-1"
                          value={guardianBirthDate}
                          onChange={(e) => setGuardianBirthDate(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="guardianMobile" className="whitespace-nowrap mr-1">
                          모바일 번호
                        </Label>
                        <Input
                          id="guardianMobile"
                          type="tel"
                          className="flex-1"
                          maxLength={20}
                          value={guardianMobile}
                          onChange={(e) => setGuardianMobile(e.target.value)}
                          placeholder="숫자와 - 기호 포함 입력"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="guardianAddress">주소</Label>
                        <textarea
                          id="guardianAddress"
                          className="w-full border rounded px-2 py-1 text-sm resize-none"
                          rows={3}
                          maxLength={100}
                          value={guardianAddress}
                          onChange={(e) => setGuardianAddress(e.target.value)}
                          placeholder="주소를 입력해 주세요 (최대 100자)"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label htmlFor="guardianGender">성별</Label>
                          <select
                            id="guardianGender"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={guardianGender}
                            onChange={(e) => setGuardianGender(e.target.value)}
                          >
                            <option value="">선택 안 함</option>
                            <option value="male">남</option>
                            <option value="female">여</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="guardianRelation">아이와의 관계</Label>
                          <select
                            id="guardianRelation"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={guardianRelation}
                            onChange={(e) => setGuardianRelation(e.target.value)}
                          >
                            <option value="">선택 안 함</option>
                            <option value="father">부</option>
                            <option value="mother">모</option>
                            <option value="grandparent">조부모</option>
                            <option value="teacher">선생님</option>
                            <option value="family">가족</option>
                            <option value="neighbor">이웃</option>
                            <option value="other">기타</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                          disabled={isSavingGuardian}
                          onClick={handleGuardianSave}
                        >
                          {isSavingGuardian ? "저장 중..." : "보호자 정보 저장"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 계정 비밀번호 설정 섹션 */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium m-0">계정 비밀번호</h3>
                  <Button
                    onClick={() => {
                      resetPasswordDialogState()
                      setPasswordDialogOpen(true)
                    }}
                    className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    variant="outline"
                  >
                    비밀번호 변경
                  </Button>
                </div>
              </div>
            )}

            {/* 하단 컨테이너: 아이 정보 (아이 모드에서만 표시) */}
            {mode === "child" && (
              <div className="space-y-4 rounded-md border-[3px] border-gray-200 p-3">
                <div className="space-y-3">
                  {[0, 1, 2].map((idx) => {
                    const slot = childSlots[idx]
                    const isActive = activeChildSlot === idx
                    return (
                      <div key={idx} className="space-y-1 border rounded-md p-2 bg-white/60">
                        {/* 이름 / 성별 / 생년월일 한 줄 */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="flex-1 min-w-[80px]">
                            <Label htmlFor={`childName_${idx}`}>이름</Label>
                            <Input
                              id={`childName_${idx}`}
                              value={slot?.name ?? ""}
                              onChange={(e) => {
                                const value = e.target.value
                                setChildSlots((prev) => {
                                  const next = [...prev]
                                  next[idx] = {
                                    ...next[idx],
                                    name: value,
                                  }
                                  return next
                                })
                                setHasUnsavedChildChanges(true)
                              }}
                              placeholder="아이 이름"
                            />
                          </div>

                          <div className="w-[80px]">
                            <Label htmlFor={`childGender_${idx}`}>성별</Label>
                            <select
                              id={`childGender_${idx}`}
                              className="w-full border rounded px-2 py-1 text-xs"
                              value={slot?.gender ?? ""}
                              onChange={(e) => {
                                const value = e.target.value
                                setChildSlots((prev) => {
                                  const next = [...prev]
                                  next[idx] = {
                                    ...next[idx],
                                    gender: value || undefined,
                                  }
                                  return next
                                })
                                setHasUnsavedChildChanges(true)
                              }}
                            >
                              <option value="">선택</option>
                              <option value="male">남</option>
                              <option value="female">여</option>
                            </select>
                          </div>

                          <div className="flex-1 min-w-[110px]">
                            <Label htmlFor={`birthDate_${idx}`}>생년월일</Label>
                            <Input
                              id={`birthDate_${idx}`}
                              type="date"
                              value={slot?.birthDate ?? ""}
                              onChange={(e) => {
                                const value = e.target.value
                                setChildSlots((prev) => {
                                  const next = [...prev]
                                  next[idx] = {
                                    ...next[idx],
                                    birthDate: value,
                                  }
                                  return next
                                })
                                setHasUnsavedChildChanges(true)
                              }}
                            />
                          </div>
                        </div>

                        {/* 지우기 / 선택 같은 줄 */}
                        <div className="flex justify-end gap-2 mt-1 text-xs">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 h-7 px-3"
                            onClick={async () => {
                              const target = childSlots[idx]
                              if (!target?.name?.trim() || !target?.birthDate) {
                                alert("지울 정보가 없습니다. 먼저 아이 정보를 저장해 주세요.")
                                return
                              }
                              const confirmed = window.confirm(
                                [
                                  "이 아이와 관련된 모든 데이터가 삭제됩니다.",
                                  "",
                                  "- 브라우저에 저장된 이 아이의 놀이 기록(PlayData)",
                                  "- 이 아이의 발달 나이 계산 결과 및 그래프 데이터",
                                  "- Supabase에 저장된 이 아이의 카테고리별 기록(category_records)",
                                  "- Supabase에 저장된 이 아이의 놀이 진행 상태(play_states)",
                                  "",
                                  "※ 아이 슬롯이 비워진 뒤, 아래 '정보 저장' 버튼을 눌러야",
                                  "   Supabase children 테이블의 아이 기본 정보까지 완전히 삭제됩니다.",
                                  "",
                                  "정말로 이 아이의 데이터를 모두 삭제하시겠습니까?",
                                ].join("\n"),
                              )
                              if (!confirmed) return

                              try {
                                console.log("[SettingsDialog] Clearing all records for child slot", idx)
                                const categories = getGlobalKoreanNames()

                                categories.forEach((category) => {
                                  const categoryKey = getChildCategoryStorageKey(category as any)
                                  localStorage.removeItem(categoryKey)
                                })

                                if (supabase) {
                                  try {
                                    const safeName = (target.name || "").trim() || "아기"
                                    const birth = new Date(target.birthDate)
                                    const datePart = birth.toISOString().split("T")[0]
                                    const childId = `${safeName}_${datePart}`

                                    const { data: sessionData } = await supabase.auth.getSession()
                                    const accountId = sessionData?.session?.user?.id

                                    const { error: crError } = await supabase
                                      .from("category_records")
                                      .delete()
                                      .eq("child_id", childId)

                                    if (crError) {
                                      console.warn(
                                        "[SettingsDialog] Failed to delete category_records for child",
                                        crError,
                                      )
                                    }

                                    const { error: psError } = await supabase
                                      .from("play_states")
                                      .delete()
                                      .eq("child_id", childId)
                                      .eq("account_id", accountId || "")

                                    if (psError) {
                                      console.warn(
                                        "[SettingsDialog] Failed to delete play_states for child",
                                        psError,
                                      )
                                    }
                                  } catch (e) {
                                    console.warn(
                                      "[SettingsDialog] Unexpected Supabase error while clearing child records",
                                      e,
                                    )
                                  }
                                }

                                window.dispatchEvent(
                                  new CustomEvent("recalculateCategory", { detail: { category: "*" } }),
                                )

                                // 슬롯 자체도 비우기
                                setChildSlots((prev) => {
                                  const next = [...prev]
                                  next[idx] = createEmptySlot()
                                  return next
                                })

                                setHasUnsavedChildChanges(true)

                                alert("현재 아이의 놀이 기록이 모두 삭제되었습니다. (로컬 + Supabase)")
                              } catch (error) {
                                console.error("[SettingsDialog] Error clearing child records:", error)
                                alert("아이 놀이 기록 삭제 중 오류가 발생했습니다.")
                              }
                            }}
                          >
                            지우기
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            className="h-7 px-3"
                            onClick={() => setActiveChildSlot(idx)}
                          >
                            {isActive ? "선택됨" : "선택"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {/* 전체 아이 정보 저장 버튼 */}
                  <div className="pt-1">
                    <Button
                      onClick={handleSaveProfile}
                      className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                      variant="outline"
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? "저장 중..." : "정보 저장"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 구독 상태 섹션 제거됨 */}

            <div className="space-y-2">
              {/* (중복 관리자 전용 섹션 제거) */}
              {isSavingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="rounded-xl bg-white px-6 py-4 text-sm font-medium shadow-xl">
                    아이 정보 Upload 중...
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* 비밀번호 변경 팝업 */}
      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open)
          if (!open) {
            resetPasswordDialogState()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>
              현재 비밀번호를 먼저 확인한 뒤, 새 비밀번호를 설정합니다.
            </DialogDescription>
          </DialogHeader>

          {!passwordStepVerified ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPasswordPopup">현재 비밀번호</Label>
                <div className="relative mt-1">
                  <Input
                    id="currentPasswordPopup"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    aria-label={showCurrentPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showCurrentPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M10.58 10.58A3 3 0 0113.42 13.4M9.88 4.12A9.77 9.77 0 0112 4c5 0 9 4 10 7-0.273.82-.73 1.68-1.34 2.5M6.18 6.18C4.24 7.39 2.9 9.17 2 11c.55 1.11 1.31 2.18 2.24 3.12A11.63 11.63 0 008.5 16.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-600 border-t pt-3">
                <span className="font-medium">현재 비밀번호를 모를 경우</span>
                <div>
                  <Label htmlFor="forgotEmailPopup">이메일 주소</Label>
                  <Input
                    id="forgotEmailPopup"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@example.com"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs mt-1"
                    onClick={handleSendResetEmail}
                    disabled={isSendingReset}
                  >
                    {isSendingReset ? "보내는 중..." : "비밀번호 재설정 메일 보내기"}
                  </Button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  이메일이 올바르지 않은 경우에는 재설정 메일이 전송되지 않습니다.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordDialogOpen(false)
                  }}
                >
                  닫기
                </Button>
                <Button type="button" onClick={handleVerifyCurrentPassword} disabled={isChangingPassword}>
                  {isChangingPassword ? "확인 중..." : "다음"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPasswordPopup">새 비밀번호</Label>
                <div className="relative mt-1">
                  <Input
                    id="newPasswordPopup"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8자 이상 새 비밀번호"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showNewPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M10.58 10.58A3 3 0 0113.42 13.4M9.88 4.12A9.77 9.77 0 0112 4c5 0 9 4 10 7-0.273.82-.73 1.68-1.34 2.5M6.18 6.18C4.24 7.39 2.9 9.17 2 11c.55 1.11 1.31 2.18 2.24 3.12A11.63 11.63 0 008.5 16.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPasswordPopup">새 비밀번호 확인</Label>
                <div className="relative mt-1">
                  <Input
                    id="confirmPasswordPopup"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호 다시 입력"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showConfirmPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M10.58 10.58A3 3 0 0113.42 13.4M9.88 4.12A9.77 9.77 0 0112 4c5 0 9 4 10 7-0.273.82-.73 1.68-1.34 2.5M6.18 6.18C4.24 7.39 2.9 9.17 2 11c.55 1.11 1.31 2.18 2.24 3.12A11.63 11.63 0 008.5 16.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                새 비밀번호는 최소 8자 이상이어야 하며, 영어/숫자 조합을 권장합니다.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordStepVerified(false)
                    setNewPassword("")
                    setConfirmPassword("")
                  }}
                >
                  이전
                </Button>
                <Button type="button" onClick={handleChangePassword} disabled={isChangingPassword}>
                  {isChangingPassword ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </div>
            </div>
          )}
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
