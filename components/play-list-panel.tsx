import React from "react";

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
  const a = Number.isFinite(minM) ? Math.max(0, Math.round(minM)) : 0;
  const b = Number.isFinite(maxM) ? Math.max(a, Math.round(maxM)) : a;
  return `${a}\u2013${b}M`;
}

export default function PlayListPanel({ items, onPlaySelect }: PlayListPanelProps) {
  return (
    <div
      data-ui="play-list-panel"
      className="flex flex-col"
      style={{
        background: "var(--ui-list-bg, transparent)",
        borderWidth: "var(--ui-list-border-width, 0px)",
        borderStyle: "solid",
        borderColor: "var(--ui-list-border-color, transparent)",
        padding: "var(--ui-list-padding, 0px)",
        gap: "var(--ui-activity-card-gap, 8px)",
      }}
    >
      {items.map((it) => {
        const highestLevel = typeof it.highestLevel === "number" ? it.highestLevel : 0;
        const levelColorClass = computeLevelColorClass(highestLevel);

        const levelBadgeStyle: React.CSSProperties = {
          fontSize: "var(--ui-level-badge-font-size, 12px)",
          fontWeight: "var(--ui-level-badge-text-weight, 400)",
          borderWidth: "var(--ui-level-badge-border-width, 2px)",
          borderStyle: "solid",
          borderColor: "var(--ui-level-badge-border-color, #C68689)",
          color: "var(--ui-level-badge-color, #111111)",
          background: "var(--ui-level-badge-bg, #EEF2FF)",
          borderRadius: "var(--ui-level-badge-radius, 10px)",
          height: "var(--ui-level-badge-height, 22px)",
          padding: "var(--ui-level-badge-padding, var(--ui-level-badge-padding-y, 2px) var(--ui-level-badge-padding-x, 8px))",
          display: "inline-flex",
          alignItems: "center",
        };

        const ageBadgeStyle: React.CSSProperties = {
          fontSize: "var(--ui-age-badge-font-size, 14px)",
          fontWeight: "var(--ui-age-badge-text-weight, 400)",
          borderWidth: "var(--ui-age-badge-border-width, 2px)",
          borderStyle: "solid",
          borderColor: "var(--ui-age-badge-border-color, #96A0B0)",
          color: "var(--ui-age-badge-color, #454545)",
          background: "var(--ui-age-badge-bg, #F9FAFB)",
          borderRadius: "var(--ui-age-badge-radius, 10px)",
          height: "var(--ui-age-badge-height, 25px)",
          padding: "var(--ui-age-badge-padding, var(--ui-age-badge-padding-y, 2px) var(--ui-age-badge-padding-x, 8px))",
          display: "inline-flex",
          alignItems: "center",
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
                paddingLeft: "var(--ui-activity-card-pad-x, 12px)",
                paddingRight: "var(--ui-activity-card-pad-x, 12px)",
                paddingTop: "var(--ui-activity-card-pad-y, 8px)",
                paddingBottom: "var(--ui-activity-card-pad-y, 8px)",
                background: "var(--ui-activity-card-bg, #FFFFFF)",
                borderWidth: "var(--ui-activity-card-border-width, 1px)",
                borderStyle: "solid",
                borderColor: "var(--ui-activity-card-border-color, #B3BDD1)",
                borderRadius: "var(--ui-activity-card-radius, 8px)",
              }}
            >
              {/* 번호+제목 텍스트 */}
              <div className="flex-1 flex items-center gap-2">
                <span
                  data-ui="activity-num"
                  style={{
                    fontSize: "var(--ui-activity-num-size, 14px)",
                    fontWeight: "var(--ui-activity-num-weight, 400)",
                    color: "var(--ui-activity-num-color, #111111)",
                  }}
                >
                  {it.num}.
                </span>
                <span
                  data-ui="activity-title"
                  style={{
                    fontSize: "var(--ui-activity-title-size, 14px)",
                    fontWeight: "var(--ui-activity-title-weight, 400)",
                    color: "var(--ui-activity-title-color, #111111)",
                  }}
                >
                  {it.title}
                </span>
              </div>

              {/* 순서: Level → Age */}
              <div
                data-ui="level-badge"
                className={`shrink-0 inline-flex items-center ${levelColorClass}`}
                style={levelBadgeStyle}
              >
                {highestLevel}
              </div>

              <div data-ui="age-badge" className="shrink-0 inline-flex items-center" style={ageBadgeStyle}>
                {formatAge(it.minAge, it.maxAge)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
