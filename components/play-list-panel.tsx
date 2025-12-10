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
  /**
   * 리스트에서 직접 댓글 창을 열고 싶을 때 호출 (옵션)
   * category, playNumber 를 넘기면 상세 화면의 댓글 팝업을 띄우도록 상위에서 연결 가능합니다.
   */
  onOpenCommentDialog?: (category: string, num: number) => void;
  /**
   * 스크롤 위치 복원값 (px)
   */
  restoreScrollPosition?: number;
  /**
   * 스크롤 위치 변경 시 호출 (scrollTop, topItemNum)
   */
  onScrollChange?: (scrollTop: number, topItemNum: number) => void;
}

// PlayDetailPanel 과 동일한 구조의 통합 상태 (즐겨찾기/댓글 등)
type PlayState = {
  favorite: boolean;
  hasComment: boolean;
  localComment?: string;
};

type PlayStateMap = Record<string, PlayState>;

const buildPlayKey = (category: string, num: number) => `${category}-${num}`;

const loadPlayStateMap = (childId: string): PlayStateMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`playState_${childId}`);
    if (!raw) return {};
    return JSON.parse(raw) as PlayStateMap;
  } catch {
    return {};
  }
};

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

import React, { useRef, useEffect, useState } from "react";

// childProfile 정보는 상위에서 prop으로 전달받는다고 가정 (id, name)
// 만약 prop이 없다면 'default'로 처리
export default function PlayListPanel({ items, onPlaySelect, onOpenCommentDialog, restoreScrollPosition, onScrollChange, childProfile }: PlayListPanelProps & { childProfile?: { id: string; name: string } }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const childId = childProfile?.id || "default";

  // 통합 PlayStateMap 한 번만 로딩 (리스트 전용, hook 사용)
  const [playStateMap, setPlayStateMap] = useState<PlayStateMap>({});
  const [contextMenuTarget, setContextMenuTarget] = useState<{ key: string; top: number; left: number } | null>(null);

  useEffect(() => {
    const map = loadPlayStateMap(childId);
    setPlayStateMap(map);
  }, [childId]);

  const updatePlayState = (playKey: string, updater: (prev: PlayState) => PlayState) => {
    setPlayStateMap(prev => {
      const current = prev[playKey] ?? { favorite: false, hasComment: false };
      const next = updater(current);
      const merged = { ...prev, [playKey]: next };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`playState_${childId}`, JSON.stringify(merged));
        }
      } catch {
        // ignore
      }
      return merged;
    });
  };

  // 스크롤 위치 복원
  useEffect(() => {
    if (restoreScrollPosition != null && scrollRef.current) {
      scrollRef.current.scrollTop = restoreScrollPosition;
    }
  }, [restoreScrollPosition, items]);

  // 스크롤 위치 변경 감지 및 가장 상단 아이템 번호 추적
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onScrollChange) return;
    const handler = () => {
      // 가장 상단에 보이는 아이템의 번호 찾기
      let topItemNum = items.length > 0 ? items[0].num : 0;
      if (el) {
        const children = Array.from(el.children) as HTMLElement[];
        for (let i = 0; i < children.length; i++) {
          const rect = children[i].getBoundingClientRect();
          const parentRect = el.getBoundingClientRect();
          if (rect.bottom > parentRect.top + 1) { // 1px 오차 허용
            topItemNum = items[i]?.num ?? topItemNum;
            break;
          }
        }
      }
      onScrollChange(el.scrollTop, topItemNum);
    };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [onScrollChange, items]);

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
      <div
        ref={scrollRef}
        className="flex-1 hide-scrollbar"
        style={{ overflowY: 'auto', maxHeight: '100%' }}
      >
        {items.map((it) => {
          const playKey = buildPlayKey(it.category as any, it.num);
          const state: PlayState = playStateMap[playKey] ?? { favorite: false, hasComment: false };
          const isFavorite = !!state.favorite;
          const hasComment = !!(state.hasComment && (state.localComment ?? "").trim().length > 0);
          const likeCount = 0; // TODO: global DB 연동 시 실제 값 사용
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
              className="w-full text-left relative"
              onClick={() => onPlaySelect(it.category, it.num)}
              onContextMenu={(e) => {
                e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const offsetY = e.clientY - rect.top;
                setContextMenuTarget({ key: playKey, top: offsetY, left: rect.width - 8 });
              }}
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
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {it.num}. {it.title}
                    {/* 상태 아이콘 묶음: 하나 이상 있을 때만 표시 */}
                    {(isFavorite || hasComment || likeCount > 0) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, gap: 4 }}>
                        {/* 찜(별) 아이콘 */}
                        {isFavorite && (
                          <span style={{ fontSize: 23, color: '#38bdf8' }} aria-label="찜">
                            ★
                          </span>
                        )}
                        {/* 댓글 있음 아이콘: 파란색 말풍선 SVG */}
                        {hasComment && (
                          <span
                            aria-label="댓글 여부"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{
                                display: 'block',
                                width: 20,
                                height: 20,
                                fill: '#1d4ed8',
                              }}
                            >
                              <path d="M5 4h14a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H9.8L6.4 19.7A.75.75 0 0 1 5 19.2V15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1zm1 2v7h1a1 1 0 0 1 1 1v2.38L11.2 14H19V6H6z" />
                            </svg>
                          </span>
                        )}
                        {/* 좋아요 수 뱃지: 1 이상일 때만 표시 (현재는 0이라 숨김) */}
                        {likeCount > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <span style={{ color: '#f59e42', fontSize: 21, marginRight: 2 }} aria-label="좋아요">♥</span>
                            <span style={{
                              display: 'inline-block',
                              minWidth: 22,
                              height: 22,
                              background: '#ffe5e5',
                              color: '#e11d48',
                              fontSize: 13,
                              fontWeight: 700,
                              borderRadius: 11,
                              textAlign: 'center',
                              lineHeight: '22px',
                              padding: '0 6px',
                            }}>{likeCount}</span>
                          </span>
                        )}
                      </span>
                    )}
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

                {/* 우클릭 컨텍스트 메뉴: 현재 행에만 표시 */}
                {contextMenuTarget && contextMenuTarget.key === playKey && (
                  <div
                    style={{
                      position: 'absolute',
                      top: contextMenuTarget.top,
                      right: 8,
                      zIndex: 100,
                      background: '#ffffff',
                      border: '1px solid rgba(0,0,0,0.15)',
                      borderRadius: 8,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                      padding: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      minWidth: 120,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      style={{ textAlign: 'left', padding: '4px 8px', fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onClick={() => {
                        updatePlayState(playKey, prev => ({ ...prev, favorite: !prev.favorite }));
                        setContextMenuTarget(null);
                      }}
                    >
                      {isFavorite ? '찜 해제' : '찜 추가'}
                    </button>
                    <button
                      type="button"
                      style={{ textAlign: 'left', padding: '4px 8px', fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', color: '#1d4ed8' }}
                      onClick={() => {
                        // 좋아요는 아직 전역 DB 설계 전이므로 자리표시자
                        alert('좋아요(Heart)는 전역 DB 연동 후 활성화됩니다.');
                        setContextMenuTarget(null);
                      }}
                    >
                      좋아요
                    </button>
                    <button
                      type="button"
                      style={{ textAlign: 'left', padding: '4px 8px', fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onClick={() => {
                        setContextMenuTarget(null);
                        // 상세 화면으로 이동하면서, 가능하다면 댓글 창도 함께 열기
                        onPlaySelect(it.category, it.num);
                        if (onOpenCommentDialog) {
                          onOpenCommentDialog(it.category, it.num);
                        }
                      }}
                    >
                      댓글 창 열기
                    </button>
                    <button
                      type="button"
                      style={{ textAlign: 'left', padding: '4px 8px', fontSize: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                      onClick={() => setContextMenuTarget(null)}
                    >
                      닫기
                    </button>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
