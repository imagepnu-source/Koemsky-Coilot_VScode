'use client';
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

// Minimal, stable surface used by ColorSettingsDialog/RegisterColorOpener.
export type ColorMap = Record<string, string>;

export type ColorSettingsCtx = {
  colors: ColorMap;
  setColors: (next: ColorMap) => void;
  reset: () => void;
  importFromFile: () => void;
  exportToFile: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Noop = () => {};

const DefaultCtx: ColorSettingsCtx = {
  colors: {},
  setColors: Noop as (next: ColorMap) => void,
  reset: Noop,
  importFromFile: Noop,
  exportToFile: Noop,
  open: false,
  setOpen: Noop as (v: boolean) => void,
};

const Ctx = createContext<ColorSettingsCtx | null>(null);

export function ColorSettingsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [colors, _setColors] = useState<ColorMap>({});

  const setColors = useCallback((next: ColorMap) => {
    _setColors(prev => ({ ...prev, ...next }));
  }, []);

  const reset = useCallback(() => {
    _setColors({});
  }, []);

  // NOTE: keep as no-ops; wire to real IO later if needed.
  const importFromFile = useCallback(() => {}, []);
  const exportToFile = useCallback(() => {}, []);

  const value = useMemo<ColorSettingsCtx>(() => ({
    colors,
    setColors,
    reset,
    importFromFile,
    exportToFile,
    open,
    setOpen,
  }), [colors, setColors, reset, importFromFile, exportToFile, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useColorSettings(): ColorSettingsCtx {
  const v = useContext(Ctx);
  return v ?? DefaultCtx; // return a safe fallback to avoid runtime crashes
}
