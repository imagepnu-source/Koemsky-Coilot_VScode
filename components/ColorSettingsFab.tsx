'use client'
import React from 'react'
export default function ColorSettingsFab() {
  return (
    <button
      className="fixed bottom-4 right-4 z-[101] px-3 py-2 rounded-full shadow bg-white border hover:bg-gray-50 text-xs"
      onClick={() => (window as any).__openColorSettings?.()}
      aria-label="색상 설정 열기"
      title="색상 설정 열기"
    >
      🎨 색상
    </button>
  )
}
