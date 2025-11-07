// Auto-patch: adds missing UIColors keys (playCardFg, userProfileFg, cardBorder, detailBodyText)
export type UIColors = {
  title: string
  dropdownBg: string
  dropdownFg: string
  appBg: string
  cardBg: string
  cardFg: string
  ageBadgeBg: string
  ageBadgeFg: string
  accent: string
  border: string
  mutedText: string

  // New tokens
  playCardFg: string
  userProfileFg: string
  cardBorder: string
  detailBodyText: string

  ageBadgeBorder: string
  playCardBorder: string
  contentCardBg: string
  contentCardBorder: string

  level0Bg: string; level0Fg: string
  level1Bg: string; level1Fg: string
  level2Bg: string; level2Fg: string
  level3Bg: string; level3Fg: string
  level4Bg: string; level4Fg: string
  level5Bg: string; level5Fg: string

  contentBg: string
  playListCardBg: string
}

export const defaultColors: UIColors = {
  title: "#0f172a",
  dropdownBg: "#ffffff",
  dropdownFg: "#0f172a",
  appBg: "#f8fafc",
  cardBg: "#ffffff",
  cardFg: "#0f172a",

  // Added keys
  playCardFg: "#0f172a",
  userProfileFg: "#0f172a",
  cardBorder: "#e5e7eb",
  detailBodyText: "#111827",

  ageBadgeBg: "#eef2ff",
  ageBadgeFg: "#3730a3",
  accent: "#1d4ed8",
  border: "#e5e7eb",
  mutedText: "#6b7280",

  ageBadgeBorder: "#c7d2fe",
  playCardBorder: "#e5e7eb",
  contentCardBg: "#ffffff",
  contentCardBorder: "#e5e7eb",

  level0Bg: "#f3f4f6", level0Fg: "#111827",
  level1Bg: "#dcfce7", level1Fg: "#065f46",
  level2Bg: "#e0f2fe", level2Fg: "#075985",
  level3Bg: "#ffe4e6", level3Fg: "#9f1239",
  level4Bg: "#fef3c7", level4Fg: "#92400e",
  level5Bg: "#ede9fe", level5Fg: "#5b21b6",

  contentBg: "#f9fafb",
  playListCardBg: "#ffffff"
}
