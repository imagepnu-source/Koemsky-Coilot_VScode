'use client';
import React from 'react';
import type { AllCfg } from '@/lib/ui-design';

type InputType = 'number' | 'checkbox' | 'color' | 'text' | 'select';

type Field = {
  label: string;
  type: InputType;
  path: (string | number)[];
  props?: {
    min?: number; max?: number; step?: number;
    placeholder?: string;
    options?: { label: string; value: string | number }[];
    colSpan?: 1 | 2 | 3 | 4;
  };
};

type UnifiedSectionProps = {
  title: string;
  cfg: AllCfg;
  update: (k: keyof AllCfg, v: any) => void;
  spec: (Field | '/')[];
};

function getByPath(obj: any, path: (string | number)[]) {
  return path.reduce((acc, key) => (acc == null ? undefined : acc[key as any]), obj);
}

function setByPath(obj: any, path: (string | number)[], value: any) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  clone[head as any] = setByPath(obj ? obj[head as any] : undefined, rest, value);
  return clone;
}

function FieldControl({ field, current, onValue }:{ field: Field; current: any; onValue: (v:any)=>void }){
  const colSpan = field.props?.colSpan ?? 1;
  const base = 'flex flex-col gap-1';
  const cls = colSpan > 1 ? `col-span-${colSpan} ${base}` : base;

  if (field.type === 'number') {
    return (
      <div className={cls} key={field.label}>
        <label className="text-xs text-muted-foreground">{field.label}</label>
        <input
          type="number"
          className="px-2 py-1 border rounded"
          value={typeof current === 'number' ? current : ''}
          onChange={(e)=> onValue(Number(e.target.value))}
          min={field.props?.min}
          max={field.props?.max}
          step={field.props?.step ?? 1}
        />
      </div>
    );
  }
  if (field.type === 'checkbox') {
    return (
      <div className={cls} key={field.label}>
        <label className="text-xs text-muted-foreground">{field.label}</label>
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={!!current}
          onChange={(e)=> onValue(e.target.checked)}
        />
      </div>
    );
  }
  if (field.type === 'color') {
    return (
      <div className={cls} key={field.label}>
        <label className="text-xs text-muted-foreground">{field.label}</label>
        <input
          type="color"
          className="w-10 h-8 p-0 border rounded"
          value={typeof current === 'string' ? current : '#000000'}
          onChange={(e)=> onValue(e.target.value)}
        />
      </div>
    );
  }
  if (field.type === 'text') {
    return (
      <div className={cls} key={field.label}>
        <label className="text-xs text-muted-foreground">{field.label}</label>
        <input
          type="text"
          className="px-2 py-1 border rounded"
          value={typeof current === 'string' ? current : ''}
          onChange={(e)=> onValue(e.target.value)}
          placeholder={field.props?.placeholder}
        />
      </div>
    );
  }
  if (field.type === 'select') {
    return (
      <div className={cls} key={field.label}>
        <label className="text-xs text-muted-foreground">{field.label}</label>
        <select
          className="px-2 py-1 border rounded"
          value={current as any}
          onChange={(e)=> onValue(e.target.value)}
        >
          {(field.props?.options ?? []).map(opt => (
            <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }
  return <div className={cls} key={field.label}><em>Unsupported</em></div>;
}

export default function UnifiedSection(props: UnifiedSectionProps) {
  const { title, cfg, update, spec } = props;
  const rows: Field[][] = [];
  let row: Field[] = [];
  for (const item of spec) {
    if (item === '/') {
      if (row.length) rows.push(row);
      row = [];
    } else {
      row.push(item);
    }
  }
  if (row.length) rows.push(row);

  const handleFieldChange = (path: (string|number)[], value: any) => {
    const [top, ...rest] = path;
    const topKey = top as keyof AllCfg;
    const currentTop = (cfg as any)[topKey];
    const nextTop = setByPath(currentTop, rest, value);
    update(topKey, nextTop);
  };

  return (
    <div className="p-3 rounded-lg border bg-white">
      <div className="font-semibold mb-2">{title}</div>
      {rows.map((r, idx) => (
        <div className="grid grid-cols-4 gap-3 mb-2" key={idx}>
          {r.map(field => {
            const current = getByPath(cfg, field.path);
            return <FieldControl key={field.label} field={field} current={current} onValue={(v)=> handleFieldChange(field.path, v)} />;
          })}
        </div>
      ))}
    </div>
  );
}
