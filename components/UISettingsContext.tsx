'use client';
import React from 'react';

export type UITheme = 'light' | 'dark' | 'system';
export type FontCfg = { size: number; bold: boolean; color: string };

type UISettings = {
  theme: UITheme;
  primary: string;
  radius: number;
  spacing: number;
  fontScale: number;
  nameAgeBold: boolean;

  activityNum: FontCfg;
  activityTitle: FontCfg;

  /** Activity 번호 & 제목 통합 폰트 (정식 키) */
  activityFont: FontCfg;
};

type UpdateableKeys = keyof UISettings;
type Ctx = {
  settings: UISettings;
  update: <K extends UpdateableKeys>(k: K, v: UISettings[K]) => void;
};

const DEFAULTS: UISettings = {
  theme: 'system',
  primary: '#1d4ed8',
  radius: 10,
  spacing: 8,
  fontScale: 1,
  nameAgeBold: false,

  activityNum:   { size: 12, bold: false, color: '#7ea6f7' },
  activityTitle: { size: 16, bold: true,  color: '#111111' },

  /** 기본값 */
  activityFont:  { size: 14, bold: false, color: '#333' },
};

const C = React.createContext<Ctx>({ settings: DEFAULTS, update: () => {} });

const LS_SETTINGS = 'ui-settings:v1';
const LS_BOLD = 'ui-name-age-bold';
const isBrowser = () => typeof window !== 'undefined';

export function UISettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, set] = React.useState<UISettings>(() => {
    if (!isBrowser()) return DEFAULTS;
    try {
      const raw = localStorage.getItem(LS_SETTINGS);
      const parsed = raw ? (JSON.parse(raw) as Partial<UISettings>) : {};
      const savedBold = localStorage.getItem(LS_BOLD);
      const nameAgeBold =
        savedBold === 'on' ? true : savedBold === 'off' ? false : parsed.nameAgeBold ?? DEFAULTS.nameAgeBold;
      return { ...DEFAULTS, ...parsed, nameAgeBold };
    } catch { return DEFAULTS; }
  });

  // 저장
  React.useEffect(() => {
    if (!isBrowser()) return;
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); } catch {}
  }, [settings]);

  // CSS 변수 동기화 (정식 키만)
  React.useEffect(() => {
    if (!isBrowser()) return;
    const r = document.documentElement.style;

    // 기본 항목
    r.setProperty('--primary', settings.primary);
    r.setProperty('--ui-name-age-weight', settings.nameAgeBold ? '700' : '400');
    try { localStorage.setItem(LS_BOLD, settings.nameAgeBold ? 'on' : 'off'); } catch {}

    // Activity — 통합 우선
    const setSize = (name: string, v: number) => {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) r.setProperty(name, String(n) + 'px');
      else r.removeProperty(name);
    };
    const font = settings.activityFont || DEFAULTS.activityFont;
    setSize('--ui-activity-num-size', font.size);
    r.setProperty('--ui-activity-num-weight', font.bold ? '700' : '400');
    r.setProperty('--ui-activity-num-color', font.color);
    setSize('--ui-activity-title-size', font.size);
    r.setProperty('--ui-activity-title-weight', font.bold ? '700' : '400');
    r.setProperty('--ui-activity-title-color', font.color);

    // 개별 값이 있다면 보강(없으면 통합과 동일)
    const n = settings.activityNum || DEFAULTS.activityNum;
    const t = settings.activityTitle || DEFAULTS.activityTitle;
    setSize('--ui-activity-num-size', n.size || font.size);
    r.setProperty('--ui-activity-num-weight', (n.bold ?? font.bold) ? '700' : '400');
    r.setProperty('--ui-activity-num-color', n.color || font.color);
    setSize('--ui-activity-title-size', t.size || font.size);
    r.setProperty('--ui-activity-title-weight', (t.bold ?? font.bold) ? '700' : '400');
    r.setProperty('--ui-activity-title-color', t.color || font.color);

    // 증거 덤프 (정식 키만)
    (window as any).__dumpUIVars = function() {
      const s = getComputedStyle(document.documentElement);
      const keys = [
        '--ui-activity-num-size','--ui-activity-num-weight','--ui-activity-num-color',
        '--ui-activity-title-size','--ui-activity-title-weight','--ui-activity-title-color',
      ];
      const o: Record<string,string> = {};
      keys.forEach(k => o[k] = (s.getPropertyValue(k) || '').trim() || '(EMPTY)');
      // eslint-disable-next-line no-console
      console.table(o);
      return o;
    };
  }, [
    settings.primary,
    settings.nameAgeBold,
    settings.activityFont,
    settings.activityNum,
    settings.activityTitle
  ]);

  // 동일값이면 setState 생략 → 렌더 루프 방지
  const update: Ctx['update'] = React.useCallback((k, v) => {
    set(prev => {
      if (JSON.stringify(prev[k]) == JSON.stringify(v)) return prev;
      return { ...prev, [k]: v } as UISettings;
    });
  }, []);

  const value = React.useMemo<Ctx>(() => ({ settings, update }), [settings, update]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useUISettings(): Ctx {
  return React.useContext(C);
}
