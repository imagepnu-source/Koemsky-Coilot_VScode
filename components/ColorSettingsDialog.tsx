'use client';

import React, { useId } from 'react';
import { useColorSettings } from '@/components/context/ColorSettingsContext';

type ColorKey =
  | 'title'
  | 'dropdownBg'
  | 'appBg'
  | 'playListCardBg'
  | 'userProfileFg'
  | 'playCardFg'
  | 'ageBadgeBg'
  | 'ageBadgeFg'
  | 'accent'
  | 'cardBorder'
  | 'detailBodyText'
  | 'mutedText'
  | 'contentBg';

const Field = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 py-1">
      <span className="w-44 text-sm">{label}</span>
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 p-0 border rounded"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-8 px-2 text-sm border rounded"
      />
    </label>
  );
};

export default function ColorSettingsDialog() {
  // NOTE: importFromFile(파일) 호출을 없애고, 컴포넌트 내부에서 파일을 읽어 setColors로 반영합니다.
  const { colors, setColors, reset, exportToFile, open, setOpen } = useColorSettings();

  const u = (k: ColorKey) => (v: string) => setColors({ ...colors, [k]: v });

  if (!open) return null;

  // 파일 → JSON → colors 로드 (로컬 핸들러)
  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 최소한의 키 검증(알려진 컬러 키만 반영)
      const next: Partial<Record<ColorKey, string>> = {};
      ([
        'title',
        'dropdownBg',
        'appBg',
        'playListCardBg',
        'userProfileFg',
        'playCardFg',
        'ageBadgeBg',
        'ageBadgeFg',
        'accent',
        'cardBorder',
        'detailBodyText',
        'mutedText',
        'contentBg',
      ] as ColorKey[]).forEach((k) => {
        if (typeof data?.[k] === 'string') next[k] = data[k];
      });

      setColors({ ...colors, ...(next as Record<ColorKey, string>) });
    } catch (e) {
      console.error('[ColorSettingsDialog] JSON import failed:', e);
      alert('JSON 파일을 읽는 중 오류가 발생했습니다.');
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div
        className="w-[780px] max-w-[95vw] rounded-xl bg-white shadow-2xl p-4"
        style={{ color: 'var(--ui-card-fg)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ui-title)' }}>
            UI 색상 설정
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            닫기
          </button>
        </div>

        {/* ====== 좌/우 2열 ====== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 왼쪽 열 */}
          <Field label="Title 글자색" value={colors.title} onChange={u('title')} />
          <Field label="Drop-down 배경" value={colors.dropdownBg} onChange={u('dropdownBg')} />
          <Field label="App 메인 배경" value={colors.appBg} onChange={u('appBg')} />
          <Field
            label="놀이 요약카드 배경"
            value={colors.playListCardBg}
            onChange={u('playListCardBg')}
          />
          <Field label="적정 연령 배경" value={colors.ageBadgeBg} onChange={u('ageBadgeBg')} />
          <Field label="강조색(버튼/포커스)" value={colors.accent} onChange={u('accent')} />
          <Field label="발달 나이 색" value={colors.mutedText} onChange={u('mutedText')} />

          {/* 오른쪽 열 */}
          <Field
            label="User Profile 글자"
            value={colors.userProfileFg}
            onChange={u('userProfileFg')}
          />
          <Field label="Play 카드 글자" value={colors.playCardFg} onChange={u('playCardFg')} />
          <Field label="적정 연령 글자" value={colors.ageBadgeFg} onChange={u('ageBadgeFg')} />
          <Field label="카드 테두리" value={colors.cardBorder} onChange={u('cardBorder')} />
          <Field
            label="상세 내용 글자"
            value={colors.detailBodyText}
            onChange={u('detailBodyText')}
          />
          <Field label="Main Content 배경" value={colors.contentBg} onChange={u('contentBg')} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={reset} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
              기본값
            </button>
            <button
              onClick={exportToFile}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              내보내기(JSON)
            </button>

            {/* 불러오기(JSON) - 내부에서 파일 읽기 처리 */}
            <label className="px-3 py-1 text-sm border rounded hover:bg-gray-50 cursor-pointer">
              불러오기(JSON)
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  await handleImportFile(f);
                }}
              />
            </label>
          </div>
          <span className="text-xs text-gray-500">
            저장: localStorage / (선택) public/colorsOfUI.json
          </span>
        </div>
      </div>
    </div>
  );
}
