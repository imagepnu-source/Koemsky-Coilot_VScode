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
  indent?: number  // 들여쓰기 (px)
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
  fontSize: number; bold: boolean;
  bg: string; borderWidth: number; borderColor: string; radius: number;
  height: number; paddingX: number; paddingY: number;
}
export type AgeBadgeCfg = {
  fontSize: number; bold: boolean; color: string;
  bg: string; borderWidth: number; borderColor: string; radius: number;
  height: number; paddingX: number; paddingY: number;
  width: number; // 고정 폭
}

export type CheckboxCfg = {
  size: number;              // 체크박스 크기
  bg: string;                // 기본 배경색
  borderWidth: number;       // 테두리 두께
  borderColor: string;       // 테두리 색상
  borderColorChecked: string; // 체크된 테두리 색상
  checkmarkColor: string;    // 체크 마크 색상
  gap: number;               // 라벨 간격
}

export type ButtonCfg = {
  fontSize: number;
  bold: boolean;
  color: string;
  bg: string;
  hoverBg: string;
  borderWidth: number;
  borderColor: string;
  radius: number;
  paddingX: number;
  paddingY: number;
}

/** Detail (Play Detail) config */
export type DetailCfg = {
  detailPanelBox: SmallBoxCfg;   // 최상위 패널
  detailHeaderBox: SmallBoxCfg;  // 헤더 컨테이너
  detailHeaderTitle: FontCfg;    // 헤더 제목 (1. 배 깔기 탐험 놀이)
  detailHeaderListBtn: ButtonCfg; // 목록 버튼
  detailHeaderPrevBtn: ButtonCfg; // 이전 버튼
  detailHeaderNextBtn: ButtonCfg; // 다음 버튼
  detailSmallBox: SmallBoxCfg;   // 섹션 박스 (일반/난이도/안전 공통)
  detailTitle: FontCfg;          // 섹션 제목 (일반/난이도/안전 공통)
  detailBody: FontCfg;           // 섹션 본문 (일반/난이도/안전 공통)
  difficultyCheckbox: CheckboxCfg; // 난이도 체크박스
  safetySmallBox: SmallBoxCfg;   // 안전 주의 컨테이너
  safetyTitle: FontCfg;          // 안전 주의 제목
  safetyBody: FontCfg;           // 안전 주의 본문
}

/** AllCfg: main config shape used by UIDesignDialog and apply helpers */
export type AllCfg = {
  // Header / top
  topHeaderBox: BoxCfg;
  title: FontCfg;
  namebio: FontCfg;
  devage: FontCfg;
  catag: { size: number; bold: boolean; color?: string };
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
  catag:   { size: 12, bold: true, color: '#111111' },
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
  levelBadge: { fontSize: 12, bold: false, bg: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', radius: 10, height: 20, paddingX: 6, paddingY: 2 },
  ageBadge:   { fontSize: 11, bold: false, color: '#111111', bg: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', radius: 8, height: 18, paddingX: 6, paddingY: 2, width: 80 },

  // detail (new)
  detailPanelBox: sbox('#FFFFFF', 1, 'rgba(0,0,0,0.12)', 12),
  detailHeaderBox: sbox('#F9FAFB', 0, 'transparent', 8),
  detailHeaderTitle: font(14, true, '#111111'),
  detailHeaderListBtn: { fontSize: 12, bold: true, color: '#111111', bg: 'transparent', hoverBg: 'rgba(0,0,0,0.05)', borderWidth: 0, borderColor: 'transparent', radius: 6, paddingX: 12, paddingY: 6 },
  detailHeaderPrevBtn: { fontSize: 12, bold: true, color: '#111111', bg: 'transparent', hoverBg: 'rgba(0,0,0,0.05)', borderWidth: 0, borderColor: 'transparent', radius: 6, paddingX: 12, paddingY: 6 },
  detailHeaderNextBtn: { fontSize: 12, bold: true, color: '#111111', bg: 'transparent', hoverBg: 'rgba(0,0,0,0.05)', borderWidth: 0, borderColor: 'transparent', radius: 6, paddingX: 12, paddingY: 6 },
  detailSmallBox: sbox('#FFFFFF', 1, 'rgba(0,0,0,0.12)', 12),
  detailTitle: { size: 16, bold: true, color: '#111111', indent: 0 },
  detailBody:  { size: 13, bold: false, color: '#333333', indent: 10 },
  difficultyCheckbox: { size: 20, bg: '#FFFFFF', borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)', borderColorChecked: '#0A66FF', checkmarkColor: '#0A66FF', gap: 8 },
  safetySmallBox: sbox('#FFF9E6', 1, '#FFD700', 12),
  safetyTitle: { size: 16, bold: true, color: '#D97706', indent: 0 },
  safetyBody: { size: 13, bold: false, color: '#92400E', indent: 10 },
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
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...defaults }
  }

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
    merged.detailHeaderBox = { ...defaults.detailHeaderBox, ...(parsed?.detailHeaderBox || {}) }
    merged.safetySmallBox = { ...defaults.safetySmallBox, ...(parsed?.safetySmallBox || {}) }

    merged.title        = { ...defaults.title,        ...(parsed?.title        || {}) }
    merged.namebio      = { ...defaults.namebio,      ...(parsed?.namebio      || {}) }
    merged.devage       = { ...defaults.devage,       ...(parsed?.devage       || {}) }
    merged.activity     = { ...defaults.activity,     ...(parsed?.activity     || {}) }
    merged.detailHeaderTitle = { ...defaults.detailHeaderTitle, ...(parsed?.detailHeaderTitle || {}) }
    merged.detailTitle  = { ...defaults.detailTitle,  ...(parsed?.detailTitle  || {}) }
    merged.detailBody   = { ...defaults.detailBody,   ...(parsed?.detailBody   || {}) }
    merged.safetyTitle  = { ...defaults.safetyTitle,  ...(parsed?.safetyTitle  || {}) }
    merged.safetyBody   = { ...defaults.safetyBody,   ...(parsed?.safetyBody   || {}) }
    merged.difficultyCheckbox = { ...defaults.difficultyCheckbox, ...(parsed?.difficultyCheckbox || {}) }
    merged.detailHeaderListBtn = { ...defaults.detailHeaderListBtn, ...(parsed?.detailHeaderListBtn || {}) }
    merged.detailHeaderPrevBtn = { ...defaults.detailHeaderPrevBtn, ...(parsed?.detailHeaderPrevBtn || {}) }
    merged.detailHeaderNextBtn = { ...defaults.detailHeaderNextBtn, ...(parsed?.detailHeaderNextBtn || {}) }
    merged.levelBadge   = { ...defaults.levelBadge,   ...(parsed?.levelBadge   || {}) }
    merged.ageBadge     = { ...defaults.ageBadge,     ...(parsed?.ageBadge     || {}) }

    return merged as AllCfg
  } catch (e) {
    console.warn('[ui-design] load failed, using defaults:', e)
    return { ...defaults }
  }
}

export function saveUIDesignCfg(cfg: AllCfg) {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return
  }

  try {
    const next = { ...defaults, ...(cfg as any) }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (e) {
    console.error('[ui-design] save failed:', e)
  }
}

export function applyUIDesignCSS(cfg: AllCfg) {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const r = document.documentElement
  const set = (k: string, v: string | number) => r.style.setProperty(k, String(v))

  // Top Header Box
  set('--kp-top-header-bg', String(cfg.topHeaderBox?.bg ?? defaults.topHeaderBox.bg))
  set('--kp-top-header-padding', (cfg.topHeaderBox?.padding ?? defaults.topHeaderBox.padding) + 'px')
  set('--kp-top-header-border-width', (cfg.topHeaderBox?.border?.width ?? defaults.topHeaderBox.border.width) + 'px')
  set('--kp-top-header-border-color', String(cfg.topHeaderBox?.border?.color ?? defaults.topHeaderBox.border.color))

  // Header
  set('--kp-title-size', (cfg.title?.size ?? defaults.title.size) + 'px')
  set('--kp-title-weight', (cfg.title?.bold ? '700' : '400'))
  set('--kp-title-color', String(cfg.title?.color ?? defaults.title.color))

  set('--kp-namebio-size', (cfg.namebio?.size ?? defaults.namebio.size) + 'px')
  set('--kp-namebio-weight', (cfg.namebio?.bold ? '700' : '400'))
  set('--kp-namebio-color', String(cfg.namebio?.color ?? defaults.namebio.color))

  set('--kp-devage-size', (cfg.devage?.size ?? defaults.devage.size) + 'px')
  set('--kp-devage-weight', (cfg.devage?.bold ? '700' : '400'))
  set('--kp-devage-color', String(cfg.devage?.color ?? defaults.devage.color))

  set('--kp-catag-size', (cfg.catag?.size ?? defaults.catag.size) + 'px')
  set('--kp-catag-weight', (cfg.catag?.bold ? '700' : '400'))
  set('--kp-catag-color', String(cfg.catag?.color ?? defaults.catag.color ?? '#111111'))

  // Play List Box
  set('--kp-play-list-bg', String(cfg.playListBox?.bg ?? defaults.playListBox.bg))
  set('--kp-play-list-padding', (cfg.playListBox?.padding ?? defaults.playListBox.padding) + 'px')
  set('--kp-play-list-border-width', (cfg.playListBox?.border?.width ?? defaults.playListBox.border.width) + 'px')
  set('--kp-play-list-border-color', String(cfg.playListBox?.border?.color ?? defaults.playListBox.border.color))

  // Activity Box (small box)
  set('--kp-activity-box-bg', String(cfg.activityBox?.bg ?? defaults.activityBox.bg))
  set('--kp-activity-box-border-width', (cfg.activityBox?.borderWidth ?? defaults.activityBox.borderWidth) + 'px')
  set('--kp-activity-box-border-color', String(cfg.activityBox?.borderColor ?? defaults.activityBox.borderColor))
  set('--kp-activity-box-radius', (cfg.activityBox?.radius ?? defaults.activityBox.radius) + 'px')

  // List row text
  set('--kp-activity-size', (cfg.activity?.size ?? defaults.activity.size) + 'px')
  set('--kp-activity-weight', (cfg.activity?.bold ? '700' : '400'))
  set('--kp-activity-color', String(cfg.activity?.color ?? defaults.activity.color))

  // Level Badge
  set('--kp-level-badge-font-size', (cfg.levelBadge?.fontSize ?? defaults.levelBadge.fontSize) + 'px')
  set('--kp-level-badge-weight', cfg.levelBadge?.bold ? '700' : '400')
  set('--kp-level-badge-bg', String(cfg.levelBadge?.bg ?? defaults.levelBadge.bg))
  set('--kp-level-badge-border-width', (cfg.levelBadge?.borderWidth ?? defaults.levelBadge.borderWidth) + 'px')
  set('--kp-level-badge-border-color', String(cfg.levelBadge?.borderColor ?? defaults.levelBadge.borderColor))
  set('--kp-level-badge-radius', (cfg.levelBadge?.radius ?? defaults.levelBadge.radius) + 'px')
  set('--kp-level-badge-height', (cfg.levelBadge?.height ?? defaults.levelBadge.height) + 'px')
  set('--kp-level-badge-padding', `${cfg.levelBadge?.paddingY ?? defaults.levelBadge.paddingY}px ${cfg.levelBadge?.paddingX ?? defaults.levelBadge.paddingX}px`)

  // Age Badge
  set('--kp-age-badge-font-size', (cfg.ageBadge?.fontSize ?? defaults.ageBadge.fontSize) + 'px')
  set('--kp-age-badge-weight', cfg.ageBadge?.bold ? '700' : '400')
  set('--kp-age-badge-color', String(cfg.ageBadge?.color ?? defaults.ageBadge.color))
  set('--kp-age-badge-bg', String(cfg.ageBadge?.bg ?? defaults.ageBadge.bg))
  set('--kp-age-badge-border-width', (cfg.ageBadge?.borderWidth ?? defaults.ageBadge.borderWidth) + 'px')
  set('--kp-age-badge-border-color', String(cfg.ageBadge?.borderColor ?? defaults.ageBadge.borderColor))
  set('--kp-age-badge-radius', (cfg.ageBadge?.radius ?? defaults.ageBadge.radius) + 'px')
  set('--kp-age-badge-height', (cfg.ageBadge?.height ?? defaults.ageBadge.height) + 'px')
  set('--kp-age-badge-padding', `${cfg.ageBadge?.paddingY ?? defaults.ageBadge.paddingY}px ${cfg.ageBadge?.paddingX ?? defaults.ageBadge.paddingX}px`)
  set('--kp-age-badge-width', (cfg.ageBadge?.width ?? defaults.ageBadge.width) + 'px')

  // Detail Panel (최상위 컨테이너)
  set('--kp-detail-panel-bg', String(cfg.detailPanelBox?.bg ?? defaults.detailPanelBox.bg))
  set('--kp-detail-panel-border-width', (cfg.detailPanelBox?.borderWidth ?? defaults.detailPanelBox.borderWidth) + 'px')
  set('--kp-detail-panel-border-color', String(cfg.detailPanelBox?.borderColor ?? defaults.detailPanelBox.borderColor))
  set('--kp-detail-panel-radius', (cfg.detailPanelBox?.radius ?? defaults.detailPanelBox.radius) + 'px')

  // Detail Header Box
  set('--kp-detail-header-bg', String(cfg.detailHeaderBox?.bg ?? defaults.detailHeaderBox.bg))
  set('--kp-detail-header-border-width', (cfg.detailHeaderBox?.borderWidth ?? defaults.detailHeaderBox.borderWidth) + 'px')
  set('--kp-detail-header-border-color', String(cfg.detailHeaderBox?.borderColor ?? defaults.detailHeaderBox.borderColor))
  set('--kp-detail-header-radius', (cfg.detailHeaderBox?.radius ?? defaults.detailHeaderBox.radius) + 'px')

  // Detail Header Title
  set('--kp-detail-header-title-size', (cfg.detailHeaderTitle?.size ?? defaults.detailHeaderTitle.size) + 'px')
  set('--kp-detail-header-title-weight', (cfg.detailHeaderTitle?.bold ? '700' : '400'))
  set('--kp-detail-header-title-color', String(cfg.detailHeaderTitle?.color ?? defaults.detailHeaderTitle.color))

  // Detail Header List Button
  set('--kp-detail-header-list-btn-font-size', (cfg.detailHeaderListBtn?.fontSize ?? defaults.detailHeaderListBtn.fontSize) + 'px')
  set('--kp-detail-header-list-btn-weight', (cfg.detailHeaderListBtn?.bold ? '700' : '400'))
  set('--kp-detail-header-list-btn-color', String(cfg.detailHeaderListBtn?.color ?? defaults.detailHeaderListBtn.color))
  set('--kp-detail-header-list-btn-bg', String(cfg.detailHeaderListBtn?.bg ?? defaults.detailHeaderListBtn.bg))
  set('--kp-detail-header-list-btn-hover-bg', String(cfg.detailHeaderListBtn?.hoverBg ?? defaults.detailHeaderListBtn.hoverBg))
  set('--kp-detail-header-list-btn-border-width', (cfg.detailHeaderListBtn?.borderWidth ?? defaults.detailHeaderListBtn.borderWidth) + 'px')
  set('--kp-detail-header-list-btn-border-color', String(cfg.detailHeaderListBtn?.borderColor ?? defaults.detailHeaderListBtn.borderColor))
  set('--kp-detail-header-list-btn-radius', (cfg.detailHeaderListBtn?.radius ?? defaults.detailHeaderListBtn.radius) + 'px')
  set('--kp-detail-header-list-btn-padding', `${cfg.detailHeaderListBtn?.paddingY ?? defaults.detailHeaderListBtn.paddingY}px ${cfg.detailHeaderListBtn?.paddingX ?? defaults.detailHeaderListBtn.paddingX}px`)

  // Detail Header Prev Button
  set('--kp-detail-header-prev-btn-font-size', (cfg.detailHeaderPrevBtn?.fontSize ?? defaults.detailHeaderPrevBtn.fontSize) + 'px')
  set('--kp-detail-header-prev-btn-weight', (cfg.detailHeaderPrevBtn?.bold ? '700' : '400'))
  set('--kp-detail-header-prev-btn-color', String(cfg.detailHeaderPrevBtn?.color ?? defaults.detailHeaderPrevBtn.color))
  set('--kp-detail-header-prev-btn-bg', String(cfg.detailHeaderPrevBtn?.bg ?? defaults.detailHeaderPrevBtn.bg))
  set('--kp-detail-header-prev-btn-hover-bg', String(cfg.detailHeaderPrevBtn?.hoverBg ?? defaults.detailHeaderPrevBtn.hoverBg))
  set('--kp-detail-header-prev-btn-border-width', (cfg.detailHeaderPrevBtn?.borderWidth ?? defaults.detailHeaderPrevBtn.borderWidth) + 'px')
  set('--kp-detail-header-prev-btn-border-color', String(cfg.detailHeaderPrevBtn?.borderColor ?? defaults.detailHeaderPrevBtn.borderColor))
  set('--kp-detail-header-prev-btn-radius', (cfg.detailHeaderPrevBtn?.radius ?? defaults.detailHeaderPrevBtn.radius) + 'px')
  set('--kp-detail-header-prev-btn-padding', `${cfg.detailHeaderPrevBtn?.paddingY ?? defaults.detailHeaderPrevBtn.paddingY}px ${cfg.detailHeaderPrevBtn?.paddingX ?? defaults.detailHeaderPrevBtn.paddingX}px`)

  // Detail Header Next Button
  set('--kp-detail-header-next-btn-font-size', (cfg.detailHeaderNextBtn?.fontSize ?? defaults.detailHeaderNextBtn.fontSize) + 'px')
  set('--kp-detail-header-next-btn-weight', (cfg.detailHeaderNextBtn?.bold ? '700' : '400'))
  set('--kp-detail-header-next-btn-color', String(cfg.detailHeaderNextBtn?.color ?? defaults.detailHeaderNextBtn.color))
  set('--kp-detail-header-next-btn-bg', String(cfg.detailHeaderNextBtn?.bg ?? defaults.detailHeaderNextBtn.bg))
  set('--kp-detail-header-next-btn-hover-bg', String(cfg.detailHeaderNextBtn?.hoverBg ?? defaults.detailHeaderNextBtn.hoverBg))
  set('--kp-detail-header-next-btn-border-width', (cfg.detailHeaderNextBtn?.borderWidth ?? defaults.detailHeaderNextBtn.borderWidth) + 'px')
  set('--kp-detail-header-next-btn-border-color', String(cfg.detailHeaderNextBtn?.borderColor ?? defaults.detailHeaderNextBtn.borderColor))
  set('--kp-detail-header-next-btn-radius', (cfg.detailHeaderNextBtn?.radius ?? defaults.detailHeaderNextBtn.radius) + 'px')
  set('--kp-detail-header-next-btn-padding', `${cfg.detailHeaderNextBtn?.paddingY ?? defaults.detailHeaderNextBtn.paddingY}px ${cfg.detailHeaderNextBtn?.paddingX ?? defaults.detailHeaderNextBtn.paddingX}px`)

  // Detail Box (섹션 컨테이너)
  set('--kp-detail-box-bg', String(cfg.detailSmallBox?.bg ?? defaults.detailSmallBox.bg))
  set('--kp-detail-box-border-width', (cfg.detailSmallBox?.borderWidth ?? defaults.detailSmallBox.borderWidth) + 'px')
  set('--kp-detail-box-border-color', String(cfg.detailSmallBox?.borderColor ?? defaults.detailSmallBox.borderColor))
  set('--kp-detail-box-radius', (cfg.detailSmallBox?.radius ?? defaults.detailSmallBox.radius) + 'px')
  set('--kp-detail-box-padding', '10px 10px')

  // Detail Title/Body (섹션 제목/본문)
  set('--kp-detail-title-size', (cfg.detailTitle?.size ?? defaults.detailTitle.size) + 'px')
  set('--kp-detail-title-weight', (cfg.detailTitle?.bold ? '700' : '400'))
  set('--kp-detail-title-color', String(cfg.detailTitle?.color ?? defaults.detailTitle.color))
  set('--kp-detail-title-indent', (cfg.detailTitle?.indent ?? defaults.detailTitle.indent ?? 0) + 'px')

  set('--kp-detail-body-size', (cfg.detailBody?.size ?? defaults.detailBody.size) + 'px')
  set('--kp-detail-body-weight', (cfg.detailBody?.bold ? '700' : '400'))
  set('--kp-detail-body-color', String(cfg.detailBody?.color ?? defaults.detailBody.color))
  set('--kp-detail-body-indent', (cfg.detailBody?.indent ?? defaults.detailBody.indent ?? 10) + 'px')

  // Difficulty Checkbox (난이도 체크박스)
  set('--kp-difficulty-checkbox-size', (cfg.difficultyCheckbox?.size ?? defaults.difficultyCheckbox.size) + 'px')
  set('--kp-difficulty-checkbox-bg', String(cfg.difficultyCheckbox?.bg ?? defaults.difficultyCheckbox.bg))
  set('--kp-difficulty-checkbox-border-width', (cfg.difficultyCheckbox?.borderWidth ?? defaults.difficultyCheckbox.borderWidth) + 'px')
  set('--kp-difficulty-checkbox-border-color', String(cfg.difficultyCheckbox?.borderColor ?? defaults.difficultyCheckbox.borderColor))
  set('--kp-difficulty-checkbox-border-color-checked', String(cfg.difficultyCheckbox?.borderColorChecked ?? defaults.difficultyCheckbox.borderColorChecked))
  set('--kp-difficulty-checkbox-checkmark-color', String(cfg.difficultyCheckbox?.checkmarkColor ?? defaults.difficultyCheckbox.checkmarkColor))
  set('--kp-difficulty-checkbox-gap', (cfg.difficultyCheckbox?.gap ?? defaults.difficultyCheckbox.gap) + 'px')

  // Difficulty Title (연결되지 않았던 변수들 - detailTitle을 기본으로 사용)
  set('--kp-difficulty-title-size', (cfg.detailTitle?.size ?? defaults.detailTitle.size) + 'px')
  set('--kp-difficulty-title-weight', (cfg.detailTitle?.bold ? '700' : '400'))
  set('--kp-difficulty-title-color', String(cfg.detailTitle?.color ?? defaults.detailTitle.color))

  // Safety (안전 주의)
  set('--kp-safety-box-bg', String(cfg.safetySmallBox?.bg ?? defaults.safetySmallBox.bg))
  set('--kp-safety-box-border-width', (cfg.safetySmallBox?.borderWidth ?? defaults.safetySmallBox.borderWidth) + 'px')
  set('--kp-safety-box-border-color', String(cfg.safetySmallBox?.borderColor ?? defaults.safetySmallBox.borderColor))
  set('--kp-safety-box-radius', (cfg.safetySmallBox?.radius ?? defaults.safetySmallBox.radius) + 'px')

  set('--kp-safety-title-size', (cfg.safetyTitle?.size ?? defaults.safetyTitle.size) + 'px')
  set('--kp-safety-title-weight', (cfg.safetyTitle?.bold ? '700' : '400'))
  set('--kp-safety-title-color', String(cfg.safetyTitle?.color ?? defaults.safetyTitle.color))
  set('--kp-safety-title-indent', (cfg.detailTitle?.indent ?? defaults.detailTitle.indent ?? 0) + 'px') // 섹션 제목(소) indent 값 사용

  set('--kp-safety-body-size', (cfg.safetyBody?.size ?? defaults.safetyBody.size) + 'px')
  set('--kp-safety-body-weight', (cfg.safetyBody?.bold ? '700' : '400'))
  set('--kp-safety-body-color', String(cfg.safetyBody?.color ?? defaults.safetyBody.color))
  set('--kp-safety-body-indent', (cfg.safetyBody?.indent ?? defaults.safetyBody.indent ?? 10) + 'px')
}