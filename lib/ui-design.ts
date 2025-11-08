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
    '--ui-title-size': cfg.title?.size ? String(cfg.title.size) + 'px' : '',
    '--ui-title-weight': cfg.title?.bold ? '700' : '400',
    '--ui-title-color': cfg.title?.color ?? '',
    '--ui-top-header-bg': cfg.topHeaderBox?.bg ?? '',
    '--ui-top-header-padding': cfg.topHeaderBox?.padding != null ? String(cfg.topHeaderBox.padding) + 'px' : '',
    '--ui-top-header-border-width': cfg.topHeaderBox?.border?.width != null ? String(cfg.topHeaderBox.border.width) + 'px' : '',
    '--ui-top-header-border-color': cfg.topHeaderBox?.border?.color ?? '',
    '--ui-playlist-bg': cfg.playListBox?.bg ?? '',
    '--ui-playlist-padding': cfg.playListBox?.padding != null ? String(cfg.playListBox.padding) + 'px' : '',
    '--ui-playlist-border-width': cfg.playListBox?.border?.width != null ? String(cfg.playListBox.border.width) + 'px' : '',
    '--ui-playlist-border-color': cfg.playListBox?.border?.color ?? '',
    '--ui-name-size': cfg.namebio?.size != null ? String(cfg.namebio.size) + 'px' : '',
    '--ui-name-weight': cfg.namebio?.bold ? '700' : '400',
    '--ui-name-color': cfg.namebio?.color ?? '',
    '--ui-devage-size': cfg.devage?.size != null ? String(cfg.devage.size) + 'px' : '',
    '--ui-devage-weight': cfg.devage?.bold ? '700' : '400',
    '--ui-devage-color': cfg.devage?.color ?? '',
    '--ui-catag-size': cfg.catag?.size != null ? String(cfg.catag.size) + 'px' : '',
    '--ui-catag-weight': cfg.catag?.bold ? '700' : '400',

    // Activity / Badge variables (restore connections)
    '--ui-activity-size': cfg.activity?.size != null ? String(cfg.activity.size) + 'px' : '',
    '--ui-activity-weight': cfg.activity?.bold ? '700' : '400',
    '--ui-activity-color': cfg.activity?.color ?? '',
    '--ui-activity-box-bg': (cfg.activityBox as any)?.bg ?? '',
    '--ui-activity-box-border-width': String((cfg.activityBox as any)?.borderWidth ?? 0) + 'px',
    '--ui-activity-box-border-color': (cfg.activityBox as any)?.borderColor ?? '',

    // compatibility with play-list-panel usage (activity-card variables)
    '--ui-activity-card-pad-x': '12px',
    '--ui-activity-card-pad-y': '8px',
    '--ui-activity-card-bg': (cfg.activityBox as any)?.bg ?? '',
    '--ui-activity-card-border-width': String((cfg.activityBox as any)?.borderWidth ?? 0) + 'px',
    '--ui-activity-card-border-color': (cfg.activityBox as any)?.borderColor ?? '',
    '--ui-activity-card-radius': String((cfg.activityBox as any)?.radius ?? 0) + 'px',

    '--ui-levelbadge-bg': cfg.levelBadge?.bg ?? (cfg.levelBadgeBox?.bg ?? ''),
    '--ui-levelbadge-border-width': String(cfg.levelBadge?.borderWidth ?? (cfg.levelBadgeBox as any)?.borderWidth ?? 0) + 'px',
    '--ui-levelbadge-border-color': cfg.levelBadge?.borderColor ?? (cfg.levelBadgeBox as any)?.borderColor ?? '',
    '--ui-levelbadge-radius': cfg.levelBadge?.radius != null ? String(cfg.levelBadge.radius) + 'px' : '',
    '--ui-levelbadge-height': cfg.levelBadge?.height != null ? String(cfg.levelBadge.height) + 'px' : '',
    '--ui-levelbadge-paddingx': cfg.levelBadge?.paddingX != null ? String(cfg.levelBadge.paddingX) + 'px' : '',
    '--ui-levelbadge-paddingy': cfg.levelBadge?.paddingY != null ? String(cfg.levelBadge.paddingY) + 'px' : '',

    // Age badge container vars (missing before)
    '--ui-agebadge-bg': cfg.ageBadge?.bg ?? '',
    '--ui-agebadge-border-width': String(cfg.ageBadge?.borderWidth ?? 0) + 'px',
    '--ui-agebadge-border-color': cfg.ageBadge?.borderColor ?? '',
    '--ui-agebadge-radius': cfg.ageBadge?.radius != null ? String(cfg.ageBadge.radius) + 'px' : '',
    '--ui-agebadge-height': cfg.ageBadge?.height != null ? String(cfg.ageBadge.height) + 'px' : '',
    '--ui-agebadge-paddingx': cfg.ageBadge?.paddingX != null ? String(cfg.ageBadge.paddingX) + 'px' : '',
    '--ui-agebadge-paddingy': cfg.ageBadge?.paddingY != null ? String(cfg.ageBadge.paddingY) + 'px' : '',

    '--ui-age-size': cfg.ageBadge?.fontSize != null ? String(cfg.ageBadge.fontSize) + 'px' : '',
    '--ui-age-weight': cfg.ageBadge?.bold ? '700' : '400',
    '--ui-age-color': cfg.ageBadge?.color ?? '',

    '--ui-list-bg': cfg.playListBox?.bg ?? '',
    '--ui-radius': cfg.detailSmallBox?.radius != null ? String(cfg.detailSmallBox.radius) + 'px' : '',
  }
  return vars
}

function injectVarsStyle(vars: Record<string,string>) {
  if (typeof document === 'undefined') return;
  const id = 'ui-design-vars';
  const rootCss = `:root{${Object.entries(vars).filter(([,v])=>v!=='').map(([k,v])=>`${k}:${v};`).join('')}}`;

  // 스코프 규칙: 컨테이너 전용 규칙과 텍스트 전용 규칙을 분리(자손 전파 방지)
  const scoped = `
.ui-design-active [data-ui="top-header"] {
  background: var(--ui-top-header-bg, transparent);
  padding: var(--ui-top-header-padding, 12px);
  border-style: solid;
  border-width: var(--ui-top-header-border-width, 0px);
  border-color: var(--ui-top-header-border-color, rgba(0,0,0,0.12));
  box-sizing: border-box;
}

/* header text rules — 텍스트 노드에만 폰트 속성 적용 */
.ui-design-active [data-ui="top-header"] .title,
.ui-design-active [data-ui="top-header"] [data-ui="title"] {
  font-size: var(--ui-title-size, 18px);
  font-weight: var(--ui-title-weight, 700);
  color: var(--ui-title-color, #111111);
  line-height: 1.2;
}

.ui-design-active [data-ui="top-header"] [data-ui="namebio"],
.ui-design-active [data-ui="top-header"] .name {
  font-size: var(--ui-name-size, 13px);
  font-weight: var(--ui-name-weight, 400);
  color: var(--ui-name-color, #444444);
}

.ui-design-active [data-ui="top-header"] [data-ui="devage"],
.ui-design-active [data-ui="top-header"] .devage {
  font-size: var(--ui-devage-size, 14px);
  font-weight: var(--ui-devage-weight, 700);
  color: var(--ui-devage-color, #0A66FF);
}

.ui-design-active [data-ui="top-header"] [data-ui="catag"],
.ui-design-active [data-ui="top-header"] .catag {
  font-size: var(--ui-catag-size, 12px);
  font-weight: var(--ui-catag-weight, 700);
}

/* Activity box (container-only) */
.ui-design-active [data-ui="activity-box"],
.ui-design-active .activity-box {
  background: var(--ui-activity-box-bg, transparent);
  border: var(--ui-activity-box-border-width, 0px) solid var(--ui-activity-box-border-color, transparent);
  box-sizing: border-box;
}

/* Activity card / row (component uses --ui-activity-card-* vars) */
.ui-design-active [data-ui="activity-row"],
.ui-design-active .activity-row,
.ui-design-active [data-ui="activity-box"],
.ui-design-active .activity-box {
  background: var(--ui-activity-card-bg, var(--ui-activity-box-bg, transparent));
  padding-left: var(--ui-activity-card-pad-x, 12px);
  padding-right: var(--ui-activity-card-pad-x, 12px);
  padding-top: var(--ui-activity-card-pad-y, 8px);
  padding-bottom: var(--ui-activity-card-pad-y, 8px);
  border-style: solid;
  border-width: var(--ui-activity-card-border-width, var(--ui-activity-box-border-width, 0px));
  border-color: var(--ui-activity-card-border-color, var(--ui-activity-box-border-color, transparent));
  border-radius: var(--ui-activity-card-radius, 0px);
  box-sizing: border-box;
}

/* Activity inner text (num / title) */
.ui-design-active [data-ui="activity-num"],
.ui-design-active .activity-num,
.ui-design-active [data-ui="activity-title"],
.ui-design-active .activity-title,
.ui-design-active .activity,
.ui-design-active [data-ui="activity"] {
  font-size: var(--ui-activity-size, 14px);
  font-weight: var(--ui-activity-weight, 400);
  color: var(--ui-activity-color, #111111);
}

/* Level badge container & text */
.ui-design-active .level-badge,
.ui-design-active [data-ui="level-badge"] {
  background: var(--ui-levelbadge-bg, #fff);
  border: var(--ui-levelbadge-border-width, 0px) solid var(--ui-levelbadge-border-color, rgba(0,0,0,0.12));
  border-radius: var(--ui-levelbadge-radius, 10px);
  height: var(--ui-levelbadge-height, auto);
  /* 기본값을 activity-card 패딩으로 fallback 시켜 Activity와 간격 유사하게 만듦 */
  padding: var(--ui-levelbadge-paddingy, var(--ui-activity-card-pad-y, 8px)) var(--ui-levelbadge-paddingx, var(--ui-activity-card-pad-x, 12px));
  box-sizing: border-box;
}

/* Age badge container & text (mirror level badge behavior) */
.ui-design-active .age-badge,
.ui-design-active [data-ui="age-badge"] {
  background: var(--ui-agebadge-bg, #fff);
  border: var(--ui-agebadge-border-width, 0px) solid var(--ui-agebadge-border-color, rgba(0,0,0,0.12));
  border-radius: var(--ui-agebadge-radius, 8px);
  height: var(--ui-agebadge-height, auto);
  /* activity-card 패딩을 기본값으로 사용 */
  padding: var(--ui-agebadge-paddingy, var(--ui-activity-card-pad-y, 8px)) var(--ui-agebadge-paddingx, var(--ui-activity-card-pad-x, 12px));
  box-sizing: border-box;
}

/* Age badge text (kept for text-specific rules) */
.ui-design-active .age-badge,
.ui-design-active [data-ui="age-badge"] {
  font-size: var(--ui-age-size, 11px);
  font-weight: var(--ui-age-weight, 400);
  color: var(--ui-age-color, #111111);
}

/* playlist root only */
.ui-design-active .ui-design-playlist-root {
  background: var(--ui-playlist-bg, var(--ui-list-bg, transparent));
  padding: var(--ui-playlist-padding, 12px);
  border: var(--ui-playlist-border-width, 0px) solid var(--ui-playlist-border-color, rgba(0,0,0,0.12));
  border-radius: 0px;
  box-sizing: border-box;
}

/* 추가: 부모(.ui-design-activity-box)가 스타일링될 때 내부 activity-row의 테두리/그림자 제거 */
.ui-design-active .ui-design-activity-box {
  overflow: hidden !important;
}
.ui-design-active .ui-design-activity-box > [data-ui="activity-row"],
.ui-design-active .ui-design-activity-box > .activity-row,
.ui-design-active .ui-design-activity-box [data-ui="activity-row"],
.ui-design-active .ui-design-activity-box .activity-row {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  background: transparent !important;
  border-radius: 0 !important;
}

/* Color input / swatch sizing for UIDesign dialog */
/* Ensures hex text input and color-swatch have readable width */
.ui-design-active input[type="color"],
.ui-design-active .ui-color-swatch,
.ui-design-active .color-swatch {
  width: 28px !important;
  height: 24px !important;
  padding: 2px !important;
  vertical-align: middle !important;
  box-sizing: border-box !important;
}

/* PopUp 2 전용: color swatch를 세로 2배, 가로 1.5배로 확대 (우선순위 확보) */
.ui-design-active .ui-design-dialog-2 input[type="color"],
.ui-design-active .ui-design-dialog-2 .ui-color-swatch,
.ui-design-active .ui-design-dialog-2 .color-swatch {
  width: 48px !important;
  height: 48px !important;
  padding: 0 !important;
  vertical-align: middle !important;
  box-sizing: border-box !important;
}

.ui-design-active .ui-design-dialog-2 input[type="text"].ui-color-hex,
.ui-design-active .ui-design-dialog-2 input[data-ui="color-hex"],
.ui-design-active .ui-design-dialog-2 .ui-color-hex {
  width: 160px !important;
  min-width: 120px !important;
  padding: 6px 8px !important;
  box-sizing: border-box !important;
  height: 32px !important; /* 텍스트 입력 세로 정렬 보정 */
}

/* Color input / swatch sizing for UIDesign dialog */
/* Ensures hex text input and color-swatch have readable width */
.ui-design-active input[type="color"],
.ui-design-active .ui-color-swatch,
.ui-design-active .color-swatch {
  width: 28px !important;
  height: 24px !important;
  padding: 2px !important;
  vertical-align: middle !important;
  box-sizing: border-box !important;
}

/* PopUp 2 전용: color swatch를 세로 2배, 가로 1.5배로 확대 (우선순위 확보) */
.ui-design-active .ui-design-dialog-2 input[type="color"],
.ui-design-active .ui-design-dialog-2 .ui-color-swatch,
.ui-design-active .ui-design-dialog-2 .color-swatch {
  width: 48px !important;
  height: 48px !important;
  padding: 0 !important;
  vertical-align: middle !important;
  box-sizing: border-box !important;
}

.ui-design-active .ui-design-dialog-2 input[type="text"].ui-color-hex,
.ui-design-active .ui-design-dialog-2 input[data-ui="color-hex"],
.ui-design-active .ui-design-dialog-2 .ui-color-hex {
  width: 160px !important;
  min-width: 120px !important;
  padding: 6px 8px !important;
  box-sizing: border-box !important;
  height: 32px !important; /* 텍스트 입력 세로 정렬 보정 */
}
`;
  const css = rootCss + '\n' + scoped;
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

  // inline fallback: only apply to outermost matching playlist containers
  try {
    const vars2 = buildVarsFromCfg(cfg);
    const playlistSelectors = [
      '[data-ui="play-list-panel"]',
      '[data-ui="play-list"]',
      '.play-list-panel',
      '.play-list',
      '.play-list-wrap'
    ];
    const selector = playlistSelectors.join(',');
    // find all matching elements
    const allMatches = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    // keep only those that do NOT have an ancestor which also matches -> outermost roots
    const isAncestorInMatches = (el: HTMLElement) => {
      let p = el.parentElement;
      while (p) {
        if (allMatches.includes(p)) return true;
        p = p.parentElement;
      }
      return false
    };
    const roots = allMatches.filter(el => !isAncestorInMatches(el));

    // cleanup previous markers that are no longer roots
    const prevMarked = Array.from(document.querySelectorAll('.ui-design-playlist-root')) as HTMLElement[];
    for (const pm of prevMarked) {
      if (!roots.includes(pm)) {
        pm.classList.remove('ui-design-playlist-root');
        // remove inline styles we applied previously so inner elements aren't affected
        pm.style.removeProperty('background');
        pm.style.removeProperty('padding');
        pm.style.removeProperty('border');
        pm.style.removeProperty('border-radius');
        pm.style.removeProperty('box-sizing');
      }
    }

    // mark current roots and apply inline fallback only to them
    for (const el of roots) {
      el.classList.add('ui-design-playlist-root');
      if (vars2['--ui-playlist-bg']) el.style.setProperty('background', vars2['--ui-playlist-bg'], 'important');
      if (vars2['--ui-playlist-padding']) el.style.setProperty('padding', vars2['--ui-playlist-padding'], 'important');
      if (vars2['--ui-playlist-border-width'] || vars2['--ui-playlist-border-color']) {
        const bw = vars2['--ui-playlist-border-width'] || '0px';
        const bc = vars2['--ui-playlist-border-color'] || 'transparent';
        el.style.setProperty('border', `${bw} solid ${bc}`, 'important');
        el.style.setProperty('border-radius', '0px', 'important');
        el.style.boxSizing = 'border-box';
      }
    }

    // --- NEW: Inline apply for top header (bg / padding / border) + cleanup ---
    const headerSelector = '[data-ui="top-header"]';
    const prevHeaders = Array.from(document.querySelectorAll('.ui-design-top-header')) as HTMLElement[];
    const currHeaders = Array.from(document.querySelectorAll(headerSelector)) as HTMLElement[];

    // cleanup headers that are no longer current
    for (const ph of prevHeaders) {
      if (!currHeaders.includes(ph)) {
        ph.classList.remove('ui-design-top-header');
        ph.style.removeProperty('background');
        ph.style.removeProperty('padding');
        ph.style.removeProperty('border');
        ph.style.removeProperty('box-sizing');

        // remove inline font styles we may have applied to heading text
        try {
          const tsel = '[data-ui="title"], .title';
          const nsel = '[data-ui="namebio"], .name';
          const dsel = '[data-ui="devage"], .devage';
          const csel = '[data-ui="catag"], .catag';
          const txtEls = Array.from(ph.querySelectorAll(`${tsel},${nsel},${dsel},${csel}`)) as HTMLElement[];
          for (const te of txtEls) {
            te.classList.remove('ui-design-top-text');
            te.style.removeProperty('font-size');
            te.style.removeProperty('font-weight');
            te.style.removeProperty('color');
          }
        } catch (e) {}
      }
    }

    // apply inline styles to current top-header elements
    for (const h of currHeaders) {
      h.classList.add('ui-design-top-header');
      if (vars2['--ui-top-header-bg']) h.style.setProperty('background', vars2['--ui-top-header-bg'], 'important');
      if (vars2['--ui-top-header-padding']) h.style.setProperty('padding', vars2['--ui-top-header-padding'], 'important');
      const bw = vars2['--ui-top-header-border-width'] || '0px';
      const bc = vars2['--ui-top-header-border-color'] || 'transparent';
      // use single-border fallback (keeps layout predictable)
      h.style.setProperty('border', `${bw} solid ${bc}`, 'important');
      h.style.boxSizing = 'border-box';

      // Inline-apply font styles to title / namebio / devage / catag so they persist
      try {
        const titleEls = Array.from(h.querySelectorAll('[data-ui="title"], .title')) as HTMLElement[];
        for (const te of titleEls) {
          te.classList.add('ui-design-top-text');
          if (vars2['--ui-title-size']) te.style.setProperty('font-size', vars2['--ui-title-size'], 'important');
          if (vars2['--ui-title-weight']) te.style.setProperty('font-weight', vars2['--ui-title-weight'], 'important');
          if (vars2['--ui-title-color']) te.style.setProperty('color', vars2['--ui-title-color'], 'important');
        }
        const nameEls = Array.from(h.querySelectorAll('[data-ui="namebio"], .name')) as HTMLElement[];
        for (const ne of nameEls) {
          ne.classList.add('ui-design-top-text');
          if (vars2['--ui-name-size']) ne.style.setProperty('font-size', vars2['--ui-name-size'], 'important');
          if (vars2['--ui-name-weight']) ne.style.setProperty('font-weight', vars2['--ui-name-weight'], 'important');
          if (vars2['--ui-name-color']) ne.style.setProperty('color', vars2['--ui-name-color'], 'important');
        }
        const devEls = Array.from(h.querySelectorAll('[data-ui="devage"], .devage')) as HTMLElement[];
        for (const de of devEls) {
          de.classList.add('ui-design-top-text');
          if (vars2['--ui-devage-size']) de.style.setProperty('font-size', vars2['--ui-devage-size'], 'important');
          if (vars2['--ui-devage-weight']) de.style.setProperty('font-weight', vars2['--ui-devage-weight'], 'important');
          if (vars2['--ui-devage-color']) de.style.setProperty('color', vars2['--ui-devage-color'], 'important');
        }
        const catEls = Array.from(h.querySelectorAll('[data-ui="catag"], .catag')) as HTMLElement[];
        for (const ce of catEls) {
          ce.classList.add('ui-design-top-text');
          if (vars2['--ui-catag-size']) ce.style.setProperty('font-size', vars2['--ui-catag-size'], 'important');
          if (vars2['--ui-catag-weight']) ce.style.setProperty('font-weight', vars2['--ui-catag-weight'], 'important');
          if (vars2['--ui-catag-color']) ce.style.setProperty('color', vars2['--ui-catag-color'], 'important');
        }
      } catch (e) {}
    }

    // --- NEW: Inline apply for Activity / Level / Age (container & text) ---
    // expanded selector lists to cover observed DOM variants (data-ui names + class names)
    const actSel = [
      '[data-ui="activity-box"]',
      '[data-ui="activityBox"]',
      '[data-ui="activity-row"]', // play-list-panel uses activity-row inside button
      '.activity-box',
      '.activity-row',
      '.play-item',
      '.play-list-item',
      '.card',
      '.list-item'
    ].join(',');

    const lvlSel = [
      '[data-ui="level-badge"]',
      '.level-badge',
      '[data-ui="levelBadge"]',
      '.levelBadge',
      '.badge-level'
    ].join(',');

    const ageSel = [
      '[data-ui="age-badge"]',
      '.age-badge',
      '[data-ui="ageBadge"]',
      '.ageBadge'
    ].join(',');

    const prevActs = Array.from(document.querySelectorAll('.ui-design-activity-box')) as HTMLElement[];
    const currActs = Array.from(document.querySelectorAll(actSel)) as HTMLElement[];

    const prevLvls = Array.from(document.querySelectorAll('.ui-design-level-badge')) as HTMLElement[];
    const currLvls = Array.from(document.querySelectorAll(lvlSel)) as HTMLElement[];

    const prevAges = Array.from(document.querySelectorAll('.ui-design-age-badge')) as HTMLElement[];
    const currAges = Array.from(document.querySelectorAll(ageSel)) as HTMLElement[];

    try { console.debug('[ui-design] matched counts:', { acts: currActs.length, lvls: currLvls.length, ages: currAges.length }); } catch {}

    // cleanup & apply Activity box
    for (const pa of prevActs) {
      if (!currActs.includes(pa)) {
        pa.classList.remove('ui-design-activity-box');
        pa.style.removeProperty('background');
        pa.style.removeProperty('border');
        pa.style.removeProperty('box-sizing');
        pa.style.removeProperty('padding');
        pa.style.removeProperty('border-radius');
      }
    }
    for (const a of currActs) {
      // prefer styling the clickable button wrapper when activity-row is inside a button
      const target = (a.tagName === 'DIV' && a.parentElement && a.parentElement.tagName === 'BUTTON') ? a.parentElement as HTMLElement : a;
      target.classList.add('ui-design-activity-box');

      // apply container styles to the chosen target (button or the element itself)
      if (vars2['--ui-activity-card-bg']) target.style.setProperty('background', vars2['--ui-activity-card-bg'], 'important');
      if (vars2['--ui-activity-card-pad-x']) {
        target.style.setProperty('padding-left', vars2['--ui-activity-card-pad-x'], 'important');
        target.style.setProperty('padding-right', vars2['--ui-activity-card-pad-x'], 'important');
      }
      if (vars2['--ui-activity-card-pad-y']) {
        target.style.setProperty('padding-top', vars2['--ui-activity-card-pad-y'], 'important');
        target.style.setProperty('padding-bottom', vars2['--ui-activity-card-pad-y'], 'important');
      }
      const abw = vars2['--ui-activity-card-border-width'] || vars2['--ui-activity-box-border-width'] || '0px';
      const abc = vars2['--ui-activity-card-border-color'] || vars2['--ui-activity-box-border-color'] || 'transparent';
      target.style.setProperty('border', `${abw} solid ${abc}`, 'important');
      if (vars2['--ui-activity-card-radius']) target.style.setProperty('border-radius', vars2['--ui-activity-card-radius'], 'important');
      target.style.boxSizing = 'border-box';

      // If we styled the parent button, remove/override inner div's decorations so only one border is visible
      if (target !== a) {
        try {
          const inner = a as HTMLElement;
          // 강제 덮어쓰기: 스타일시트 규칙을 덮어써서 이중 테두리/그림자 제거
          inner.style.setProperty('border', 'none', 'important');
          inner.style.setProperty('box-shadow', 'none', 'important');
          inner.style.setProperty('outline', 'none', 'important');
          inner.style.setProperty('border-radius', '0px', 'important');
          inner.style.setProperty('background', 'transparent', 'important');
          inner.style.setProperty('padding', '0px', 'important');
          inner.style.setProperty('box-sizing', 'border-box', 'important');
          // 부모가 반경으로 잘리는지 보장
          try { target.style.setProperty('overflow', 'hidden', 'important'); } catch {}
        } catch {}
      }

      // Ensure activity text (num / title / activity) receives font inline styles for immediate effect
      const textSel = [
        '[data-ui="activity-num"]', '.activity-num',
        '[data-ui="activity-title"]', '.activity-title',
        '[data-ui="activity"]', '.activity'
      ].join(',');
      const textContainer = target === a ? a : a; // ensure we query inside the original activity element (a)
      const textEls = Array.from((textContainer as HTMLElement).querySelectorAll(textSel)) as HTMLElement[];
      for (const te of textEls) {
        if (vars2['--ui-activity-size']) te.style.setProperty('font-size', vars2['--ui-activity-size'], 'important');
        if (vars2['--ui-activity-weight']) te.style.setProperty('font-weight', vars2['--ui-activity-weight'], 'important');
        if (vars2['--ui-activity-color']) te.style.setProperty('color', vars2['--ui-activity-color'], 'important');
      }
      // also try applying to target itself in case text is direct childless text (fallback)
      if (textEls.length === 0) {
        try {
          if (vars2['--ui-activity-size']) (a as HTMLElement).style.setProperty('font-size', vars2['--ui-activity-size'], 'important');
          if (vars2['--ui-activity-weight']) (a as HTMLElement).style.setProperty('font-weight', vars2['--ui-activity-weight'], 'important');
          if (vars2['--ui-activity-color']) (a as HTMLElement).style.setProperty('color', vars2['--ui-activity-color'], 'important');
        } catch {}
      }
    }

    // cleanup & apply Level badge
    for (const pl of prevLvls) {
      if (!currLvls.includes(pl)) {
        pl.classList.remove('ui-design-level-badge');
        pl.style.removeProperty('background');
        pl.style.removeProperty('border');
        pl.style.removeProperty('border-radius');
        pl.style.removeProperty('height');
        pl.style.removeProperty('padding');
        pl.style.removeProperty('box-sizing');
      }
    }
    for (const l of currLvls) {
      l.classList.add('ui-design-level-badge');
      if (vars2['--ui-levelbadge-bg']) l.style.setProperty('background', vars2['--ui-levelbadge-bg'], 'important');
      const lbw = vars2['--ui-levelbadge-border-width'] || '0px';
      const lbc = vars2['--ui-levelbadge-border-color'] || 'transparent';
      l.style.setProperty('border', `${lbw} solid ${lbc}`, 'important');
      if (vars2['--ui-levelbadge-radius']) l.style.setProperty('border-radius', vars2['--ui-levelbadge-radius'], 'important');
      if (vars2['--ui-levelbadge-height']) l.style.setProperty('height', vars2['--ui-levelbadge-height'], 'important');

      // 패딩이 비어있으면 activity-card 패딩으로 fallback (세로 여백을 Activity와 유사하게)
      const py = vars2['--ui-levelbadge-paddingy'] || vars2['--ui-activity-card-pad-y'] || '8px';
      const px = vars2['--ui-levelbadge-paddingx'] || vars2['--ui-activity-card-pad-x'] || '12px';
      l.style.setProperty('padding', `${py} ${px}`, 'important');

      l.style.boxSizing = 'border-box';
    }

    // cleanup & apply Age text
    for (const pa of prevAges) {
      if (!currAges.includes(pa)) {
        pa.classList.remove('ui-design-age-badge');
        pa.style.removeProperty('font-size');
        pa.style.removeProperty('font-weight');
        pa.style.removeProperty('color');
        // cleanup container props we may have applied
        pa.style.removeProperty('background');
        pa.style.removeProperty('border');
        pa.style.removeProperty('border-radius');
        pa.style.removeProperty('height');
        pa.style.removeProperty('padding');
        pa.style.removeProperty('box-sizing');
      }
    }
    for (const ag of currAges) {
      ag.classList.add('ui-design-age-badge');
      if (vars2['--ui-age-size']) ag.style.setProperty('font-size', vars2['--ui-age-size'], 'important');
      if (vars2['--ui-age-weight']) ag.style.setProperty('font-weight', vars2['--ui-age-weight'], 'important');
      if (vars2['--ui-age-color']) ag.style.setProperty('color', vars2['--ui-age-color'], 'important');

      // Apply age-badge container props (mirror level-badge behavior)
      if (vars2['--ui-agebadge-bg']) ag.style.setProperty('background', vars2['--ui-agebadge-bg'], 'important');
      const abw = vars2['--ui-agebadge-border-width'] || '0px';
      const abc = vars2['--ui-agebadge-border-color'] || 'transparent';
      ag.style.setProperty('border', `${abw} solid ${abc}`, 'important');
      if (vars2['--ui-agebadge-radius']) ag.style.setProperty('border-radius', vars2['--ui-agebadge-radius'], 'important');
      if (vars2['--ui-agebadge-height']) ag.style.setProperty('height', vars2['--ui-agebadge-height'], 'important');

      const apy = vars2['--ui-agebadge-paddingy'] || vars2['--ui-activity-card-pad-y'] || '8px';
      const apx = vars2['--ui-agebadge-paddingx'] || vars2['--ui-activity-card-pad-x'] || '12px';
      ag.style.setProperty('padding', `${apy} ${apx}`, 'important');

      ag.style.boxSizing = 'border-box';
    }

  } catch (e) {
    console.warn('[ui-design] inline playlist apply failed', e);
  }
}

// Auto-apply saved UI design on initial page load so saved settings persist after reload
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const savedCfg = loadUIDesignCfg();
      // apply CSS rules and inline fallbacks
      try { applyUIDesignCSS(savedCfg); } catch (e) { console.warn('[ui-design] auto apply failed', e); }
      // ensure scoped styles remain active
      try { document.documentElement.classList.add('ui-design-active'); } catch {}
    }
  } catch (e) {
    console.warn('[ui-design] auto-apply check failed', e);
  }
}