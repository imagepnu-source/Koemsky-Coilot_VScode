// components/tts/TTSControls.tsx
// TTS 설정 컨트롤 (볼륨, 속도, 보이스 선택)

import React from "react";

type TTSControlsProps = {
  volume: number;
  onVolumeChange: (volume: number) => void;
  englishRate: number;
  onEnglishRateChange: (rate: number) => void;
  koreanRate: number;
  onKoreanRateChange: (rate: number) => void;
  englishVoiceName: string;
  onEnglishVoiceChange: (name: string) => void;
  koreanVoiceName: string;
  onKoreanVoiceChange: (name: string) => void;
  englishVoices: SpeechSynthesisVoice[];
  koreanVoices: SpeechSynthesisVoice[];
};

export function TTSControls({
  volume,
  onVolumeChange,
  englishRate,
  onEnglishRateChange,
  koreanRate,
  onKoreanRateChange,
  englishVoiceName,
  onEnglishVoiceChange,
  koreanVoiceName,
  onKoreanVoiceChange,
  englishVoices,
  koreanVoices,
}: TTSControlsProps) {
  return (
    <div className="flex flex-col items-end gap-1 text-sm text-gray-600 mb-1">
      <div className="flex items-center gap-2">
        <span>볼륨:</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value) || 0)}
          className="w-40"
          title="전체 TTS 볼륨입니다."
        />
        <span className="w-10 text-right">{Math.round(volume * 100)}%</span>
      </div>

      <div className="flex items-center gap-2">
        <span>영어배속:</span>
        <select
          className="border rounded px-1 py-0.5 text-sm"
          value={englishRate}
          onChange={(e) => onEnglishRateChange(parseFloat(e.target.value) || 1)}
          title="영어 대사의 재생 속도입니다."
        >
          {[0.6, 0.8, 1, 1.2, 1.5].map((r) => (
            <option key={r} value={r}>
              {r.toFixed(1)}x
            </option>
          ))}
        </select>
        <span>영어 보이스:</span>
        {englishVoices.length > 0 ? (
          <select
            className="border rounded px-1 py-0.5 text-sm max-w-[200px]"
            value={englishVoiceName}
            onChange={(e) => onEnglishVoiceChange(e.target.value)}
            title="영어 대사에 사용할 음성을 선택합니다."
          >
            <option value="default">기본 영어 음성</option>
            {englishVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            className="border rounded px-1 py-0.5 text-sm max-w-[200px] text-gray-400 bg-gray-50"
            value="default"
            disabled
            title="이 기기/브라우저에서는 개별 영어 음성 선택이 지원되지 않아 브라우저 기본 음성을 사용합니다."
          >
            <option value="default">기본 영어 (브라우저 기본)</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span>한글 배속:</span>
        <select
          className="border rounded px-1 py-0.5 text-sm"
          value={koreanRate}
          onChange={(e) => onKoreanRateChange(parseFloat(e.target.value) || 1)}
          title="해석(한글) 재생 속도입니다. 기본은 1배속입니다."
        >
          {[0.6, 0.8, 1, 1.2, 1.5].map((r) => (
            <option key={r} value={r}>
              {r.toFixed(1)}x
            </option>
          ))}
        </select>
        <span>한글 보이스:</span>
        {koreanVoices.length > 0 ? (
          <select
            className="border rounded px-1 py-0.5 text-sm max-w-[200px]"
            value={koreanVoiceName}
            onChange={(e) => onKoreanVoiceChange(e.target.value)}
            title="해석(한글) 재생에 사용할 음성을 선택합니다."
          >
            <option value="default">기본 한글 음성</option>
            {koreanVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            className="border rounded px-1 py-0.5 text-sm max-w-[200px] text-gray-400 bg-gray-50"
            value="default"
            disabled
            title="이 기기/브라우저에서는 한글 음성 선택이 지원되지 않아 브라우저 기본 음성을 사용합니다."
          >
            <option value="default">기본 한글 (브라우저 기본)</option>
          </select>
        )}
      </div>
    </div>
  );
}
