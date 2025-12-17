// lib/ui-design.ts
// Centralized UI design config + load/save/apply helpers.
//
// NOTE: This file is written to be **backward compatible** with existing saves.
// - Unknown/legacy keys are preserved when saving (we shallow-merge defaults).
// - Newly added keys for the "Play Detail" tab are given safe defaults.
//
// Public API used by components: FontCfg, DropdownCfg, AllCfg, asFont,
// loadUIDesignCfg, saveUIDesignCfg, applyUIDesignCSS.

import { supabase } from '@/lib/supabaseClient'

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

/** Graph (Radar / Time-axis) config */
export type RadarGraphCfg = {
  /** Graph Container width as % of viewport/page width (100 = full width) */
  containerWidthPercent: number;
  /** Graph Container height as % of base height (100 = default, 0~200 등) */
  containerHeightPercent: number;
  /** Y offset between Graph Container top and "발달 영역별 레이더 그래프" title (px) */
  containerYOffset: number;
  /** Tab font size for "레이더 그래프" / "시간축 그래프" (px) */
  tabFontSize: number;
  /** Radar graph title font size (px) */
  titleFontSize: number;
  /** Radar axis label font size (category names, px) */
  axisLabelFontSize: number;
  /** Radar radius tick number font size (px) */
  axisTickFontSize: number;
}

export type TimeAxisGraphCfg = {
  /** "발달 그래프 - 모든 카테고리" title font size (px) */
  titleFontSize: number;
  /** Legend 자동 줄바꿈 라인 간격 (%) */
  legendLineHeightPercent: number;
  /** Legend 행(row) 사이 간격 (px) */
  legendRowGapPx: number;
  /** Title 과 기간 선택 바 사이 간격 (px) */
  titleSliderGap: number;
  /** 시작/종료 날짜 라벨 폰트 크기 (px) */
  rangeLabelFontSize: number;
  /** "선택된 기간" 라벨 폰트 크기 (px) */
  selectedRangeFontSize: number;
  /** 가로·세로 축 Title 폰트 크기 (px) */
  axisTitleFontSize: number;
  /** 가로·세로 눈금 숫자 폰트 크기 (px) */
  axisTickFontSize: number;
  /** 그래프 rect 가로 크기 (svg 전체 폭 대비, %) */
  rectWidthPercent: number;
  /** 가로축 눈금 글씨와 가로축 제목 사이 간격 (px) */
  xTitleBottomGap: number;
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
  levelBadgeIndent: number; // Level Badge 오른쪽 여백 (가장 오른쪽과의 거리)
  ageBadgeIndent: number;   // Age Badge 왼쪽 여백 (가장 왼쪽과의 거리)
  activityIndent: number;   // Activity (번호+제목) 왼쪽 여백

  // Graphs
  radarGraph: RadarGraphCfg;
  timeAxisGraph: TimeAxisGraphCfg;

} & DetailCfg

const STORAGE_KEY = 'komensky_ui_design_v2'
const GLOBAL_UI_ID = 'global'
const CURRENT_VERSION = '2.1' // 버전 관리

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
  levelBadgeIndent: 0,    // Level Badge 오른쪽 여백 (가장 오른쪽과의 거리)
  ageBadgeIndent: 0,      // Age Badge 왼쪽 여백 (가장 왼쪽과의 거리)
  activityIndent: 8,      // Activity (번호+제목) 왼쪽 여백

  // graph: radar + time-axis
  radarGraph: {
    containerWidthPercent: 100,
    containerHeightPercent: 100,
    containerYOffset: 16,
    tabFontSize: 14,
    titleFontSize: 16,
    axisLabelFontSize: 13,
    axisTickFontSize: 13,
  },
  timeAxisGraph: {
    titleFontSize: 16,
    legendLineHeightPercent: 120,
    legendRowGapPx: 4,
    titleSliderGap: 5,
    rangeLabelFontSize: 12,
    selectedRangeFontSize: 12,
    axisTitleFontSize: 12,
    axisTickFontSize: 11,
    rectWidthPercent: 100,
    xTitleBottomGap: 5,
  },

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

/**
 * Deep merge helper: 기본값과 저장된 값을 병합
 * - 기본값에 있는 키만 사용 (사용하지 않는 구 버전 키는 자동 제거)
 * - 저장된 값에 없는 키는 기본값에서 가져옴 (새 버전 키 자동 추가)
 * - 중첩된 객체도 재귀적으로 병합
 */
function deepMergeWithDefaults<T extends Record<string, any>>(
  defaultValue: T, 
  savedValue: Partial<T> | undefined | null
): T {
  if (!savedValue || typeof savedValue !== 'object') {
    return { ...defaultValue }
  }

  const result: any = {}

  // 기본값의 모든 키를 순회 (기본값에 있는 키만 사용)
  for (const key in defaultValue) {
    const defVal = defaultValue[key]
    const savedVal = savedValue[key]

    // 값이 객체이고 배열이 아닌 경우 재귀 병합
    if (
      defVal && 
      typeof defVal === 'object' && 
      !Array.isArray(defVal) &&
      savedVal &&
      typeof savedVal === 'object' &&
      !Array.isArray(savedVal)
    ) {
      result[key] = deepMergeWithDefaults(defVal, savedVal)
    } 
    // 저장된 값이 있으면 사용, 없으면 기본값 사용
    else if (savedVal !== undefined && savedVal !== null) {
      result[key] = savedVal
    } else {
      result[key] = defVal
    }
  }

  return result as T
}

// Shallow merge helper (backward compatibility, deprecated)
function mergeDefaults<T extends Record<string, any>>(def: T, val: Partial<T> | undefined): T {
  return deepMergeWithDefaults(def, val)
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
    
    // 버전 체크 및 마이그레이션 로그
    const savedVersion = parsed._version || '1.0'
    if (savedVersion !== CURRENT_VERSION) {
      // console.log(`[ui-design] Migrating from v${savedVersion} to v${CURRENT_VERSION}`)
    }
    
    // Deep merge: 기본값을 기준으로 저장된 값을 병합
    // - 새로운 키는 기본값에서 자동 추가
    // - 사용하지 않는 구 버전 키는 자동 제거
    const merged = deepMergeWithDefaults(defaults, parsed)
    
    // 버전 정보 추가
    ;(merged as any)._version = CURRENT_VERSION
    
    // 마이그레이션 후 자동 저장 (선택적)
    if (savedVersion !== CURRENT_VERSION) {
      // console.log('[ui-design] Auto-saving migrated settings')
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      } catch (e) {
        console.warn('[ui-design] Auto-save failed:', e)
      }
    }
    
    return merged as AllCfg
  } catch (e) {
    console.warn('[ui-design] Load failed, using defaults:', e)
    return { ...defaults }
  }
}

export function saveUIDesignCfg(cfg: AllCfg) {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return
  }

  try {
    // Deep merge with defaults to ensure all required keys exist
    const merged = deepMergeWithDefaults(defaults, cfg as any)
    
    // Add version info
    ;(merged as any)._version = CURRENT_VERSION
    ;(merged as any)._savedAt = new Date().toISOString()
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    // console.log(`[ui-design] Saved settings v${CURRENT_VERSION}`)
    
    // Notify other components that UI design was updated
    try {
      window.dispatchEvent(new CustomEvent('ui-design-updated'))
    } catch (e) {
      console.warn('[ui-design] Failed to dispatch update event:', e)
    }
  } catch (e) {
    console.error('[ui-design] Save failed:', e)
  }
}

/**
 * fetchGlobalUIDesignCfg
 * - Supabase의 ui_settings 테이블에서 전역 UI 설정을 읽어옵니다.
 * - 레코드가 없거나 오류가 나면 null을 반환합니다.
 * - 반환 시 defaults 와 deep merge 하여 항상 완전한 AllCfg 형태를 보장합니다.
 */
export async function fetchGlobalUIDesignCfg(): Promise<AllCfg | null> {
  // 브라우저가 아니거나 Supabase 가 설정되지 않은 경우, 전역 설정 사용 안 함
  if (typeof window === 'undefined' || !supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('ui_settings')
      .select('settings')
      .eq('id', GLOBAL_UI_ID)
      .maybeSingle()

    if (error) {
      console.warn('[ui-design] Failed to fetch global UI settings from Supabase:', error)
      return null
    }

    if (!data || !data.settings) {
      return null
    }

    const merged = deepMergeWithDefaults(defaults, data.settings as Partial<AllCfg>)
    ;(merged as any)._version = CURRENT_VERSION
    ;(merged as any)._source = 'supabase-global'
    return merged as AllCfg
  } catch (e) {
    console.warn('[ui-design] Unexpected error while fetching global UI settings:', e)
    return null
  }
}

/**
 * saveGlobalUIDesignCfg
 * - 현재 브라우저의 UI 설정을 Supabase ui_settings 테이블의 전역 레코드로 저장합니다.
 * - 이 함수는 "지금 화면의 UI Set을 모든 사용자에게 강제로 적용"할 때 사용합니다.
 */
export async function saveGlobalUIDesignCfg(cfg: AllCfg): Promise<void> {
  if (typeof window === 'undefined' || !supabase) {
    throw new Error('Supabase 설정이 필요합니다. (환경 변수 확인)')
  }

  try {
    const merged = deepMergeWithDefaults(defaults, cfg as any)
    ;(merged as any)._version = CURRENT_VERSION
    ;(merged as any)._savedAt = new Date().toISOString()

    const { error } = await supabase
      .from('ui_settings')
      .upsert({
        id: GLOBAL_UI_ID,
        settings: merged,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('[ui-design] Failed to save global UI settings to Supabase:', error)
      throw error
    }

    // console.log('[ui-design] Saved global UI settings to Supabase')
  } catch (e) {
    console.error('[ui-design] Unexpected error while saving global UI settings:', e)
    throw e
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

  // Bridge: map header config to legacy --ui-* tokens used in globals.css
  set('--ui-top-header-bg', String(cfg.topHeaderBox?.bg ?? defaults.topHeaderBox.bg))
  set('--ui-top-header-padding', (cfg.topHeaderBox?.padding ?? defaults.topHeaderBox.padding) + 'px')
  set('--ui-top-header-border-width', (cfg.topHeaderBox?.border?.width ?? defaults.topHeaderBox.border.width) + 'px')
  set('--ui-top-header-border-color', String(cfg.topHeaderBox?.border?.color ?? defaults.topHeaderBox.border.color))

  set('--ui-title-size', (cfg.title?.size ?? defaults.title.size) + 'px')
  set('--ui-title-weight', cfg.title?.bold ? '700' : '400')
  set('--ui-title-color', String(cfg.title?.color ?? defaults.title.color))

  set('--ui-namebio-size', (cfg.namebio?.size ?? defaults.namebio.size) + 'px')
  set('--ui-namebio-weight', cfg.namebio?.bold ? '700' : '400')
  set('--ui-namebio-color', String(cfg.namebio?.color ?? defaults.namebio.color))

  set('--ui-devage-size', (cfg.devage?.size ?? defaults.devage.size) + 'px')
  set('--ui-devage-weight', cfg.devage?.bold ? '700' : '400')
  set('--ui-devage-color', String(cfg.devage?.color ?? defaults.devage.color))

  set('--ui-catag-size', (cfg.catag?.size ?? defaults.catag.size) + 'px')
  set('--ui-catag-weight', cfg.catag?.bold ? '700' : '400')
  set('--ui-catag-color', String(cfg.catag?.color ?? defaults.catag.color ?? '#111111'))

  // Play List Box
  set('--kp-play-list-bg', String(cfg.playListBox?.bg ?? defaults.playListBox.bg))
  set('--kp-play-list-padding', (cfg.playListBox?.padding ?? defaults.playListBox.padding) + 'px')
  set('--kp-play-list-border-width', (cfg.playListBox?.border?.width ?? defaults.playListBox.border.width) + 'px')
  set('--kp-play-list-border-color', String(cfg.playListBox?.border?.color ?? defaults.playListBox.border.color))

  // Bridge: legacy list container tokens
  set('--ui-list-bg', String(cfg.playListBox?.bg ?? defaults.playListBox.bg))
  set('--ui-list-padding', (cfg.playListBox?.padding ?? defaults.playListBox.padding) + 'px')
  set('--ui-list-border-width', (cfg.playListBox?.border?.width ?? defaults.playListBox.border.width) + 'px')
  set('--ui-list-border-color', String(cfg.playListBox?.border?.color ?? defaults.playListBox.border.color))

  // Activity Box (small box)
  set('--kp-activity-box-bg', String(cfg.activityBox?.bg ?? defaults.activityBox.bg))
  set('--kp-activity-box-border-width', (cfg.activityBox?.borderWidth ?? defaults.activityBox.borderWidth) + 'px')
  set('--kp-activity-box-border-color', String(cfg.activityBox?.borderColor ?? defaults.activityBox.borderColor))
  set('--kp-activity-box-radius', (cfg.activityBox?.radius ?? defaults.activityBox.radius) + 'px')

  // List row text
  set('--kp-activity-size', (cfg.activity?.size ?? defaults.activity.size) + 'px')
  set('--kp-activity-weight', (cfg.activity?.bold ? '700' : '400'))
  set('--kp-activity-color', String(cfg.activity?.color ?? defaults.activity.color))

  // Bridge: legacy activity font tokens (optional, for old components)
  set('--ui-activity-num-size', (cfg.activity?.size ?? defaults.activity.size) + 'px')
  set('--ui-activity-num-weight', cfg.activity?.bold ? '700' : '400')
  set('--ui-activity-num-color', String(cfg.activity?.color ?? defaults.activity.color))
  set('--ui-activity-title-size', (cfg.activity?.size ?? defaults.activity.size) + 'px')
  set('--ui-activity-title-weight', cfg.activity?.bold ? '700' : '400')
  set('--ui-activity-title-color', String(cfg.activity?.color ?? defaults.activity.color))

  // Level Badge
  set('--kp-level-badge-font-size', (cfg.levelBadge?.fontSize ?? defaults.levelBadge.fontSize) + 'px')
  set('--kp-level-badge-weight', cfg.levelBadge?.bold ? '700' : '400')
  set('--kp-level-badge-bg', String(cfg.levelBadge?.bg ?? defaults.levelBadge.bg))
  set('--kp-level-badge-border-width', (cfg.levelBadge?.borderWidth ?? defaults.levelBadge.borderWidth) + 'px')
  set('--kp-level-badge-border-color', String(cfg.levelBadge?.borderColor ?? defaults.levelBadge.borderColor))
  set('--kp-level-badge-radius', (cfg.levelBadge?.radius ?? defaults.levelBadge.radius) + 'px')
  set('--kp-level-badge-height', (cfg.levelBadge?.height ?? defaults.levelBadge.height) + 'px')
  set('--kp-level-badge-padding', `${cfg.levelBadge?.paddingY ?? defaults.levelBadge.paddingY}px ${cfg.levelBadge?.paddingX ?? defaults.levelBadge.paddingX}px`)

  // Bridge: legacy level badge tokens (for [data-ui="level-badge"])
  set('--ui-level-badge-height', (cfg.levelBadge?.height ?? defaults.levelBadge.height) + 'px')
  set('--ui-level-badge-radius', (cfg.levelBadge?.radius ?? defaults.levelBadge.radius) + 'px')
  set('--ui-level-badge-bg', String(cfg.levelBadge?.bg ?? defaults.levelBadge.bg))
  set('--ui-level-badge-font-size', (cfg.levelBadge?.fontSize ?? defaults.levelBadge.fontSize) + 'px')
  set('--ui-level-badge-font-weight', cfg.levelBadge?.bold ? '700' : '400')

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

  // Bridge: legacy age badge tokens (for [data-ui="age-badge"])
  set('--ui-age-badge-font-size', (cfg.ageBadge?.fontSize ?? defaults.ageBadge.fontSize) + 'px')
  set('--ui-age-badge-font-weight', cfg.ageBadge?.bold ? '700' : '400')
  set('--ui-age-badge-color', String(cfg.ageBadge?.color ?? defaults.ageBadge.color))
  set('--ui-age-badge-bg', String(cfg.ageBadge?.bg ?? defaults.ageBadge.bg))
  set('--ui-age-badge-border-width', (cfg.ageBadge?.borderWidth ?? defaults.ageBadge.borderWidth) + 'px')
  set('--ui-age-badge-border-color', String(cfg.ageBadge?.borderColor ?? defaults.ageBadge.borderColor))
  
  // List Indents
  set('--kp-level-badge-indent', (cfg.levelBadgeIndent ?? defaults.levelBadgeIndent) + 'px')
  set('--kp-age-badge-indent', (cfg.ageBadgeIndent ?? defaults.ageBadgeIndent) + 'px')
  set('--kp-activity-indent', (cfg.activityIndent ?? defaults.activityIndent) + 'px')

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

  // Graph: Radar
  const radar = cfg.radarGraph ?? defaults.radarGraph
  set('--kp-graph-container-width-percent', (radar.containerWidthPercent ?? defaults.radarGraph.containerWidthPercent) + '%')
  set('--kp-graph-container-y-offset', (radar.containerYOffset ?? defaults.radarGraph.containerYOffset) + 'px')
  set('--kp-graph-tab-font-size', (radar.tabFontSize ?? defaults.radarGraph.tabFontSize) + 'px')
  set('--kp-radar-title-font-size', (radar.titleFontSize ?? defaults.radarGraph.titleFontSize) + 'px')
  set('--kp-radar-axis-label-font-size', (radar.axisLabelFontSize ?? defaults.radarGraph.axisLabelFontSize) + 'px')
  set('--kp-radar-axis-tick-font-size', (radar.axisTickFontSize ?? defaults.radarGraph.axisTickFontSize) + 'px')
  const hPercent = radar.containerHeightPercent ?? defaults.radarGraph.containerHeightPercent
  set('--kp-radar-container-height-percent', String(hPercent))

  // Graph: Time-axis
  const timeAxis = cfg.timeAxisGraph ?? defaults.timeAxisGraph
  set('--kp-timeaxis-title-font-size', (timeAxis.titleFontSize ?? defaults.timeAxisGraph.titleFontSize) + 'px')
  set('--kp-timeaxis-legend-line-height', (timeAxis.legendLineHeightPercent ?? defaults.timeAxisGraph.legendLineHeightPercent) + '%')
  set('--kp-timeaxis-legend-row-gap', (timeAxis.legendRowGapPx ?? defaults.timeAxisGraph.legendRowGapPx) + 'px')
  set('--kp-timeaxis-title-slider-gap', (timeAxis.titleSliderGap ?? defaults.timeAxisGraph.titleSliderGap) + 'px')
  set('--kp-timeaxis-range-label-font-size', (timeAxis.rangeLabelFontSize ?? defaults.timeAxisGraph.rangeLabelFontSize) + 'px')
  set('--kp-timeaxis-selected-range-font-size', (timeAxis.selectedRangeFontSize ?? defaults.timeAxisGraph.selectedRangeFontSize) + 'px')
  set('--kp-timeaxis-axis-title-font-size', (timeAxis.axisTitleFontSize ?? defaults.timeAxisGraph.axisTitleFontSize) + 'px')
  set('--kp-timeaxis-axis-tick-font-size', (timeAxis.axisTickFontSize ?? defaults.timeAxisGraph.axisTickFontSize) + 'px')
  set('--kp-timeaxis-rect-width-percent', (timeAxis.rectWidthPercent ?? defaults.timeAxisGraph.rectWidthPercent) + '%')
  set('--kp-timeaxis-xlabel-bottom-gap', (timeAxis.xTitleBottomGap ?? defaults.timeAxisGraph.xTitleBottomGap) + 'px')
}