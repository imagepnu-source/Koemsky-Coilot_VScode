'use client';
import React from 'react';
import type {
  AllCfg, BoxCfg, SmallBoxCfg, FontCfg, LevelBadgeCfg, AgeBadgeCfg, DropdownCfg
} from '@/lib/ui-design';
import { loadUIDesignCfg, saveUIDesignCfg, applyUIDesignCSS, asFont } from '@/lib/ui-design';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { BoxStyle, TextStyle } from "@/lib/ui-types";

export default function UIDesignDialog() {
  const [open, setOpen] = React.useState(false);
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
  React.useEffect(() => { applyUIDesignCSS(cfg); }, [cfg]);
  const persist = () => saveUIDesignCfg(cfg);

  return (
    <>
      <button
        type="button"
        className="px-3 py-1 text-sm border rounded"
        data-ui="design-open"
        onClick={() => setOpen(true)}
      >
        UI Design 2
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999]"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

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
              <h2 className="text-lg font-bold">UI Design PopUp 2</h2>
              <div className="flex items-center gap-2">
                <button type="button" className="px-2 py-1 text-sm border rounded" onClick={persist}>Save</button>
                <button type="button" className="px-2 py-1 text-sm border rounded" onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>

            {/* body: keep all existing Tabs/sections unchanged, but make body scrollable */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Tabs defaultValue="list">
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

                {/* ✅ 새로 추가: Graph 탭 (자리표시자) */}
                <TabsContent value="graph">
                  <div className="w-full h-[calc(70vh-56px-56px)] overflow-auto px-4 py-3">
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">그래프 영역 (미리보기)</div>
                        <div className="text-xs text-gray-500">
                          연결 대기: 그래프 스타일 편집 섹션 (예: 축/선/포인트/범례). cfg.graph* 키가 확인되면 에디터로 교체.
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* footer: fixed / always visible */}
            <div className="border-t px-4 py-3" style={{ flex: '0 0 auto' }}>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1 border rounded" onClick={persist}>Save</button>
                <button className="px-3 py-1 border rounded" onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>
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