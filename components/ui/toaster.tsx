// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: components/ui/toaster.tsx
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

// Component: Toaster — entry point

export function Toaster() {
  const { toasts } = useToast()

  // Render: UI markup starts here

  return (

  <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        // Render: UI markup starts here
        return (
        <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
