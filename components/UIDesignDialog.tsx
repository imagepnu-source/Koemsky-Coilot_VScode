'use client';
import React from 'react';
import type {
  AllCfg, BoxCfg, SmallBoxCfg, FontCfg, LevelBadgeCfg, AgeBadgeCfg, DropdownCfg
} from '@/lib/ui-design';
import { loadUIDesignCfg, saveUIDesignCfg, applyUIDesignCSS, asFont, saveGlobalUIDesignCfg } from '@/lib/ui-design';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { BoxStyle, TextStyle } from "@/lib/ui-types";

export default function UIDesignDialog() {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>('list');
  // cfg is managed by reducer below (loadUIDesignCfg used in initializer)
  type Action =
    | { type: 'SET'; key: keyof AllCfg; value: any }
    | { type: 'RESET'; value: AllCfg }

  function cfgReducer(state: AllCfg, action: Action): AllCfg {
    switch (action.type) {
      case 'SET':
        return { ...state, [action.key]: action.value } as AllCfg
      case 'RESET':
        return action.value
      default:
        return state
    }
  }

  const [cfg, dispatch] = React.useReducer(
    cfgReducer,
    undefined as unknown as AllCfg,
    () => {
      try {
        return loadUIDesignCfg()
      } catch {
        return {} as AllCfg
      }
    },
  )

  const update = <K extends keyof AllCfg>(k: K, v: AllCfg[K]) =>
    dispatch({ type: 'SET', key: k, value: v })

  // 마지막으로 사용한 탭을 localStorage에 저장/복원
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('komensky_ui_design_last_tab');
      if (stored === 'list' || stored === 'detail' || stored === 'graph') {
        setActiveTab(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('komensky_ui_design_last_tab', value);
    } catch {
      // ignore
    }
  };

  // --- ADD: modal position/size + drag state/handlers (insert if missing) ---
  const [modalSize, setModalSize] = React.useState({ width: 0, height: 0 });
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const dragRef = React.useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
  });

  React.useEffect(() => {
    const compute = () => {
      const w = Math.round(window.innerWidth * 0.7);
      const h = Math.round(window.innerHeight * 0.7) + 50;
      setModalSize({ width: w, height: h });
      setPos(p => (p.x === 0 && p.y === 0)
        ? { x: Math.max(8, Math.round((window.innerWidth - w) / 2)), y: Math.max(8, Math.round((window.innerHeight - h) / 2)) }
        : p);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [open]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - modalSize.width - 8, dragRef.current.startLeft + dx)),
        y: Math.max(8, Math.min(window.innerHeight - modalSize.height - 8, dragRef.current.startTop + dy)),
      });
    };
    const onUp = () => { dragRef.current.dragging = false; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [modalSize]);

  // 외부에서 같은 UI Set 다이얼로그를 열 수 있도록, 전역 이벤트를 수신합니다.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const openHandler = () => setOpen(true);
    window.addEventListener('komensky:openUIDesign', openHandler as EventListener);
    return () => {
      window.removeEventListener('komensky:openUIDesign', openHandler as EventListener);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.startLeft = pos.x;
    dragRef.current.startTop = pos.y;
    document.body.style.userSelect = 'none';
  };
  // --- END ADD ---
  React.useEffect(() => {
    // 1) 편집 중에는 즉시 CSS 변수 적용 (현재 기기 미리보기)
    applyUIDesignCSS(cfg);

    // 2) localStorage에도 바로 반영해서, loadUIDesignCfg()가 항상 최신 편집 값을 읽도록 유지
    //    (Save 버튼은 Supabase로 "전역 저장"만 담당)
    saveUIDesignCfg(cfg);

    // 3) 그래프 등 클라이언트 컴포넌트가 즉시 다시 그리도록 미리보기 이벤트(선택적)를 전파
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ui-design-preview-updated'));
    }
  }, [cfg]);

  const persist = async () => {
    // 1) 이 브라우저(localStorage)에 저장
    saveUIDesignCfg(cfg);

    // 2) Supabase 전역 UI 설정에도 동기화하여, 다른 기기(모바일 등)에서 같은 UI를 사용
    try {
      await saveGlobalUIDesignCfg(cfg);
    } catch (e) {
      console.warn('[UIDesignDialog] Failed to save global UI settings', e);
    }

    // 3) 다른 컴포넌트에게 UI 설정이 갱신되었음을 알림
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ui-design-updated'));
    }
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999]"
        >
          <div className="absolute inset-0 bg-transparent" onClick={() => setOpen(false)} />

          <div
            className="relative z-10 rounded-xl bg-white shadow-2xl border"
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              width: modalSize.width || '70vw',
              height: modalSize.height || 'calc(70vh + 50px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden', // prevent page scroll and let body handle scrolling
            }}
            aria-label="UI Design Dialog"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b cursor-grab" onMouseDown={startDrag}>
              <h2 className="text-lg font-bold">uiSet 개발자 이외는 사용 금지, 즉시 Close!</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-2 py-1 text-sm border rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={persist}
                >
                  Save
                </button>
                <button type="button" className="px-2 py-1 text-sm border rounded" onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>

            {/* body: keep all existing Tabs/sections unchanged, but make body scrollable */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                  <TabsTrigger value="list">Play List</TabsTrigger>
                  <TabsTrigger value="detail">Play Detail</TabsTrigger>
                  <TabsTrigger value="graph">Graph</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                  <div className="w-full h-full overflow-auto px-4 py-3">
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">상단 컨테이너 (미리보기)</div>
                        <BoxSection title="상단 컨테이너 속성" value={cfg.topHeaderBox} onChange={v=>update('topHeaderBox', v)} />
                        <div className="grid grid-cols-1 gap-3 mt-3">
                          <FontSection title="Title" value={cfg.title} onChange={v=>update('title', v)} />
                          <FontSection title="이름·나이(NameBio)" value={cfg.namebio} onChange={v=>update('namebio', v)} />
                          {/* 순서: 폰트(Size→Bold→Color) */}
                          <FontSection title="발달 나이(DevAge)" value={asFont(cfg.devage)} onChange={v=>update('devage', v)} />
                                              <div className="p-3 rounded-lg border bg-white">
                            <div className="font-semibold mb-2">카테고리 발달 나이(Catag)</div>
                            {/* 순서: 폰트(Size) → Bold → Color */}
                            <div className="grid grid-cols-4 gap-3 mb-2">
                              <LabeledNumber label="Size (px)" value={cfg.catag.size} onChange={n=>update('catag', { ...cfg.catag, size: n })} />
                              <LabeledCheckbox label="Bold" checked={!!cfg.catag.bold} onChange={b=>update('catag', { ...cfg.catag, bold: b })} />
                              <LabeledColor label="Color" value={cfg.catag.color || '#111111'} onChange={c=>update('catag', { ...cfg.catag, color: c })} />
                            </div>
                          </div>
                          <DropdownSection value={cfg.dropdown} onChange={v=>update('dropdown', v)} />
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">놀이 List 컨테이너 (미리보기)</div>
                        <BoxSection title="놀이 List 컨테이너 속성" value={cfg.playListBox} onChange={v=>update('playListBox', v)} />
                        <div className="grid grid-cols-1 gap-3 mt-3">
                          <SmallBoxSection title="Activity Row · 카드(상위 컨테이너)" value={cfg.activityBox} onChange={v=>update('activityBox', v)} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 mt-3">
                          <FontSection title="Activity (번호+제목) 텍스트" value={asFont(cfg.activity)} onChange={v=>update('activity', v)} />
                          <LevelBadgeEditor title="Badge · Level 텍스트" value={cfg.levelBadge} onChange={v=>update('levelBadge', v)} />
                          <AgeBadgeEditor   title="Badge · Age 텍스트"   value={cfg.ageBadge}   onChange={v=>update('ageBadge', v)} />
                          
                          {/* Badge와 Activity 텍스트 Indent */}
                          <div className="p-3 rounded-lg border bg-white">
                            <div className="font-semibold mb-2">List Indent (거리두기)</div>
                            <div className="grid grid-cols-3 gap-3">
                              <LabeledNumber label="Badge · Level Indent (px)" value={cfg.levelBadgeIndent ?? 0} onChange={n=>update('levelBadgeIndent', n)} />
                              <LabeledNumber label="Badge · Age Indent (px)" value={cfg.ageBadgeIndent ?? 0} onChange={n=>update('ageBadgeIndent', n)} />
                              <LabeledNumber label="Activity Indent (px)" value={cfg.activityIndent ?? 8} onChange={n=>update('activityIndent', n)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ✅ 새로 추가: Play Detail 탭 (안전 가드 포함) */}
                <TabsContent value="detail">
                  <div className="w-full h-[calc(70vh-56px-56px)] overflow-auto px-4 py-3">
                    <div className="space-y-4">
                      {/* Play Detail Panel (최상위 컨테이너) */}
                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">Play Detail Panel (전체 컨테이너)</div>
                        <SmallBoxSection title="Play Detail Panel 속성" value={cfg.detailPanelBox}
                          onChange={v=>update('detailPanelBox', v)} />
                      </div>

                      {/* Play Detail Header */}
                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">Play Detail Header (헤더 컨테이너)</div>
                        <SmallBoxSection title="헤더 컨테이너" value={cfg.detailHeaderBox}
                          onChange={v=>update('detailHeaderBox', v)} />
                        <div className="grid grid-cols-1 gap-3 mt-3">
                          <FontSection title="헤더 제목 (번호. 제목)" value={asFont(cfg.detailHeaderTitle)}
                            onChange={v=>update('detailHeaderTitle', v)} />
                        </div>
                        <div className="grid grid-cols-1 gap-3 mt-3">
                          <ButtonEditor title="목록 버튼" value={cfg.detailHeaderListBtn}
                            onChange={v=>update('detailHeaderListBtn', v)} />
                          <ButtonEditor title="이전 버튼" value={cfg.detailHeaderPrevBtn}
                            onChange={v=>update('detailHeaderPrevBtn', v)} />
                          <ButtonEditor title="다음 버튼" value={cfg.detailHeaderNextBtn}
                            onChange={v=>update('detailHeaderNextBtn', v)} />
                        </div>
                      </div>

                      {/* 섹션 컨테이너 & 텍스트 (일반/난이도 공통) */}
                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">섹션 컨테이너 & 텍스트 (일반/난이도 공통)</div>
                        <SmallBoxSection title="섹션(소) 컨테이너" value={cfg.detailSmallBox}
                          onChange={v=>update('detailSmallBox', v)} />
                        <div className="grid grid-cols-1 gap-3 mt-3">
                          <FontSection title="섹션 제목(소)" value={asFont(cfg.detailTitle)}
                            onChange={v=>update('detailTitle', v)} />
                          <FontSection title="섹션 본문(소)" value={asFont(cfg.detailBody)}
                            onChange={v=>update('detailBody', v)} />
                        </div>
                      </div>

                      {/* 난이도 체크박스 */}
                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">난이도 체크박스</div>
                        <CheckboxSection value={cfg.difficultyCheckbox}
                          onChange={v=>update('difficultyCheckbox', v)} />
                      </div>

                      {/* 안전 주의 */}
                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">안전 주의</div>
                        <SmallBoxSection title="안전 주의 컨테이너" value={cfg.safetySmallBox}
                          onChange={v=>update('safetySmallBox', v)} />
                        <div className="grid grid-cols-1 gap-3 mt-3">
                          <FontSection title="안전 주의 제목" value={asFont(cfg.safetyTitle)}
                            onChange={v=>update('safetyTitle', v)} />
                          <FontSection title="안전 주의 본문" value={asFont(cfg.safetyBody)}
                            onChange={v=>update('safetyBody', v)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ✅ Graph 탭: Radar / 시간축 그래프 UI 조정 */}
                <TabsContent value="graph">
                  <div className="w-full h-[calc(70vh-56px-56px)] overflow-auto px-4 py-3">
                    <div className="space-y-4">
                      {/* Radar 그래프 UI Box */}
                      <div className="p-3 rounded-lg border bg-white">
                        <div className="font-semibold mb-2">Radar 그래프 UI</div>
                        <div className="text-xs text-gray-500 mb-3">
                          상단 레이더 그래프 탭 안의 폭/간격/폰트를 조절합니다.
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <LabeledNumber
                            label="Container 폭 (%)"
                            value={cfg.radarGraph?.containerWidthPercent ?? 100}
                            onChange={n=>update('radarGraph', {
                              ...(cfg.radarGraph || {}),
                              containerWidthPercent: n,
                            })}
                          />
                          <LabeledNumber
                            label="세로 크기 (%)"
                            value={cfg.radarGraph?.containerHeightPercent ?? 100}
                            onChange={n=>update('radarGraph', {
                              ...(cfg.radarGraph || {}),
                              containerHeightPercent: n,
                            })}
                          />
                          <LabeledNumber
                            label="Y Offset (px)"
                            value={cfg.radarGraph?.containerYOffset ?? 16}
                            onChange={n=>update('radarGraph', {
                              ...(cfg.radarGraph || {}),
                              containerYOffset: n,
                            })}
                          />
                          <LabeledNumber
                            label="Tab Font (px)"
                            value={cfg.radarGraph?.tabFontSize ?? 14}
                            onChange={n=>update('radarGraph', {
                              ...(cfg.radarGraph || {}),
                              tabFontSize: n,
                            })}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <LabeledNumber
                            label="Title Font (px)"
                            value={cfg.radarGraph?.titleFontSize ?? 16}
                            onChange={n=>update('radarGraph', {
                              ...(cfg.radarGraph || {}),
                              titleFontSize: n,
                            })}
                          />
                          <LabeledNumber
                            label="축 라벨 (px)"
                            value={cfg.radarGraph?.axisLabelFontSize ?? 13}
                            onChange={n=>update('radarGraph', {
                              ...(cfg.radarGraph || {}),
                              axisLabelFontSize: n,
                            })}
                          />
                          <LabeledNumber
                            label="축 눈금 (px)"
                            value={cfg.radarGraph?.axisTickFontSize ?? 13}
                            onChange={n=>update('radarGraph', {
                              ...(cfg.radarGraph || {}),
                              axisTickFontSize: n,
                            })}
                          />
                        </div>
                      </div>

                      {/* 시간축 그래프 UI Box */}
                      <div className="p-3 rounded-lg border bg-white">
                        <div className="font-semibold mb-2">시간축 그래프 UI</div>
                        <div className="text-xs text-gray-500 mb-3">
                          "발달 그래프 - 모든 카테고리" 제목과 기간/축 폰트를 조절합니다.
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <LabeledNumber
                            label="Title Font (px)"
                            value={cfg.timeAxisGraph?.titleFontSize ?? 16}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              titleFontSize: n,
                            })}
                          />
                          <LabeledNumber
                            label="Legend Line (%)"
                            value={cfg.timeAxisGraph?.legendLineHeightPercent ?? 120}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              legendLineHeightPercent: n,
                            })}
                          />
                          <LabeledNumber
                            label="Title-기간바 Gap (px)"
                            value={cfg.timeAxisGraph?.titleSliderGap ?? 5}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              titleSliderGap: n,
                            })}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <LabeledNumber
                            label="Legend 행 간격 (px)"
                            value={cfg.timeAxisGraph?.legendRowGapPx ?? 4}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              legendRowGapPx: n,
                            })}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <LabeledNumber
                            label="시작/종료 Font (px)"
                            value={cfg.timeAxisGraph?.rangeLabelFontSize ?? 12}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              rangeLabelFontSize: n,
                            })}
                          />
                          <LabeledNumber
                            label="선택된 기간 Font (px)"
                            value={cfg.timeAxisGraph?.selectedRangeFontSize ?? 12}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              selectedRangeFontSize: n,
                            })}
                          />
                          <LabeledNumber
                            label="축 Title Font (px)"
                            value={cfg.timeAxisGraph?.axisTitleFontSize ?? 12}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              axisTitleFontSize: n,
                            })}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <LabeledNumber
                            label="축 눈금 Font (px)"
                            value={cfg.timeAxisGraph?.axisTickFontSize ?? 11}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              axisTickFontSize: n,
                            })}
                          />
                          <LabeledNumber
                            label="그래프 rect 가로 크기 (%)"
                            value={cfg.timeAxisGraph?.rectWidthPercent ?? 100}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              rectWidthPercent: n,
                            })}
                          />
                          <LabeledNumber
                            label="가로축제목-눈금 간격 (px)"
                            value={cfg.timeAxisGraph?.xTitleBottomGap ?? 5}
                            onChange={n=>update('timeAxisGraph', {
                              ...(cfg.timeAxisGraph || {}),
                              xTitleBottomGap: n,
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* footer intentionally left empty: 상단 Save/Close만 사용 */}
           </div>
         </div>
      )}
    </>
  );
}

/** ---------- Sections ---------- */
function FontSection(props: { title: string; value: FontCfg; onChange: (v: FontCfg)=>void }) {
  const { title, value, onChange } = props;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">{title}</div>
      <div className="grid grid-cols-4 gap-3">
        <LabeledNumber
          label="Size"
          value={value.size ?? 12}
          onChange={(n) => onChange({ ...value, size: n })}
        />
        <LabeledCheckbox
          label="Bold"
          checked={value.bold ?? false}
          onChange={(b) => onChange({ ...value, bold: b })}
        />
        <LabeledColor
          label="Color"
          value={value.color ?? '#000000'}
          onChange={(c) => onChange({ ...value, color: c })}
        />
        <LabeledNumber
          label="Indent"
          value={value.indent ?? 0}
          onChange={(n) => onChange({ ...value, indent: n })}
        />
      </div>
    </div>
  );
}

function LevelBadgeEditor(props: { title?: string; value: LevelBadgeCfg; onChange: (v: LevelBadgeCfg)=>void }) {
  const { title = 'Level Badge', value, onChange } = props;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">{title}</div>

      {/* Font */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledNumber label="Font" value={value.fontSize} onChange={n=>onChange({ ...value, fontSize: n })} />
        <LabeledCheckbox label="Bold" checked={value.bold} onChange={b=>onChange({ ...value, bold: b })} />
      </div>

      {/* BG / Border / Radius */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledColor  label="BG"     value={value.bg}          onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledNumber label="BWidth" value={value.borderWidth} onChange={n=>onChange({ ...value, borderWidth: n })} />
        <LabeledColor  label="BColor" value={value.borderColor} onChange={c=>onChange({ ...value, borderColor: c })} />
        <LabeledNumber label="Radius" value={value.radius}      onChange={n=>onChange({ ...value, radius: n })} />
      </div>

      {/* Height / Padding */}
      <div className="grid grid-cols-3 gap-3">
        <LabeledNumber label="Height" value={value.height} onChange={n=>onChange({ ...value, height: n })} />
        <LabeledNumber label="Pad X" value={value.paddingX} onChange={n=>onChange({ ...value, paddingX: n })} />
        <LabeledNumber label="Pad Y" value={value.paddingY} onChange={n=>onChange({ ...value, paddingY: n })} />
      </div>
    </div>
  );
}

function AgeBadgeEditor(props: { title?: string; value: AgeBadgeCfg; onChange: (v: AgeBadgeCfg)=>void }) {
  const { title = 'Age Badge', value, onChange } = props;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">{title}</div>

      {/* Font */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledNumber label="Font" value={value.fontSize} onChange={n=>onChange({ ...value, fontSize: n })} />
        <LabeledCheckbox label="Bold" checked={value.bold} onChange={b=>onChange({ ...value, bold: b })} />
        <LabeledColor label="Color" value={value.color} onChange={c=>onChange({ ...value, color: c })} />
      </div>

      {/* BG / Border / Radius */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledColor  label="BG"     value={value.bg}          onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledNumber label="BWidth" value={value.borderWidth} onChange={n=>onChange({ ...value, borderWidth: n })} />
        <LabeledColor  label="BColor" value={value.borderColor} onChange={c=>onChange({ ...value, borderColor: c })} />
        <LabeledNumber label="Radius" value={value.radius}      onChange={n=>onChange({ ...value, radius: n })} />
      </div>

      {/* Height / Padding / Width */}
      <div className="grid grid-cols-4 gap-3">
        <LabeledNumber label="Height" value={value.height} onChange={n=>onChange({ ...value, height: n })} />
        <LabeledNumber label="Pad X" value={value.paddingX} onChange={n=>onChange({ ...value, paddingX: n })} />
        <LabeledNumber label="Pad Y" value={value.paddingY} onChange={n=>onChange({ ...value, paddingY: n })} />
        <LabeledNumber label="Width" value={value.width} onChange={n=>onChange({ ...value, width: n })} />
      </div>
    </div>
  );
}

function DropdownSection(props: { value: DropdownCfg; onChange: (v: DropdownCfg)=>void }) {
  const { value, onChange } = props;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">Dropdown</div>
      <div className="grid grid-cols-4 gap-3">
        <LabeledNumber label="Size" value={value.size ?? 12} onChange={n=>onChange({ ...value, size: n })} />
        <LabeledCheckbox label="Bold" checked={value.bold ?? false} onChange={b=>onChange({ ...value, bold: b })} />
        <LabeledColor  label="Color" value={value.color ?? '#111111'} onChange={c=>onChange({ ...value, color: c })} />
        <LabeledColor  label="BG"    value={value.bg ?? '#FFFFFF'}    onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledNumber label="BWidth" value={value.borderWidth ?? 1} onChange={n=>onChange({ ...value, borderWidth: n })} />
        <LabeledColor  label="BColor" value={value.borderColor ?? 'rgba(0,0,0,0.12)'} onChange={c=>onChange({ ...value, borderColor: c })} />
        <LabeledColor  label="HoverBG" value={value.hoverBg ?? '#F5F5F5'} onChange={c=>onChange({ ...value, hoverBg: c })} />
      </div>
    </div>
  );
}

function BoxSection(props: { title?: string; value: BoxCfg; onChange: (v: BoxCfg)=>void }) {
  const { title = 'Box', value, onChange } = props;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">{title}</div>
      <div className="grid grid-cols-4 gap-3">
        <LabeledColor  label="BG" value={value.bg} onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledNumber label="Padding" value={value.padding} onChange={n=>onChange({ ...value, padding: n })} />
        <LabeledNumber label="BWidth" value={value.border.width} onChange={n=>onChange({ ...value, border: { ...value.border, width: n } })} />
        <LabeledColor  label="BColor" value={value.border.color} onChange={c=>onChange({ ...value, border: { ...value.border, color: c } })} />
      </div>
    </div>
  );
}

function SmallBoxSection(props: { title: string; value: SmallBoxCfg; onChange: (v: SmallBoxCfg)=>void }) {
  const { title, value, onChange } = props;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">{title}</div>
      <div className="grid grid-cols-4 gap-3">
        <LabeledColor  label="BG" value={value.bg} onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledNumber label="BWidth" value={value.borderWidth} onChange={n=>onChange({ ...value, borderWidth: n })} />
        <LabeledColor  label="BColor" value={value.borderColor} onChange={c=>onChange({ ...value, borderColor: c })} />
        <LabeledNumber label="Radius" value={value.radius} onChange={n=>onChange({ ...value, radius: n })} />
      </div>
    </div>
  );
}

function CheckboxSection(props: { value: import('@/lib/ui-design').CheckboxCfg; onChange: (v: import('@/lib/ui-design').CheckboxCfg)=>void }) {
  const { value, onChange } = props;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">체크박스</div>
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledNumber label="Size" value={value.size} onChange={n=>onChange({ ...value, size: n })} />
        <LabeledColor  label="BG" value={value.bg} onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledNumber label="Gap" value={value.gap} onChange={n=>onChange({ ...value, gap: n })} />
      </div>
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledNumber label="BWidth" value={value.borderWidth} onChange={n=>onChange({ ...value, borderWidth: n })} />
        <LabeledColor  label="BColor" value={value.borderColor} onChange={c=>onChange({ ...value, borderColor: c })} />
        <LabeledColor  label="BColor (Checked)" value={value.borderColorChecked} onChange={c=>onChange({ ...value, borderColorChecked: c })} />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <LabeledColor  label="Checkmark" value={value.checkmarkColor} onChange={c=>onChange({ ...value, checkmarkColor: c })} />
      </div>
    </div>
  );
}

function ButtonEditor(props: { title?: string; value: import('@/lib/ui-design').ButtonCfg; onChange: (v: import('@/lib/ui-design').ButtonCfg)=>void }) {
  const { title = 'Button', value, onChange } = props;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">{title}</div>
      
      {/* Font */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledNumber label="Font" value={value.fontSize} onChange={n=>onChange({ ...value, fontSize: n })} />
        <LabeledCheckbox label="Bold" checked={value.bold} onChange={b=>onChange({ ...value, bold: b })} />
        <LabeledColor label="Color" value={value.color} onChange={c=>onChange({ ...value, color: c })} />
      </div>

      {/* BG / Hover / Border */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledColor  label="BG"        value={value.bg}          onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledColor  label="Hover BG"  value={value.hoverBg}     onChange={c=>onChange({ ...value, hoverBg: c })} />
        <LabeledNumber label="BWidth"    value={value.borderWidth} onChange={n=>onChange({ ...value, borderWidth: n })} />
        <LabeledColor  label="BColor"    value={value.borderColor} onChange={c=>onChange({ ...value, borderColor: c })} />
      </div>

      {/* Radius / Padding */}
      <div className="grid grid-cols-3 gap-3">
        <LabeledNumber label="Radius" value={value.radius} onChange={n=>onChange({ ...value, radius: n })} />
        <LabeledNumber label="Pad X" value={value.paddingX} onChange={n=>onChange({ ...value, paddingX: n })} />
        <LabeledNumber label="Pad Y" value={value.paddingY} onChange={n=>onChange({ ...value, paddingY: n })} />
      </div>
    </div>
  );
}

/** ---------- Tiny Inputs ---------- */
function LabeledNumber(props: { label: string; value: number; onChange: (n: number)=>void }) {
  return (
    <label className="ui-item col-span-1 min-w-0 flex items-center gap-2">
      <span className="w-20 text-sm">{props.label}</span>
      <input
        type="number"
        className="border px-2 py-1 w-24"
        value={props.value}
        onChange={e=>props.onChange(Number(e.target.value))}
      />
    </label>
  );
}
function LabeledCheckbox(props: { label: string; checked: boolean; onChange: (b: boolean)=>void }) {
  return (
    <label className="ui-item col-span-1 min-w-0 flex items-center gap-2">
      <span className="w-20 text-sm">{props.label}</span>
      <input type="checkbox" checked={props.checked} onChange={e=>props.onChange(e.target.checked)} />
    </label>
  );
}
function LabeledColor(props: { label: string; value: string; onChange: (c: string)=>void }) {
  const normalize = (val: string) => {
    if (!val) return '#000000';
    const v = val.trim();
    if (/^(oklch|rgb|rgba|hsl|hsla)\(/i.test(v)) return v;
    const m = v.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
    if (m) {
      const hex = m[1].length===3 ? '#' + m[1].split('').map(ch=>ch+ch).join('') : '#' + m[1];
      return hex.toUpperCase();
    }
    return v;
  };
  const onText = (e: any) => props.onChange(normalize(e.target.value));
  const onPick = (e: any) => props.onChange(normalize(e.target.value));
  const val = props.value || '';
  const norm = normalize(val);
  const hexForPicker = /^#([0-9A-F]{6}|[0-9A-F]{8})$/i.test(norm) ? (norm.length===9 ? norm.slice(0,7) : norm) : '#000000';

  return (
    <label className="ui-item col-span-1 min-w-0 flex items-center gap-2">
      <span className="w-20 text-sm">{props.label}</span>
      <input type="color" className="h-8 w-[30px] border rounded shrink-0" value={hexForPicker} onChange={onPick} title="Color picker" />
      <input type="text" className="border px-2 py-1 w-1/2 font-mono text-sm" placeholder="#RRGGBB / #RRGGBBAA / oklch() / rgb()" value={val} onChange={onText} />
    </label>
  );
}