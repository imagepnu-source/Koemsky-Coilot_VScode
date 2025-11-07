// lib/ui-design.ts
// Centralized UI design config + load/save/apply helpers.
//
// NOTE: This file is written to be **backward compatible** with existing saves.
// - Unknown/legacy keys are preserved when saving (we shallow-merge defaults).
// - Newly added keys for the "Play Detail" tab are given safe defaults.
//
// Public API used by components: FontCfg, DropdownCfg, AllCfg, asFont, normalizeDropdown,
// loadUIDesignCfg, saveUIDesignCfg, applyUIDesignCSS.

export type FontCfg = {
  size?: number
  family?: string
  bold?: boolean
  italic?: boolean
  color?: string
  lineHeight?: number | string
  [k: string]: any
}

export type DropdownCfg = {
  options: Array<{ value: string; label?: string }>
  value?: string | string[]
  multi?: boolean
  placeholder?: string
  [k: string]: any
}

/** Additional layout/config types used by dialog */
export type BoxCfg = { bg: string; padding: number; border: { width: number; color: string } }
export type SmallBoxCfg = { bg: string; borderWidth: number; borderColor: string; radius: number }

export type LevelBadgeCfg = {
  bg: string; borderWidth: number; borderColor: string; radius: number;
  height: number; paddingX: number; paddingY: number;
}
export type AgeBadgeCfg = {
  fontSize: number; bold: boolean; color: string;
  bg: string; borderWidth: number; borderColor: string; radius: number;
  height: number; paddingX: number; paddingY: number;
}

/** Detail (Play Detail) config */
export type DetailCfg = {
  detailSmallBox: SmallBoxCfg;
  detailTitle: FontCfg;
  detailBody: FontCfg;
  difficultyBox: SmallBoxCfg;
  difficultyText: FontCfg;
}

/** AllCfg: main config shape used by UIDesignDialog and apply helpers */
export type AllCfg = {
  // Header / top
  topHeaderBox: BoxCfg;
  title: FontCfg;
  namebio: FontCfg;
  devage: FontCfg;
  catag: { size: number; bold: boolean };
  dropdown: DropdownCfg;

  // List
  playListBox: BoxCfg;
  activityBox: SmallBoxCfg;
  levelBadgeBox: SmallBoxCfg;
  activity: FontCfg;
  levelBadge: LevelBadgeCfg;
  ageBadge: AgeBadgeCfg;

} & DetailCfg

const STORAGE_KEY = 'komensky_ui_design_v2'

// ---- defaults helpers ----
const font = (size: number, bold = false, color = '#111111'): FontCfg => ({ size, bold, color })
const box  = (bg = '#FFFFFF', padding = 12, bw = 1, bc = 'rgba(0,0,0,0.12)'): BoxCfg =>
  ({ bg, padding, border: { width: bw, color: bc } })
const sbox = (bg = '#FFFFFF', bw = 1, bc = 'rgba(0,0,0,0.12)', radius = 12): SmallBoxCfg =>
  ({ bg, borderWidth: bw, borderColor: bc, radius })

const defaults: AllCfg = {
  // header
  topHeaderBox: box(),
  title:   font(18, true),
  namebio: font(13, false, '#444444'),
  devage:  font(14, true,  '#0A66FF'),
  catag:   { size: 12, bold: true },
  dropdown: {
    options: [],
    value: undefined,
    multi: false,
    placeholder: '',
    size: 12, bold: false, color: '#111111',
    bg: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', hoverBg: '#F5F5F5',
  } as any,

  // list
  playListBox: box('#FFFFFF', 12, 1, 'rgba(0,0,0,0.12)'),
  activityBox: sbox('#FFFFFF', 1, 'rgba(0,0,0,0.12)', 12),
  levelBadgeBox: sbox('#FFFFFF', 1, 'rgba(0,0,0,0.12)', 12),
  activity: font(14, true, '#111111'),
  levelBadge: { bg: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', radius: 10, height: 20, paddingX: 6, paddingY: 2 },
  ageBadge:   { fontSize: 11, bold: false, color: '#111111', bg: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', radius: 8, height: 18, paddingX: 6, paddingY: 2 },

  // detail (new)
  detailSmallBox: sbox('#FFFFFF', 1, 'rgba(0,0,0,0.12)', 12),
  detailTitle: font(16, true, '#111111'),
  detailBody:  font(13, false, '#333333'),
  difficultyBox: sbox('#FFFFFF', 1, 'rgba(0,0,0,0.12)', 12),
  difficultyText: font(13, false, '#111111'),
}

// Shallow merge helper (preserves extra legacy keys)
function mergeDefaults<T extends Record<string, any>>(def: T, val: Partial<T> | undefined): T {
  const out: any = { ...def, ...(val || {}) }
  if (val?.border && 'border' in def) out.border = { ...def.border, ...val.border }
  if ('dropdown' in def && (val as any)?.dropdown) out.dropdown = { ...def.dropdown, ...(val as any).dropdown }
  return out
}

/** asFont: 다양한 입력값을 FontCfg로 정규화하는 안전한 헬퍼 */
export function asFont(v: any): FontCfg {
  if (!v || typeof v !== 'object') {
    return { size: 12, bold: false, color: '#000000' }
  }
  return {
    size: typeof v.size === 'number' ? v.size : Number(v?.size) || 12,
    family: typeof v.family === 'string' ? v.family : v?.fontFamily || undefined,
    bold: !!v.bold,
    italic: !!v.italic,
    color: typeof v.color === 'string' ? v.color : v?.hex || '#000000',
    lineHeight: v.lineHeight ?? v?.lh,
    ...v,
  }
}

/** 간단한 Dropdown 정규화(필요 시 확장) */
export function normalizeDropdown(v: any): DropdownCfg {
  if (!v) return { options: [] }
  if (Array.isArray(v)) return { options: v.map((o) => (typeof o === 'string' ? { value: o } : o)) }
  return v as DropdownCfg
}

export function loadUIDesignCfg(): AllCfg {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw)
    const merged: any = { ...defaults, ...(parsed || {}) }

    merged.topHeaderBox = mergeDefaults(defaults.topHeaderBox, parsed?.topHeaderBox)
    merged.playListBox  = mergeDefaults(defaults.playListBox,  parsed?.playListBox)
    merged.dropdown     = mergeDefaults(defaults.dropdown,     parsed?.dropdown)

    merged.activityBox   = { ...defaults.activityBox,   ...(parsed?.activityBox   || {}) }
    merged.levelBadgeBox = { ...defaults.levelBadgeBox, ...(parsed?.levelBadgeBox || {}) }
    merged.detailSmallBox = { ...defaults.detailSmallBox, ...(parsed?.detailSmallBox || {}) }
    merged.difficultyBox  = { ...defaults.difficultyBox,  ...(parsed?.difficultyBox  || {}) }

    merged.title        = { ...defaults.title,        ...(parsed?.title        || {}) }
    merged.namebio      = { ...defaults.namebio,      ...(parsed?.namebio      || {}) }
    merged.devage       = { ...defaults.devage,       ...(parsed?.devage       || {}) }
    merged.activity     = { ...defaults.activity,     ...(parsed?.activity     || {}) }
    merged.detailTitle  = { ...defaults.detailTitle,  ...(parsed?.detailTitle  || {}) }
    merged.detailBody   = { ...defaults.detailBody,   ...(parsed?.detailBody   || {}) }
    merged.difficultyText = { ...defaults.difficultyText, ...(parsed?.difficultyText || {}) }
    merged.levelBadge   = { ...defaults.levelBadge,   ...(parsed?.levelBadge   || {}) }
    merged.ageBadge     = { ...defaults.ageBadge,     ...(parsed?.ageBadge     || {}) }

    return merged as AllCfg
  } catch (e) {
    console.warn('[ui-design] load failed, using defaults:', e)
    return { ...defaults }
  }
}

export function saveUIDesignCfg(cfg: AllCfg) {
  try {
    const next = { ...defaults, ...(cfg as any) }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (e) {
    console.error('[ui-design] save failed:', e)
  }
}

export function buildVarsFromCfg(cfg: AllCfg): Record<string,string> {
  // 기존 vars 계산 로직을 이 함수로 이동
  const vars: Record<string,string> = {
    '--ui-title-size': cfg.title?.size ? String(cfg.title.size) : '',
    '--ui-title-color': cfg.title?.color ?? '',
    '--ui-top-header-bg': cfg.topHeaderBox?.bg ?? '',
    '--ui-top-header-padding': cfg.topHeaderBox?.padding != null ? String(cfg.topHeaderBox.padding) + 'px' : '',
    '--ui-top-header-border-width': cfg.topHeaderBox?.border?.width != null ? String(cfg.topHeaderBox.border.width) + 'px' : '',
    '--ui-top-header-border-color': cfg.topHeaderBox?.border?.color ?? '',
    '--ui-playlist-bg': cfg.playListBox?.bg ?? '',
    '--ui-playlist-padding': cfg.playListBox?.padding != null ? String(cfg.playListBox.padding) + 'px' : '',
    '--ui-playlist-border-width': cfg.playListBox?.border?.width != null ? String(cfg.playListBox.border.width) + 'px' : '',
    '--ui-playlist-border-color': cfg.playListBox?.border?.color ?? '',
    '--ui-name-age-weight': cfg.namebio?.bold ? '700' : '400',
    '--ui-name-age-color': cfg.namebio?.color ?? '',
    '--ui-list-bg': cfg.playListBox?.bg ?? '',
    '--ui-radius': cfg.detailSmallBox?.radius != null ? String(cfg.detailSmallBox.radius) + 'px' : '',
  }
  return vars
}

function injectVarsStyle(vars: Record<string,string>) {
  if (typeof document === 'undefined') return;
  const id = 'ui-design-vars';
  const rootCss = `:root{${Object.entries(vars).filter(([,v])=>v!=='').map(([k,v])=>`${k}:${v};`).join('')}}`;
  // 추가: 디자인 모드 스코프 규칙(우선순위 확보) - 최소화된 강제 규칙
  const forced = `
.ui-design-active [data-ui="play-list"], .ui-design-active .play-list-panel, .ui-design-active .play-list {
  box-sizing: border-box;
  background: var(--ui-playlist-bg) ;
  padding: var(--ui-playlist-padding) ;
  border: var(--ui-playlist-border-width) solid var(--ui-playlist-border-color) ;
}
`;
  const css = rootCss + '\n' + forced;
  let tag = document.getElementById(id) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = id;
    tag.appendChild(document.createTextNode(css));
    document.head && document.head.appendChild(tag);
  } else {
    if (tag.textContent !== css) tag.textContent = css;
  }
}

export function applyUIDesignCSS(cfg: AllCfg) {
  const vars = buildVarsFromCfg(cfg);
  // inject style tag (guarantees CSS sees vars)
  try { injectVarsStyle(vars); } catch {}
  // inline fallback for a small set of known candidates
  try {
    const playlistSel = ['[data-ui="play-list"]', '.play-list-panel', '.play-list', '.play-list-wrap'];
    for (const sel of playlistSel) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) continue;
      if (vars['--ui-playlist-bg']) el.style.background = vars['--ui-playlist-bg'];
      if (vars['--ui-playlist-padding']) el.style.padding = vars['--ui-playlist-padding'];
      if (vars['--ui-playlist-border-width'] || vars['--ui-playlist-border-color']) {
        const bw = vars['--ui-playlist-border-width'] || '0px';
        const bc = vars['--ui-playlist-border-color'] || 'transparent';
        el.style.border = `${bw} solid ${bc}`;
        el.style.boxSizing = 'border-box';
      }
    }
  } catch {}
}