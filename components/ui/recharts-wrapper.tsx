// ...new file...
import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'
import type { ChartConfig } from './chart'

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

/**
 * Helper: extract config/key from payload object (same logic as original chart helper).
 * Keep implementation minimal and safe; chart.tsx can still import its own helper if needed.
 */
export function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== 'object' || payload === null) return undefined

  const p: any = payload
  const inner = typeof p.payload === 'object' && p.payload ? p.payload : undefined
  let configKey = key

  if (typeof p[key] === 'string') {
    configKey = p[key]
  } else if (inner && typeof inner[key] === 'string') {
    configKey = inner[key]
  }

  return configKey in config ? (config as any)[configKey] : (config as any)[key]
}

/**
 * ChartTooltipContent: central safe-any wrapper.
 * Keep props:any to avoid Recharts type friction — same behavior as previous local component.
 */
export function ChartTooltipContent(props: any) {
  const {
    active,
    payload,
    className,
    indicator = 'dot',
    hideLabel = false,
    hideIndicator = false,
    label,
    labelFormatter,
    labelClassName,
    formatter,
    color,
    nameKey,
    labelKey,
    config,
    ...divProps
  } = props as any

  // config MUST be provided by caller (chart.tsx will inject via useChart or prop)
  const items = (payload as TooltipItem[]) || []
  if (!active || !items || !items.length) return null
  const nestLabel = items.length === 1 && indicator !== 'dot'

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !items || !items.length) return null
    const [item] = items as TooltipItem[]
    const key = `${labelKey || item?.dataKey || item?.name || 'value'}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === 'string'
        ? (config[label as keyof typeof config]?.label || label)
        : itemConfig?.label

    if (labelFormatter) {
      return (
        <div className={cn('font-medium', labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      )
    }
    return value ? (
      <div className={cn('font-medium', labelClassName)}>{value}</div>
    ) : null
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

  return (
    <div
      {...divProps}
      className={cn(
        'border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {items.map((item: TooltipItem, index: number) => {
          const key = `${nameKey || item.name || item.dataKey || 'value'}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor =
            color ||
            (item.payload && (item.payload as any).fill) ||
            item.color

          return (
            <div
              key={(item as any).dataKey ?? index}
              className={cn(
                '[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5',
                indicator === 'dot' ? 'items-center' : undefined,
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(
                  item.value as any,
                  item.name as any,
                  item as any,
                  index,
                  item.payload as any,
                )
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
                          {
                            'h-2.5 w-2.5': indicator === 'dot',
                            'w-1': indicator === 'line',
                            'w-0 border-[1.5px] border-dashed bg-transparent':
                              indicator === 'dashed',
                            'my-0.5': nestLabel && indicator === 'dashed',
                          },
                        )}
                        style={
                          {
                            '--color-bg': indicatorColor,
                            '--color-border': indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      'flex flex-1 justify-between leading-none',
                      nestLabel ? 'items-end' : 'items-center',
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value != null && (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {String(item.value)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Legend content wrapper */
export function ChartLegendContent(props: any) {
  const { className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey, config, ...divProps } = props as any
  const items = (payload as LegendItem[]) || []
  if (!items.length) return null

  return (
    <div
      {...divProps}
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {items.map((item: LegendItem, idx: number) => {
        const key = `${nameKey || item.dataKey || 'value'}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        return (
          <div
            key={item.value ?? idx}
            className="[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color as any }}
              />
            )}
            {itemConfig?.label}
          </div>
        )
      })}
    </div>
  )
}

// also export raw Recharts primitives for convenience
export const Tooltip = RechartsPrimitive.Tooltip
export const Legend = RechartsPrimitive.Legend