// components/tts/TranslationPopup.tsx
// 번역 결과 팝업 컴포넌트

import React from "react";
import { Button } from "@/components/ui/button";

type TranslationPopupProps = {
  text: string;
  onClose: () => void;
};

export function TranslationPopup({ text, onClose }: TranslationPopupProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white rounded shadow-lg p-4 max-w-md w-[90%] text-sm">
        <div className="font-semibold mb-2">해석</div>
        <div className="whitespace-pre-wrap mb-3 max-h-64 overflow-y-auto">
          {text}
        </div>
        <div className="text-right">
          <Button size="sm" variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
