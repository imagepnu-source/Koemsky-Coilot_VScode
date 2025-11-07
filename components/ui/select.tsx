
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

// Soft-dependency: if the project has UIDesignContext, we'll adapt styles from it.
// We intentionally guard the import/use so this file works even if the Provider is not mounted.
let useUIDesign: null | (() => any) = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useUIDesign = require("@/context/UIDesignContext").useUIDesign
} catch (_) {
  useUIDesign = null
}

type DropStyle = {
  borderColor?: string
  borderWidth?: number
  radius?: number
  paddingX?: number
  paddingY?: number
  fontSize?: number
  backgroundColor?: string
  textColor?: string
  shadow?: string
}

function useDropdownStyle(): DropStyle {
  // Safe default styles
  const fallback: DropStyle = {
    borderColor: "rgba(0,0,0,0.20)",
    borderWidth: 1,
    radius: 8,
    paddingX: 12,
    paddingY: 8,
    fontSize: 14,
    backgroundColor: "var(--card)",
    textColor: "var(--foreground)",
    shadow: "0 1px 2px rgba(0,0,0,0.06)",
  }

  if (!useUIDesign) return fallback
  try {
    const ui = useUIDesign()
    // We accept multiple possible shapes to reduce coupling.
    const dd = ui?.dropdown ?? ui?.select ?? ui?.controls ?? {}
    return {
      borderColor: dd.borderColor ?? fallback.borderColor,
      borderWidth: typeof dd.borderWidth === "number" ? dd.borderWidth : fallback.borderWidth,
      radius: typeof dd.radius === "number" ? dd.radius : fallback.radius,
      paddingX: typeof dd.paddingX === "number" ? dd.paddingX : fallback.paddingX,
      paddingY: typeof dd.paddingY === "number" ? dd.paddingY : fallback.paddingY,
      fontSize: typeof dd.fontSize === "number" ? dd.fontSize : fallback.fontSize,
      backgroundColor: dd.backgroundColor ?? fallback.backgroundColor,
      textColor: dd.textColor ?? fallback.textColor,
      shadow: dd.shadow ?? fallback.shadow,
    }
  } catch {
    return fallback
  }
}

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, style, children, ...props }, ref) => {
  const d = useDropdownStyle()
  const mergedStyle: React.CSSProperties = {
    borderColor: d.borderColor,
    borderWidth: d.borderWidth,
    borderStyle: "solid",
    borderRadius: d.radius,
    paddingLeft: d.paddingX,
    paddingRight: d.paddingX,
    paddingTop: d.paddingY,
    paddingBottom: d.paddingY,
    fontSize: d.fontSize,
    backgroundColor: d.backgroundColor,
    color: d.textColor,
    boxShadow: d.shadow,
    ...style,
  }
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-between w-full",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={mergedStyle}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  const d = useDropdownStyle()
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden border bg-popover text-popover-foreground",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className
        )}
        sideOffset={8}
        style={{
          borderColor: d.borderColor,
          borderWidth: d.borderWidth,
          borderStyle: "solid",
          borderRadius: d.radius,
          backgroundColor: d.backgroundColor,
          color: d.textColor,
          boxShadow: d.shadow,
        }}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-medium", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
      "focus:bg-accent focus:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}
