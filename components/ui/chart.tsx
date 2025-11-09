// components/ui/chart.tsx
'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'
import { ChartTooltipContent as WrappedChartTooltipContent, ChartLegendContent as WrappedChartLegendContent, Tooltip as RechartsTooltip, Legend as RechartsLegend, getPayloadConfigFromPayload as _getPayloadConfig } from './recharts-wrapper'

// Theme prefix selectors
const THEMES = { light: '', dark: '.dark' } as const

// ---------- Lightweight types to avoid Recharts generic friction ----------
type TooltipItem = {
  value?: number | string
  name?: string
  color?: string
  dataKey?: string
  payload?: Record<string, unknown>
  [k: string]: unknown
}

type LegendItem = {
  value?: string
  color?: string
  type?: unknown
  dataKey?: string
  payload?: Record<string, unknown>
  [k: string]: unknown
}

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = { config: ChartConfig }
const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const ctx = React.useContext(ChartContext)
  if (!ctx) throw new Error('useChart must be used within a <ChartContainer />')
  return ctx
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, cfg]) => cfg.theme || cfg.color,
  )
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, item]) => {
    const color =
      item.theme?.[theme as keyof typeof item.theme] || item.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  )
}

// ChartTooltip wrapper: if caller doesn't pass a `content` prop, inject shared renderer with `config`.
function ChartTooltip(props: any) {
  const { config } = useChart()
  const { content, ...rest } = props
  const contentRenderer =
    content ??
    ((p: any) => <WrappedChartTooltipContent {...p} config={config} />)
  return <RechartsPrimitive.Tooltip {...rest} content={contentRenderer} />
}

// ChartLegend wrapper: inject shared legend renderer with `config` when `content` not provided.
function ChartLegend(props: any) {
  const { config } = useChart()
  const { content, ...rest } = props
  const contentRenderer =
    content ??
    ((p: any) => <WrappedChartLegendContent {...p} config={config} />)
  return <RechartsPrimitive.Legend {...rest} content={contentRenderer} />
}

// Local wrappers (also exported) — kept for cases where direct component usage is needed.
function ChartLegendContent(props: React.ComponentProps<'div'> & Record<string, any> & { hideIcon?: boolean; nameKey?: string }) {
  const { config } = useChart()
  return <WrappedChartLegendContent {...props} config={config} />
}

function ChartTooltipContent(props: React.ComponentProps<'div'> & Record<string, any>) {
  const { config } = useChart()
  return <WrappedChartTooltipContent {...props} config={config} />
}

// use wrapper helper if needed
const getPayloadConfigFromPayload = _getPayloadConfig as typeof _getPayloadConfig

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
