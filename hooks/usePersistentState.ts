'use client';
import { useEffect, useState } from 'react';

export function usePersistentState<T>(key: string, initial: T) {
  // 첫 마운트 시 localStorage 에 값이 있으면 즉시 사용하고,
  // 없으면 initial 값을 사용합니다.
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // ignore parse/storage error and fall back to initial
    }
    return initial;
  });

  // state 가 바뀔 때마다 localStorage 에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [key, state]);

  return [state, setState] as const;
}
