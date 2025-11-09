// lib/ui-types.ts
// Minimal, stable shared types used by UI editors and style application.
// Kept deliberately small to avoid ripple effects elsewhere.

export type BoxStyle = {
  bg: string;                  // background color
  padding: number;             // uniform padding (px)
  border: { width: number; color: string };
};

export type TextStyle = {
  size: number;                // font-size (px)
  bold: boolean;               // font-weight: 700 when true
  color: string;               // text color
};