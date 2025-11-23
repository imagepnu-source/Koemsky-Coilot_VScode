import React from "react";
import "./play-list-panel.hide-scrollbar.css";

export type PlayListItem = {
  key: string;
  num: number;
  title: string;
  category: string;
  minAge: number;
  maxAge: number;
  highestLevel?: number;
  // levelColorClass?: string; // <- 의존하지 않습니다 (TS 불일치 회피)
};

export interface PlayListPanelProps {
  items: PlayListItem[];
  onPlaySelect: (category: string, num: number) => void;
}

function computeLevelColorClass(lv: number): string {
  if (lv >= 4) return "level-color-4-5";
  if (lv === 3) return "level-color-3";
  if (lv >= 1) return "level-color-1-2";
  return "level-color-0";
}

function formatAge(minM: number, maxM: number): string {
  const format = (val: number) => {
    if (!Number.isFinite(val)) return 0;
    const v = Math.max(0, val);
    // 소숫점이 있으면 1자리까지 표시, 없으면 정수로
    return v % 1 === 0 ? Math.round(v) : v.toFixed(1);
  };
  const a = format(minM);
  const b = format(maxM);
  return `${a}\u2013${b}M`;
}

export default function PlayListPanel({ items, onPlaySelect }: PlayListPanelProps) {
  return (
    <div
      data-ui="play-list-panel"
      className="flex flex-col"
      style={{
        background: "var(--kp-play-list-bg, #FFFFFF)",
        borderWidth: "var(--kp-play-list-border-width, 1px)",
        borderStyle: "solid",
        borderColor: "var(--kp-play-list-border-color, rgba(0,0,0,0.12))",
        padding: "var(--kp-play-list-padding, 12px)",
        gap: "8px"
      }}
    >
      <div className="flex-1 hide-scrollbar" style={{ overflowY: 'auto', maxHeight: '100%' }}>
        {items.map((it) => {
          const highestLevel = typeof it.highestLevel === "number" ? it.highestLevel : 0;
          const levelColorClass = computeLevelColorClass(highestLevel);

          // Level별 색상 변수 적용
          let levelColorVar = "var(--level-0-color)";
          if (highestLevel === 1) levelColorVar = "var(--level-1-color)";
          else if (highestLevel === 2) levelColorVar = "var(--level-2-color)";
          else if (highestLevel === 3) levelColorVar = "var(--level-3-color)";
          else if (highestLevel === 4) levelColorVar = "var(--level-4-color)";
          else if (highestLevel >= 5) levelColorVar = "var(--level-5-color)";

          const levelBadgeStyle: React.CSSProperties = {
            fontSize: "var(--kp-level-badge-font-size, 12px)",
            fontWeight: "var(--kp-level-badge-weight, 400)",
            borderWidth: "var(--kp-level-badge-border-width, 1px)",
            borderStyle: "solid",
            borderColor: levelColorVar,
            color: levelColorVar,
            background: "var(--kp-level-badge-bg, #FFFFFF)",
            borderRadius: "var(--kp-level-badge-radius, 10px)",
            height: "var(--kp-level-badge-height, 20px)",
            padding: "var(--kp-level-badge-padding, 2px 6px)",
            display: "inline-flex",
            alignItems: "center",
          };

          const ageBadgeStyle: React.CSSProperties = {
            fontSize: "var(--kp-age-badge-font-size, 11px)",
            fontWeight: "var(--kp-age-badge-weight, 400)",
            borderWidth: "var(--kp-age-badge-border-width, 1px)",
            borderStyle: "solid",
            borderColor: "var(--kp-age-badge-border-color, rgba(0,0,0,0.12))",
            color: "var(--kp-age-badge-color, #111111)",
            background: "var(--kp-age-badge-bg, #FFFFFF)",
            borderRadius: "var(--kp-age-badge-radius, 8px)",
            height: "var(--kp-age-badge-height, 18px)",
            padding: "var(--kp-age-badge-padding, 2px 6px)",
            width: "var(--kp-age-badge-width, 80px)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          };

          return (
            <button
              key={it.key}
              type="button"
              className="w-full text-left"
              onClick={() => onPlaySelect(it.category, it.num)}
            >
              <div
                data-ui="activity-row"
                className="flex items-center gap-3"
                style={{
                  padding: "8px 12px",
                  background: "var(--kp-activity-box-bg, #FFFFFF)",
                  borderWidth: "var(--kp-activity-box-border-width, 1px)",
                  borderStyle: "solid",
                  borderColor: "var(--kp-activity-box-border-color, rgba(0,0,0,0.12))",
                  borderRadius: "var(--kp-activity-box-radius, 12px)",
                }}
              >
                {/* 번호+제목 → 적정연령 배지 → Level 배지 */}
                <div className="flex-1 flex items-center gap-2">
                  <span
                    data-ui="activity-text"
                    style={{
                      fontSize: "var(--kp-activity-size, 14px)",
                      fontWeight: "var(--kp-activity-weight, 700)",
                      color: "var(--kp-activity-color, #111111)",
                      marginLeft: "var(--kp-activity-indent, 8px)",
                    }}
                  >
                    {it.num}. {it.title}
                  </span>
                </div>

                <div data-ui="age-badge" className="shrink-0 inline-flex items-center" style={{
                  ...ageBadgeStyle,
                  marginRight: "var(--kp-age-badge-indent, 0px)"
                }}>
                  {formatAge(it.minAge, it.maxAge)}
                </div>

                <div
                  data-ui="level-badge"
                  className={`shrink-0 inline-flex items-center ${levelColorClass}`}
                  style={{
                    ...levelBadgeStyle,
                    marginRight: "var(--kp-level-badge-indent, 0px)"
                  }}
                >
                  {highestLevel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
