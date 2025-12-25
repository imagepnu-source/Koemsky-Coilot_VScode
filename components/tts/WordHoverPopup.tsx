// components/tts/WordHoverPopup.tsx
// 단어 사전 팝업 컴포넌트

import React from "react";

type WordHoverPopupProps = {
  word: string;
  phonetic?: string;
  englishDefs?: string[];
  koreanDefs?: string[];
  x: number;
  y: number;
};

export function WordHoverPopup({
  word,
  phonetic,
  englishDefs,
  koreanDefs,
  x,
  y,
}: WordHoverPopupProps) {
  return (
    <div
      className="fixed z-40 bg-white border rounded shadow-md p-3 text-sm max-w-xs"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="font-semibold">{word}</span>
        <a
          href={`https://en.dict.naver.com/#/search?query=${encodeURIComponent(word)}`}
          target="_blank"
          rel="noreferrer"
          className="text-white bg-[#03C75A] hover:bg-[#02b351] px-3 py-1 rounded text-xs font-bold no-underline shadow-sm transition-colors"
        >
          Naver Dictionary
        </a>
      </div>
      {phonetic && (
        <div className="text-sm text-gray-500 mb-1">[{phonetic}]</div>
      )}
      {koreanDefs && koreanDefs.length > 0 && (
        <div className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">
          {koreanDefs.map((d, i) => (
            <div key={i} className="mb-0.5">{d}</div>
          ))}
        </div>
      )}
      {(!koreanDefs || koreanDefs.length === 0) &&
        englishDefs &&
        englishDefs.length > 0 && (
          <div className="text-sm text-gray-500 whitespace-pre-wrap">
            {englishDefs.slice(0, 3).map((d, i) => (
              <div key={i}>{`${i + 1}. ${d}`}</div>
            ))}
          </div>
        )}
    </div>
  );
}
