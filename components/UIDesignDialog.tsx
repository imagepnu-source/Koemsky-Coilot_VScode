'use client';
import React, { useEffect } from 'react';
import type {
  AllCfg, BoxCfg, SmallBoxCfg, FontCfg, LevelBadgeCfg, AgeBadgeCfg, DropdownCfg
} from '@/lib/ui-design';
import { loadUIDesignCfg, saveUIDesignCfg, applyUIDesignCSS as applyUIDesignGlobal, asFont } from '@/lib/ui-design';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { BoxStyle, TextStyle } from "@/lib/ui-types";

export default function UIDesignDialog() {
  const [open, setOpen] = React.useState(false);

  // 위치/크기 상태 복원 (팝업 동작에 필요)
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [modalSize, setModalSize] = React.useState<{ width?: string | number; height?: string | number }>( {
    width: '70vw',
    height: 'calc(70vh + 50px)',
  });

  // 드래그 시작 핸들러 (팝업 헤더에서 사용)
  function startDrag(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: pos.x, y: pos.y };

    function onMove(ev: MouseEvent) {
      setPos({ x: orig.x + (ev.clientX - startX), y: orig.y + (ev.clientY - startY) });
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  React.useEffect(()=>{
    if (open) {
      document.documentElement.classList.add('ui-design-active');
      // attach dev-only debug hooks (only in non-production)
      if (process.env.NODE_ENV !== 'production') {
        attachUIDesignDebug();
      }
    } else {
      document.documentElement.classList.remove('ui-design-active');
      if (process.env.NODE_ENV !== 'production') {
        detachUIDesignDebug();
      }
    }
    // cleanup on unmount
    return () => {
      try { detachUIDesignDebug(); } catch {}
    }
  }, [open]);

  // --- dev-only: attach/detach runtime debug hooks to capture who removes classes/styles ---
  function attachUIDesignDebug() {
    if (typeof window === 'undefined') return;
    if ((window as any).__uiDesignDebugAttached) return;
    const trackedClasses = ['ui-design-active','ui-design-top-header','ui-design-playlist-root','ui-design-activity-box','ui-design-level-badge','ui-design-age-badge'];
    const trackedProps = ['background','padding','border','box-sizing','border-radius','font-size','font-weight','color'];

    const originals: any = {
      DOMTokenList_remove: DOMTokenList.prototype.remove,
      DOMTokenList_toggle: DOMTokenList.prototype.toggle,
      CSS_removeProperty: CSSStyleDeclaration.prototype.removeProperty,
      CSS_setProperty: CSSStyleDeclaration.prototype.setProperty,
    };
    (window as any).__uiDesignDebugOriginals = originals;

    DOMTokenList.prototype.remove = function(...tokens: any[]) {
      try {
        if (tokens.some(t => trackedClasses.includes(t))) {
          console.warn('[ui-design-debug] DOMTokenList.remove', { tokens, owner: (this as any).ownerElement || null });
          console.trace();
        }
      } catch(e) {}
      return originals.DOMTokenList_remove.apply(this, tokens);
    };

    DOMTokenList.prototype.toggle = function(token: string, force?: boolean) {
      try {
        const willRemove = (typeof force === 'boolean' && force === false) || (this.contains(token) && typeof force === 'undefined');
        if (willRemove && trackedClasses.includes(token)) {
          console.warn('[ui-design-debug] DOMTokenList.toggle (remove)', { token, force, owner: (this as any).ownerElement || null });
          console.trace();
        }
      } catch(e) {}
      return originals.DOMTokenList_toggle.apply(this, arguments as any);
    };

    CSSStyleDeclaration.prototype.removeProperty = function(prop: string) {
      try {
        const owner = (this as any).ownerElement || (this as any).ownerNode || null;
        // don't log global/non-element style objects (reduces noise)
        if (!owner) return originals.CSS_removeProperty.call(this, prop);
        if (prop && (prop.startsWith('--ui-') || trackedProps.includes(prop))) {
          console.warn('[ui-design-debug] style.removeProperty', { prop, owner });
          console.trace();
        }
      } catch(e) {}
      return originals.CSS_removeProperty.call(this, prop);
    };

    // reentrancy guard to avoid log -> style mutation -> log recursion
    CSSStyleDeclaration.prototype.setProperty = function(name: string, value: string | null, priority?: string) {
      try {
        const owner = (this as any).ownerElement || (this as any).ownerNode || null;
        // skip logging for non-element style objects (very noisy)
        if (!owner) return originals.CSS_setProperty.call(this, name, value as any, priority);

        // only track our keys
        if (!(name && (name.startsWith('--ui-') || trackedProps.includes(name)))) {
          return originals.CSS_setProperty.call(this, name, value as any, priority);
        }

        // guard reentrancy
        const flagKey = '__uiDesignDebug_in_setProperty';
        if ((window as any)[flagKey]) {
          return originals.CSS_setProperty.call(this, name, value as any, priority);
        }
        (window as any)[flagKey] = true;
        try {
          console.info('[ui-design-debug] style.setProperty', { name, value, priority, owner });
          console.trace();
        } finally {
          (window as any)[flagKey] = false;
        }
      } catch(e) {}
      return originals.CSS_setProperty.call(this, name, value as any, priority);
    };

    (window as any).__uiDesignDebugAttached = true;
    console.info('[ui-design-debug] attached');
  }

  function detachUIDesignDebug() {
    if (typeof window === 'undefined') return;
    const o = (window as any).__uiDesignDebugOriginals;
    if (!o) return;
    try {
      DOMTokenList.prototype.remove = o.DOMTokenList_remove;
      DOMTokenList.prototype.toggle = o.DOMTokenList_toggle;
      CSSStyleDeclaration.prototype.removeProperty = o.CSS_removeProperty;
      CSSStyleDeclaration.prototype.setProperty = o.CSS_setProperty;
    } catch(e) {}
    delete (window as any).__uiDesignDebugOriginals;
    delete (window as any).__uiDesignDebugAttached;
    console.info('[ui-design-debug] detached');
  }

  // cfg is managed by reducer below (loadUIDesignCfg used in initializer)
  type Action =
    | { type: 'SET'; key: keyof AllCfg; value: any }
    | { type: 'RESET'; value: AllCfg }

  function cfgReducer(state: AllCfg, action: Action): AllCfg {
    console.log('[cfgReducer] action:', action); // <-- 추가: 액션 로깅
    switch (action.type) {
      case 'SET':
        return { ...state, [action.key]: action.value } as AllCfg
      case 'RESET':
        return action.value
      default:
        return state
    }
  }
  
  const [cfgState, dispatch] = React.useReducer(
    cfgReducer,
    undefined as unknown as AllCfg,
    () => {
      try {
        const loaded = loadUIDesignCfg()
        console.log('[init] loaded cfg:', loaded) // <-- 추가: 초기값 로그
        return loaded
      } catch {
        return {} as AllCfg
      }
    },
  )
  // Use the reducer state as the single source of truth for rendering
  const cfg = cfgState;
  
   const update = <K extends keyof AllCfg>(k: K, v: AllCfg[K]) => {
     console.log('[update] key=', k, 'value=', v) // <-- 추가: update 호출 로그
     dispatch({ type: 'SET', key: k, value: v })
   }
   
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!cfg) return;

    try {
      const win: any = window;
      // 직렬화해서 실제로 변경된 경우에만 적용 (순환 참조 방어)
      let serialized: string;
      try { serialized = JSON.stringify(cfg); } catch { serialized = String(cfg); }
      if (win.__komensky_last_cfg_serialized === serialized) return;
      win.__komensky_last_cfg_serialized = serialized;

      // 재진입 방지 플래그
      if (win.__komensky_ui_design_applying) return;
      win.__komensky_ui_design_applying = true;

      try {
        console.log('[useEffect applyUIDesignCSS] applying cfg');
        applyUIDesignGlobal(cfg);
        win.__debug_applyUIDesignCSS = () => applyUIDesignGlobal(cfg);
      } finally {
        // sync 변경으로 인한 즉시 재호출을 막기 위해 다음 이벤트 루프에서 플래그 해제
        setTimeout(() => { win.__komensky_ui_design_applying = false; }, 0);
      }
    } catch (e) {
      console.error('applyUIDesignCSS failed:', e);
    }
  }, [cfg]);
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
            className="relative z-10 rounded-xl bg-white shadow-2xl border ui-design-dialog-2"
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
                            {/* 순서: 폰트(Size) → Bold (Color 없음) */}
                            <div className="grid grid-cols-4 gap-3 mb-2">
                              <LabeledNumber label="Size (px)" value={cfg.catag.size} onChange={n=>update('catag', { ...cfg.catag, size: n })} />
                              <LabeledCheckbox label="Bold" checked={!!cfg.catag.bold} onChange={b=>update('catag', { ...cfg.catag, bold: b })} />
                            </div>
                          </div>
                          <DropdownSection value={cfg.dropdown} onChange={v=>update('dropdown', v)} />
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">놀이 List 컨테이너 (미리보기)</div>
                        <BoxSection title="놀이 List 컨테이너 속성" value={cfg.playListBox} onChange={v=>update('playListBox', v)} />
                        <div className="grid grid-cols-1 gap-3 mt-3">
                          <SmallBoxSection title="Activity Row (버턴)" value={cfg.activityBox} onChange={v=>update('activityBox', v)} />
                          <SmallBoxSection title="Badge · Level (칩 컨테이너)" value={cfg.levelBadgeBox} onChange={v=>update('levelBadgeBox', v)} />
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
                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">세부 섹션 컨테이너 (small · 미리보기)</div>
                        {/* cfg.detailSmallBox가 없을 경우에도 크래시 방지 */}
                        {cfg?.detailSmallBox
                          ? <SmallBoxSection title="섹션(소) 컨테이너" value={cfg.detailSmallBox}
                              onChange={v=>update('detailSmallBox', v)} />
                          : <div className="text-xs text-gray-500">연결 대기: cfg.detailSmallBox 없음</div>}
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-3 rounded-lg border">
                          <div className="font-semibold mb-2">세부 제목 텍스트</div>
                          {cfg?.detailTitle
                            ? <FontSection title="섹션 제목(소)" value={asFont(cfg.detailTitle)}
                                onChange={v=>update('detailTitle', v)} />
                            : <div className="text-xs text-gray-500">연결 대기: cfg.detailTitle 없음</div>}
                        </div>

                        <div className="p-3 rounded-lg border">
                          <div className="font-semibold mb-2">세부 본문 텍스트</div>
                          {cfg?.detailBody
                            ? <FontSection title="섹션 본문(소)" value={asFont(cfg.detailBody)}
                                onChange={v=>update('detailBody', v)} />
                            : <div className="text-xs text-gray-500">연결 대기: cfg.detailBody 없음</div>}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border">
                        <div className="font-semibold mb-2">난이도 영역 (옵션)</div>
                        {cfg?.difficultyBox
                          ? <SmallBoxSection title="난이도 컨테이너" value={cfg.difficultyBox}
                              onChange={v=>update('difficultyBox', v)} />
                          : <div className="text-xs text-gray-500">연결 대기: cfg.difficultyBox 없음</div>}
                        <div className="mt-3">
                          {cfg?.difficultyText
                            ? <FontSection title="난이도 텍스트" value={asFont(cfg.difficultyText)}
                                onChange={v=>update('difficultyText', v)} />
                            : <div className="text-xs text-gray-500">연결 대기: cfg.difficultyText 없음</div>}
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
function FontSection(props: { title: string; value?: FontCfg; onChange: (v: FontCfg)=>void }) {
  const { title, value: raw, onChange } = props;
  const value = raw ?? ({} as FontCfg); // safe fallback
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
      </div>
    </div>
  );
}

function LevelBadgeEditor(props: { title?: string; value: LevelBadgeCfg; onChange: (v: LevelBadgeCfg)=>void }) {
  const { title = 'Level Badge', value, onChange } = props;
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">{title}</div>

      {/* BG / Border / Radius */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledColor  label="BG"     value={value.bg}          onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledNumber label="BWidth" value={value.borderWidth} onChange={n=>onChange({ ...value, borderWidth: n })} />
        <LabeledColor  label="BColor" value={value.borderColor} onChange={c=>onChange({ ...value, borderColor: c })} />
        <LabeledNumber label="Radius" value={value.radius}      onChange={n=>onChange({ ...value, radius: n })} />
      </div>

      {/* Height */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledNumber label="Height" value={value.height} onChange={n=>onChange({ ...value, height: n })} />
      </div>

      {/* Padding */}
      <div className="grid grid-cols-4 gap-3">
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

      {/* Height */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        <LabeledNumber label="Height" value={value.height} onChange={n=>onChange({ ...value, height: n })} />
      </div>

      {/* Padding */}
      <div className="grid grid-cols-4 gap-3">
        <LabeledNumber label="Pad X" value={value.paddingX} onChange={n=>onChange({ ...value, paddingX: n })} />
        <LabeledNumber label="Pad Y" value={value.paddingY} onChange={n=>onChange({ ...value, paddingY: n })} />
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

function BoxSection(props: { title?: string; value?: BoxCfg; onChange: (v: BoxCfg)=>void }) {
  const { title = 'Box', value: raw, onChange } = props;
  const value = raw ?? ({} as BoxCfg);
  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">{title}</div>
      <div className="grid grid-cols-4 gap-3">
        <LabeledColor  label="BG" value={value.bg} onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledNumber label="Padding" value={value.padding ?? 0} onChange={n=>onChange({ ...value, padding: n })} />
        <LabeledNumber label="BWidth" value={(value.border && value.border.width) ?? 0} onChange={n=>onChange({ ...value, border: { ...(value.border ?? {}), width: n } })} />
        <LabeledColor  label="BColor" value={value.border?.color} onChange={c=>onChange({ ...value, border: { ...(value.border ?? {}), color: c } })} />
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

/** ---------- Tiny Inputs ---------- */
function LabeledNumber(props: { label: string; value?: number; onChange: (n: number)=>void }) {
  const valStr = typeof props.value === 'number' ? String(props.value) : ''
  return (
    <label className="ui-item col-span-1 min-w-0 flex items-center gap-2">
      <span className="w-20 text-sm">{props.label}</span>
      <input
        type="number"
        className="border px-2 py-1 w-24"
        value={valStr}
        onChange={e=>{
          const v = e.target.value
          const n = v === '' ? 0 : Number(v)
          props.onChange(Number.isNaN(n) ? 0 : n)
        }}
      />
    </label>
  );
}
function LabeledCheckbox(props: { label: string; checked?: boolean; onChange: (b: boolean)=>void }) {
  return (
    <label className="ui-item col-span-1 min-w-0 flex items-center gap-2">
      <span className="w-20 text-sm">{props.label}</span>
      <input type="checkbox" checked={!!props.checked} onChange={e=>props.onChange(e.target.checked)} />
    </label>
  );
}
function LabeledColor(props: { label: string; value?: string; onChange: (c: string)=>void }) {
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
 
   // color swatch sizing: 원래 h-8(약 32px) / w-[30px]을 기준으로
   // 목표: 48x48
   const swatchWidth = 48; // px
   const swatchHeight = 48; // px
 
   return (
     <label className="ui-item col-span-1 min-w-0 flex items-center gap-2">
       <span className="w-20 text-sm">{props.label}</span>
       <input
         type="color"
         value={hexForPicker}
         onChange={onPick}
         title="Color picker"
         className="border rounded shrink-0"
         style={{ width: swatchWidth + 'px', height: swatchHeight + 'px', padding: 0, verticalAlign: 'middle', boxSizing: 'border-box', WebkitAppearance: 'none', appearance: 'none' }}
       />
       <input
         type="text"
         className="border px-2 py-1 w-1/2 font-mono text-sm"
         placeholder="#RRGGBB / #RRGGBBAA / oklch() / rgb()"
         value={val}
         onChange={onText}
         style={{ height: Math.max(32, Math.round(swatchHeight * 0.66)) }} /* 보정: 텍스트 입력 세로 정렬 개선 */
       />
     </label>
   );
}

/** ---------- UIDesign CSS ---------- */
// (로컬 applyUIDesignCSS 구현 제거 — lib에서 제공하는 applyUIDesignCSS를 사용합니다)