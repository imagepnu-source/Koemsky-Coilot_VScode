'use client';
import { useEffect } from 'react';

export default function DebugMount({ tag }: { tag: string }) {
  useEffect(() => {
    console.log('[LAYOUT MOUNTED]', tag);
  }, [tag]);
  return null;
}
