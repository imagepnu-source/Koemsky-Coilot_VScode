// lib/ui-design.ts
// Centralized UI design config + load/save/apply helpers.
//
// NOTE: This file is written to be **backward compatible** with existing saves.
// - Unknown/legacy keys are preserved when saving (we shallow-merge defaults).
// - Newly added keys for the "Play Detail" tab are given safe defaults.
//
// If you already have a working implementation, this module can fully replace it
// without touching call-sites. Public API is kept identical to what the UI
// dialog imports: AllCfg + loadUIDesignCfg, saveUIDesignCfg, applyUIDesignCSS.

export type FontCfg = { size: number; bold: boolean; color: string };
export type DropdownCfg = {
  size: number; bold: boolean; color: string;
  bg: string; borderWidth: number; borderColor: string; hoverBg: string;
};
export type BoxCfg = { bg: string; padding: number; border: { width: number; color: string } };
export type SmallBoxCfg = { bg: string; borderWidth: number; borderColor: string; radius: number };

export type LevelBadgeCfg = {
  bg: string; borderWidth: number; borderColor: string; radius: number;
  height: number; paddingX: number; paddingY: number;
};
export type AgeBadgeCfg = {
  fontSize: number; bold: boolean; color: string;
  bg: string; borderWidth: number; borderColor: string; radius: number;
  height: number; paddingX: number; paddingY: number;
};

// ✅ NEW: Keys for Play Detail / Difficulty editors (requested)
export type DetailCfg = {
  detailSmallBox: SmallBoxCfg;
  detailTitle: FontCfg;
  detailBody: FontCfg;
  difficultyBox: SmallBoxCfg;
  difficultyText: FontCfg;
};

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

  // Detail (optional historically; always present after this patch)
} & DetailCfg;

const STORAGE_KEY = 'komensky_ui_design_v2';

// ---- defaults ----
const font = (size: number, bold = false, color = '#111111'): FontCfg => ({ size, bold, color });
const box  = (bg = '#FFFFFF', padding = 12, bw = 1, bc = 'rgba(0,0,0,0.12)'): BoxCfg =>
  ({ bg, padding, border: { width: bw, color: bc } });
const sbox = (bg = '#FFFFFF', bw = 1, bc = 'rgba(0,0,0,0.12)', radius = 12): SmallBoxCfg =>
  ({ bg, borderWidth: bw, borderColor: bc, radius });

const defaults: AllCfg = {
  // header
  topHeaderBox: box(),
  title:   font(18, true),
  namebio: font(13, false, '#444444'),
  devage:  font(14, true,  '#0A66FF'),
  catag:   { size: 12, bold: true },
  dropdown: {
    size: 12, bold: false, color: '#111111',
    bg: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', hoverBg: '#F5F5F5',
  },

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
};

// Shallow merge helper (preserves extra legacy keys)
function mergeDefaults<T extends Record<string, any>>(def: T, val: Partial<T> | undefined): T {
  const out: any = { ...def, ...(val || {}) };
  // Deep-merge a few nested structs used across the app
  if (val?.border && 'border' in def) out.border = { ...def.border, ...val.border };
  if ('dropdown' in def && (val as any)?.dropdown) out.dropdown = { ...def.dropdown, ...(val as any).dropdown };
  return out;
}

export function loadUIDesignCfg(): AllCfg {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    // Merge per top-level key to be resilient to older saves
    const merged: any = { ...defaults, ...(parsed || {}) };

    // Ensure nested structs are also merged (defensive)
    merged.topHeaderBox = mergeDefaults(defaults.topHeaderBox, parsed?.topHeaderBox);
    merged.playListBox  = mergeDefaults(defaults.playListBox,  parsed?.playListBox);
    merged.dropdown     = mergeDefaults(defaults.dropdown,     parsed?.dropdown);

    // Small boxes & fonts (fall back individually)
    merged.activityBox   = { ...defaults.activityBox,   ...(parsed?.activityBox   || {}) };
    merged.levelBadgeBox = { ...defaults.levelBadgeBox, ...(parsed?.levelBadgeBox || {}) };
    merged.detailSmallBox = { ...defaults.detailSmallBox, ...(parsed?.detailSmallBox || {}) };
    merged.difficultyBox  = { ...defaults.difficultyBox,  ...(parsed?.difficultyBox  || {}) };

    merged.title        = { ...defaults.title,        ...(parsed?.title        || {}) };
    merged.namebio      = { ...defaults.namebio,      ...(parsed?.namebio      || {}) };
    merged.devage       = { ...defaults.devage,       ...(parsed?.devage       || {}) };
    merged.activity     = { ...defaults.activity,     ...(parsed?.activity     || {}) };
    merged.detailTitle  = { ...defaults.detailTitle,  ...(parsed?.detailTitle  || {}) };
    merged.detailBody   = { ...defaults.detailBody,   ...(parsed?.detailBody   || {}) };
    merged.difficultyText = { ...defaults.difficultyText, ...(parsed?.difficultyText || {}) };
    merged.levelBadge   = { ...defaults.levelBadge,   ...(parsed?.levelBadge   || {}) };
    merged.ageBadge     = { ...defaults.ageBadge,     ...(parsed?.ageBadge     || {}) };

    return merged as AllCfg;
  } catch (e) {
    console.warn('[ui-design] load failed, using defaults:', e);
    return { ...defaults };
  }
}

export function saveUIDesignCfg(cfg: AllCfg) {
  try {
    const next = { ...defaults, ...(cfg as any) }; // keep unknown keys too
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('[ui-design] save failed:', e);
  }
}

// Applies a minimal set of CSS variables so the running app can reflect edits.
// This keeps compatibility: if other parts already read these vars, nothing changes.
export function applyUIDesignCSS(cfg: AllCfg) {
  const r = document.documentElement;
  const set = (k: string, v: string | number) => r.style.setProperty(k, String(v));

  // Header
  set('--kp-title-size', cfg.title.size + 'px');
  set('--kp-title-weight', cfg.title.bold ? '700' : '400');
  set('--kp-title-color', cfg.title.color);

  set('--kp-namebio-size', cfg.namebio.size + 'px');
  set('--kp-namebio-weight', cfg.namebio.bold ? '700' : '400');
  set('--kp-namebio-color', cfg.namebio.color);

  // List row text
  set('--kp-activity-size', cfg.activity.size + 'px');
  set('--kp-activity-weight', cfg.activity.bold ? '700' : '400');
  set('--kp-activity-color', cfg.activity.color);

  // Detail/title/body (new – safe defaults; harmless if unused)
  set('--kp-detail-title-size', cfg.detailTitle.size + 'px');
  set('--kp-detail-title-weight', cfg.detailTitle.bold ? '700' : '400');
  set('--kp-detail-title-color', cfg.detailTitle.color);

  set('--kp-detail-body-size', cfg.detailBody.size + 'px');
  set('--kp-detail-body-weight', cfg.detailBody.bold ? '700' : '400');
  set('--kp-detail-body-color', cfg.detailBody.color);
}