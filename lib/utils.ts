// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: lib/utils.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Component: cn — entry point

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
