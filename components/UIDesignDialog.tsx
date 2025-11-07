'use client';
import React from 'react';
import type {
  AllCfg, FontCfg, DropdownCfg, BoxCfg, SmallBoxCfg, LevelBadgeCfg, AgeBadgeCfg
} from '@/lib/ui-design';
import { loadUIDesignCfg, saveUIDesignCfg, applyUIDesignCSS } from '@/lib/ui-design';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { BoxStyle, TextStyle } from "@/lib/ui-types";

export default function UIDesignDialog() {
  const [open, setOpen] = React.useState(false);
  const [cfg, setCfg] = React.useState<AllCfg>(() => loadUIDesignCfg());

  // Ensure FontCfg.color is never undefined for FontSection
  const asFont = (f: FontCfg): FontCfg => ({ size: f.size, bold: f.bold, color: f.color ?? '#111111' });

  React.useEffect(() => { applyUIDesignCSS(cfg); }, [cfg]);
  const update = <K extends keyof AllCfg>(k: K, v: AllCfg[K]) => setCfg(p => ({ ...p, [k]: v }));
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
          data-ui="ui-design-panel"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 overflow-hidden rounded-xl bg-white shadow-2xl border" style={{ width: '70vw', height: '70vh' }}>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
              <h2 className="text-lg font-bold">UI Design PopUp 2</h2>
            </div>
        {/* Tabs 래퍼 추가: 복원 쉬움. 현재는 List 탭만 노출 */}
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Play List</TabsTrigger>
            <TabsTrigger value="detail">Play Detail</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <div className="w-full h-[calc(70vh-56px-56px)] overflow-auto px-4 py-3">
              <div className="space-y-4">
                <div className="p-3 rounded-lg border">
                  <div className="font-semibold mb-2">상단 컨테이너 (미리보기)</div>
                  <BoxSection title="상단 컨테이너 속성" value={cfg.topHeaderBox} onChange={v=>update('topHeaderBox', v)} />
                  <div className="grid grid-cols-1 gap-3 mt-3">
                    <FontSection title="Title" value={asFont(cfg.title)} onChange={v=>update('title', v)} />
                    <FontSection title="이름·나이(NameBio)" value={asFont(cfg.namebio)} onChange={v=>update('namebio', v)} />
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
                    <SmallBoxSection title="Activity Row · 카드(상위 컨테이너)" value={cfg.activityBox} onChange={v=>update('activityBox', v)} />
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
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button className="px-3 py-2 rounded bg-black text-white" onClick={persist}>Update</button>
              <button className="px-3 py-2 border rounded" onClick={() => setOpen(false)}>닫기</button>
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
        <LabeledNumber label="Size" value={value.size} onChange={n=>onChange({ ...value, size: n })} />
        <LabeledCheckbox label="Bold" checked={value.bold} onChange={b=>onChange({ ...value, bold: b })} />
        <LabeledColor label="Color" value={value.color} onChange={c=>onChange({ ...value, color: c })} />
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
      <div className="grid grid-cols-6 gap-3 mb-2">
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
      <div className="grid grid-cols-6 gap-3 mb-2">
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
        <LabeledNumber label="Size" value={value.size} onChange={n=>onChange({ ...value, size: n })} />
        <LabeledCheckbox label="Bold" checked={value.bold} onChange={b=>onChange({ ...value, bold: b })} />
        <LabeledColor  label="Color" value={value.color} onChange={c=>onChange({ ...value, color: c })} />
        <LabeledColor  label="BG"    value={value.bg}    onChange={c=>onChange({ ...value, bg: c })} />
        <LabeledNumber label="BWidth" value={value.borderWidth} onChange={n=>onChange({ ...value, borderWidth: n })} />
        <LabeledColor  label="BColor" value={value.borderColor} onChange={c=>onChange({ ...value, borderColor: c })} />
        <LabeledColor  label="HoverBG" value={value.hoverBg} onChange={c=>onChange({ ...value, hoverBg: c })} />
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