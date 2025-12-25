"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { IntroPage } from "@/lib/intro-guide";

interface IntroDialogProps {
  open: boolean;
  pages: IntroPage[];
  onComplete: () => void;
  // 현재 로그인한 사용자의 이메일 (등록 id 표시용)
  currentEmail?: string | null;
  // 등록된 아이 수 (예: 0~3)
  registeredChildCount?: number;
  // 첫 번째 등록된 아이 정보 (Intro 요약용)
  firstChildName?: string | null;
  firstChildBirthDate?: string | null;
  // "등록" 버튼 동작 (id/e-mail 등록)
  onOpenSignup?: () => void;
  // "Setting" 버튼 동작 (아이 등록 창 열기)
  onOpenSettings?: () => void;
}

// 공통: **굵게** 토큰을 React 노드로 변환
function renderInlineBold(text: string, keyPrefix: string): React.ReactNode[] {
  const segments: React.ReactNode[] = [];

  // 1) ""텍스트"" 패턴은 **텍스트** 로 변환하되,
  //    이미 **가 포함된 줄에서는 그대로 두어, **"곧 스스로"** 같은 경우
  //    따옴표가 사라지지 않도록 합니다.
  let t = text;
  if (!t.includes("**")) {
    t = t.replace(/""([^"\\"]+)""/g, "**$1**");
    // 이 경우에는 양쪽의 "" 를 마크업으로만 사용하므로 제거
    t = t.replace(/""/g, "");
  }

  // 라인 시작 부분에만 존재하고 닫히지 않는 "**" 는
  // 줄 끝까지 전체를 굵게 처리하도록 해석
  if (t.startsWith("**") && !t.slice(2).includes("**")) {
    const boldText = t.slice(2);
    if (boldText) {
      segments.push(
        <strong key={`${keyPrefix}-b-all`} className="font-bold">
          {boldText}
        </strong>,
      );
    }
    return segments;
  }
  let bi = 0;
  while (t.includes("**")) {
    const start = t.indexOf("**");
    if (start > 0) {
      segments.push(
        <span key={`${keyPrefix}-p-${bi}`}>{t.slice(0, start)}</span>,
      );
      bi++;
    }
    const end = t.indexOf("**", start + 2);
    if (end === -1) break;
    const boldText = t.slice(start + 2, end);
    // 2) 스타일 마커 처리:
    //    - **텍스트**(+2px, red)  -> 굵게 + 글자 크기 +2px, 빨간색
    //    - **텍스트**(+3px, red)  -> 굵게 + 글자 크기 +3px, 빨간색
    //    - **텍스트**(blue)       -> 굵게 + 파란색
    let className = "font-bold";
    let style: React.CSSProperties | undefined;
    let rest = t.slice(end + 2);

    const BLUE_MARKER = "(blue)";
    const RED_MARKER = "(red)";

    // (+Npx, red|blue) 형태를 모두 지원합니다. (예: +2px, +3px)
    const sizeColorMatch = rest.match(/^\(\+(\d+)px,\s*(red|blue)\)/);
    if (sizeColorMatch) {
      const deltaPx = Number.parseInt(sizeColorMatch[1], 10) || 0;
      const color = sizeColorMatch[2];
      if (color === "red") {
        className += " text-red-500";
      } else if (color === "blue") {
        className += " text-blue-500";
      }
      const baseSize = 15; // 본문 기본 폰트 15px 기준
      const fontSize = baseSize + deltaPx;
      style = { fontSize: `${fontSize}px` };
      rest = rest.slice(sizeColorMatch[0].length);
    } else if (rest.startsWith(BLUE_MARKER)) {
      className += " text-blue-500";
      rest = rest.slice(BLUE_MARKER.length);
    } else if (rest.startsWith(RED_MARKER)) {
      className += " text-red-500";
      rest = rest.slice(RED_MARKER.length);
    }

    segments.push(
      <strong
        key={`${keyPrefix}-b-${bi}`}
        className={className}
        style={style}
      >
        {boldText}
      </strong>,
    );
    bi++;
    t = rest;
  }
  if (t) {
    segments.push(
      <span key={`${keyPrefix}-p-${bi}`}>{t}</span>,
    );
  }
  return segments;
}

// 단일 줄을 Bold/버튼/텍스트로 나누어 렌더링
function renderLine(
  raw: string,
  opts: {
    currentEmail?: string | null;
    registeredChildCount?: number;
    firstChildName?: string | null;
    firstChildBirthDate?: string | null;
    onOpenSignup?: () => void;
    onOpenSettings?: () => void;
    onComplete: () => void;
  },
  key: React.Key,
) {
  const { currentEmail, registeredChildCount, firstChildName, firstChildBirthDate, onOpenSignup, onOpenSettings, onComplete } = opts;

  let line = raw;

  // 조건부 라인(__IF__...) 처리: 현재 상태에 따라 보이거나 숨김
  if (line.startsWith("__IF__")) {
    const m = line.match(/^__IF__([^_]+)__::(.*)$/);
    if (!m) {
      return null;
    }
    const condKey = m[1];
    const content = m[2];

    // noId/hasId/noChild/hasChild 에 대한 기본 해석
    let show: boolean;
    switch (condKey) {
      case "noId":
        show = !currentEmail;
        break;
      case "hasId":
        show = !!currentEmail;
        break;
      case "noChild":
        show = !registeredChildCount || registeredChildCount === 0;
        break;
      case "hasChild":
        show = (registeredChildCount ?? 0) > 0;
        break;
      default: {
        // 파서에서 조건 키를 못 알아들은 경우라도,
        // 내용(text)을 보고 합리적으로 표시 여부를 결정하는
        // 안전장치입니다.
        const hasChildCount = (registeredChildCount ?? 0) > 0;

        if (content.includes("<Setting>")) {
          // 아이 등록 창으로 이동 버튼 라인
          show = !hasChildCount;
        } else if (content.includes("아이 이름:") || content.includes("포함") && content.includes("등록되어 있습니다")) {
          // 아이 요약/명수 라인
          show = hasChildCount;
        } else if (content.includes("등록 id:")) {
          // 등록 id 표시 라인
          show = !!currentEmail;
        } else {
          show = false;
        }
        break;
      }
    }

    if (!show) {
      return null;
    }
    // 조건이 만족되면, 괄호 안의 내용만 일반 라인처럼 렌더링합니다.
    // hasChild/noChild 모두 Intro.txt 에 작성된 그대로를 사용하고,
    // 이름/생년월일/등록 수는 아래의 플레이스홀더 치환 로직으로 처리합니다.
    line = content;
  }

  // 레벨2 헤더 마커 처리
  if (line.startsWith("__H2__")) {
    const text = line.slice("__H2__".length);
    return (
	  <h3 key={key} className="text-[17px] font-normal mt-3 mb-1">
	    {renderInlineBold(text, String(key) + "-h2")}
	  </h3>
    );
  }

  // 플레이스홀더 치환
  // "등록 id:" / "등록 ID:" 등 소문자/대문자 혼용도 허용하여 이메일을 채웁니다.
  if (/등록\s*[iI][dD]\s*:/.test(line)) {
    if (currentEmail) {
      line = line.replace(/_{3,}/g, currentEmail);
    }
  }
  if (line.includes("아이 이름:")) {
    if (firstChildName) {
      const underlineRegex = /_{3,}/g;
      const match = underlineRegex.exec(line);
      if (match && match.index != null) {
        const s = match.index;
        const e = s + match[0].length;
        line = line.slice(0, s) + firstChildName + line.slice(e);
      }
    }
  }
  if (line.includes("생년월일:")) {
    if (firstChildBirthDate) {
      const underlineRegex = /_{3,}/g;
      const match = underlineRegex.exec(line);
      if (match && match.index != null) {
        const s = match.index;
        const e = s + match[0].length;
        line = line.slice(0, s) + firstChildBirthDate + line.slice(e);
      }
    }
  }
  if (line.includes("등록되어 있습니다")) {
    if (typeof registeredChildCount === "number") {
      // 마지막 언더라인(명 수)만 숫자로 치환하고, 이름/생년월일 언더라인은 그대로 둔다.
      const underlineRegex = /_{3,}/g;
      const matches = [...line.matchAll(underlineRegex)];
      if (matches.length > 0) {
        const last = matches[matches.length - 1];
        const start = last.index ?? 0;
        const end = start + last[0].length;
        line = line.slice(0, start) + String(registeredChildCount) + line.slice(end);
      }
    }
  }

  // 버튼 토큰(<...>)을 기준으로 split
  const parts: React.ReactNode[] = [];
  let rest = line;
  let idx = 0;
  const pushText = (text: string) => {
    if (!text) return;
    // Bold (** **) 토큰 처리 (중첩은 고려하지 않음)
    parts.push(...renderInlineBold(text, `t-${key}`));
  };

  while (true) {
    const start = rest.indexOf("<");
    if (start === -1) {
      pushText(rest);
      break;
    }
    if (start > 0) {
      pushText(rest.slice(0, start));
    }
    const end = rest.indexOf(">", start + 1);
    if (end === -1) {
      // 잘못된 형식: 나머지를 텍스트로 처리
      pushText(rest.slice(start));
      break;
    }
    const rawLabel = rest.slice(start + 1, end).trim();

    const lower = rawLabel.toLowerCase();
    let onClick: (() => void) | undefined;
    if (lower === "등록" && onOpenSignup) {
      onClick = onOpenSignup;
    } else if (lower === "setting" && onOpenSettings) {
      onClick = onOpenSettings;
    } else if (lower.includes("첫 도움 완료")) {
      onClick = onComplete;
    }

    const label = lower === "setting" ? "아이 정보 등록" : rawLabel;

    parts.push(
      <Button
        key={`btn-${key}-${idx}`}
        type="button"
        size="sm"
        variant={onClick ? "default" : "outline"}
        className="mx-1"
        onClick={onClick}
      >
        {label}
      </Button>,
    );
    idx++;
    rest = rest.slice(end + 1);
  }

  return (
    <p key={key} className="whitespace-pre-wrap">
      {parts}
    </p>
  );
}

export function IntroDialog({
  open,
  pages,
  onComplete,
  currentEmail,
  registeredChildCount,
  onOpenSettings,
  onOpenSignup,
  firstChildName,
  firstChildBirthDate,
}: IntroDialogProps) {
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // 다이얼로그를 다시 열 때마다 1페이지부터 시작하도록 인덱스를 리셋
  React.useEffect(() => {
    if (open) {
      setIndex(0);
    }
  }, [open]);

  if (!pages || pages.length === 0) return null;
  const page = pages[Math.min(index, pages.length - 1)];

  const goPrev = () => {
    setIndex((i) => (i > 0 ? i - 1 : 0));
  };

  const goNext = () => {
    if (index < pages.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const isLast = index === pages.length - 1;
  // bodyLines 에 들어있는 순서를 그대로 사용하여 줄 단위로 렌더링한다.
  // 빈 문자열(예: #CRLF)은 실제로 한 줄을 띄운 것처럼 보이도록 별도 처리한다.
  const lines = page.bodyLines;

  const touchHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setTouchStartX(e.touches[0].clientX);
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX == null) return;
      const endX = e.changedTouches[0].clientX;
      const delta = endX - touchStartX;
      const threshold = 40; // px
      if (delta > threshold) {
        // 오른쪽으로 스와이프 → 이전 페이지
        goPrev();
      } else if (delta < -threshold) {
        // 왼쪽으로 스와이프 → 다음 페이지
        goNext();
      }
      setTouchStartX(null);
    },
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // 오른쪽 위 X(닫기) 또는 바깥 영역 클릭으로 닫을 때도
        // "끝내기" 동작(onComplete)을 실행하도록 처리합니다.
        if (!nextOpen) {
          onComplete();
        }
      }}
    >
      <DialogContent
        className="flex flex-col"
        style={{ width: "90vw", maxWidth: "1200px", height: "90vh", maxHeight: "90vh" }}
        {...touchHandlers}
        aria-describedby="intro-dialog-desc"
      >
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold">
            {renderInlineBold(page.title || "처음 사용 가이드", "title")}
          </DialogTitle>
        </DialogHeader>
        {/* 시각적으로는 숨기되, 스크린 리더용으로만 간단한 설명을 제공합니다. */}
        <DialogDescription id="intro-dialog-desc" className="sr-only">
          사용법 안내 대화상자입니다.
        </DialogDescription>
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          <div className="flex-1 space-y-0 text-[15px] leading-snug overflow-auto pr-1">
            {lines.length === 0 && (
              <p className="text-gray-500">설명 내용이 없습니다.</p>
            )}
            {lines.map((line, idx) =>
              line.trim() === "" ? (
                // #CRLF 등으로 생성된 빈 줄: 실제로 한 줄 공백이 보이도록 렌더링
                <p key={`blank-${idx}`} className="whitespace-pre-wrap h-4" />
              ) : (
                renderLine(
                  line,
                  {
                    currentEmail,
                    registeredChildCount,
                    firstChildName,
                    firstChildBirthDate,
                    onOpenSettings,
                    onOpenSignup,
                    onComplete,
                  },
                  idx,
                )
              ),
            )}
          </div>

          <div className="flex items-center justify-end pt-2 border-t mt-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={index === 0}
              >
                이전
              </Button>
              <Button type="button" size="sm" onClick={goNext}>
                {isLast ? "다시 보지 않기" : "다음"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
