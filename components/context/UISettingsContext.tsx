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
  activityNum:   { size: 14, bold: false, color: '#333' },
  activityTitle: { size: 14, bold: false, color: '#333' },
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

  // persist settings
  React.useEffect(() => {
    if (!isBrowser()) return;
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); } catch {}
  }, [settings]);

  // CSS Vars sync (Provider does NOT touch --ui-activity-*) + diagnostics
  React.useEffect(() => {
    if (!isBrowser()) return;
    const r = document.documentElement.style;

    // canonical writes that Provider owns
    r.setProperty('--primary', settings.primary);
    r.setProperty('--ui-name-age-weight', settings.nameAgeBold ? '700' : '400');
    try { localStorage.setItem(LS_BOLD, settings.nameAgeBold ? 'on' : 'off'); } catch {}

    // diagnostics — define window.__dumpUIVars (TS-safe)
    (window as any).__dumpUIVars = function() {
      const s = getComputedStyle(document.documentElement);
      const keys = [
        // top 4
        '--ui-title-size','--ui-title-weight','--ui-title-color',
        '--ui-namebio-size','--ui-namebio-weight','--ui-namebio-color',
        '--ui-devage-size','--ui-devage-weight','--ui-devage-color',
        '--ui-catag-size','--ui-catag-weight',
        // activity (Dialog-owned)
        '--ui-activity-num-size','--ui-activity-num-weight','--ui-activity-num-color',
        '--ui-activity-title-size','--ui-activity-title-weight','--ui-activity-title-color',
      ] as const;

      const o: Record<string, string> = {}; // <-- TS7053 fix: explicit index signature
      keys.forEach((k) => {
        const v = (s.getPropertyValue(k) || '').trim();
        o[k] = v || '(EMPTY)';
      });
      // eslint-disable-next-line no-console
      console.table(o);
      return o;
    };
  }, [JSON.stringify({
    primary: settings.primary,
    nameAgeBold: settings.nameAgeBold,
  })]);

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
