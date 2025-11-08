'use client';
import React, { useEffect } from 'react';

// 클라이언트 전용 컴포넌트: 마운트 시 루트 클래스 추가, 언마운트 시 제거
export default function HideDocScrollbar(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.classList.add('hide-doc-scrollbar');
    return () => { root.classList.remove('hide-doc-scrollbar'); };
  }, []);
  return null;
}
