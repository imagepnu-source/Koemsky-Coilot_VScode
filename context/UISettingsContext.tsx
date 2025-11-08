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

  /** CSS 변수 맵 */
  cssVars?: Record<string, string | number>;

  /** 스크롤바 숨김 여부 */
  hideScrollbar?: boolean;
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

  /** CSS 변수 맵 기본값 */
  cssVars: {},

  /** 스크롤바 숨김 기본값 */
  hideScrollbar: false,
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

  // DOM 조작은 클라이언트 마운트 이후에만 실행하도록 이동
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    try {
      const s = getComputedStyle(root);
      // 예: CSS 변수 적용
      if (settings?.cssVars) {
        Object.entries(settings.cssVars).forEach(([k, v]) => {
          root.style.setProperty(k, String(v));
        });
      }
      // 예: 클래스 안전 적용
      if (settings?.hideScrollbar) root.classList.add("hide-scrollbar");
      else root.classList.remove("hide-scrollbar");
    } catch (e) {
      console.error("UISettingsContext DOM update failed:", e);
    }
  }, [settings]);

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
