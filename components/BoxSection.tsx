'use client';
import React from 'react';
import type { BoxCfg } from '@/lib/ui-design';

export default function BoxSection(props: {
  title?: string;
  value: BoxCfg;
  onChange: (v: BoxCfg) => void;
}) {
  const { title, value, onChange } = props;
  const update = (patch: Partial<BoxCfg>) => onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-2 gap-2 items-center">
      {title && <div className="col-span-2 font-medium mb-1">{title}</div>}

      <label className="flex items-center gap-2 col-span-2">
        <span className="w-28 text-sm">Background</span>
        <input
          type="color"
          value={value.bg}
          onChange={(e) => update({ bg: e.target.value })}
          className="w-10 h-8 p-0 border rounded"
        />
        <input
          type="text"
          value={value.bg}
          onChange={(e) => update({ bg: e.target.value })}
          className="ml-2 border px-2 py-1 text-sm w-full"
        />
      </label>

      <label className="flex items-center gap-2">
        <span className="w-28 text-sm">Padding</span>
        <input
          type="number"
          value={value.padding}
          onChange={(e) => update({ padding: Math.max(0, Number(e.target.value) || 0) })}
          className="border px-2 py-1 w-24"
        />
      </label>

      <label className="flex items-center gap-2">
        <span className="w-28 text-sm">Border width</span>
        <input
          type="number"
          value={value.border?.width ?? 0}
          onChange={(e) =>
            update({
              border: {
                ...(value.border || { width: 0, color: '#000' }),
                width: Math.max(0, Number(e.target.value) || 0),
              },
            })
          }
          className="border px-2 py-1 w-24"
        />
      </label>

      <label className="flex items-center gap-2 col-span-2">
        <span className="w-28 text-sm">Border color</span>
        <input
          type="color"
          value={value.border?.color ?? '#000000'}
          onChange={(e) =>
            update({
              border: {
                ...(value.border || { width: 0, color: '#000' }),
                color: e.target.value,
              },
            })
          }
          className="w-10 h-8 p-0 border rounded"
        />
        <input
          type="text"
          value={value.border?.color ?? ''}
          onChange={(e) =>
            update({
              border: {
                ...(value.border || { width: 0, color: '#000' }),
                color: e.target.value,
              },
            })
          }
          className="ml-2 border px-2 py-1 text-sm w-full"
        />
      </label>
    </div>
  );
}