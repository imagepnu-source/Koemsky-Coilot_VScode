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
      {items.map((it, idx) => (
        <div key={idx}>
          {(it._displayTitle ?? it.title)}
        </div>
      ))}
    </div>
  );
}
