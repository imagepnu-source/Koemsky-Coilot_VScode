// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: components/child-profile-dialog.tsx
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveChildProfile } from "@/lib/storage-core"
import type { ChildProfile } from "@/lib/types"

interface ChildProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (profile: ChildProfile) => void
  initialProfile?: ChildProfile | null
}

// Component: ChildProfileDialog — entry point

export function ChildProfileDialog({ open, onOpenChange, onSave, initialProfile }: ChildProfileDialogProps) {
  const [name, setName] = useState(initialProfile?.name || "")
  const [birthDate, setBirthDate] = useState(
    initialProfile?.birthDate ? initialProfile.birthDate.toISOString().split("T")[0] : "",
  )

  const handleSave = () => {
    if (!name.trim() || !birthDate) return

    const profile: ChildProfile = {
      name: name.trim(),
      birthDate: new Date(birthDate),
      biologicalAge: 0, // Will be calculated
    }

    saveChildProfile(profile)
    onSave(profile)
  }

  // Render: UI markup starts here

  return (

  <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>아이 정보 입력</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">아이 이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="아이 이름을 입력하세요"
            />
          </div>

          <div>
            <Label htmlFor="birthDate">생년월일</Label>
            <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>

          <Button onClick={handleSave} className="w-full" disabled={!name.trim() || !birthDate}>
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
