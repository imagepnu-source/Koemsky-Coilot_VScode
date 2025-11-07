import type { UIColors } from './defaultColors'

export function applyCssVars(colors: UIColors) {
  if (typeof document === 'undefined') return
  const r = document.documentElement

  r.style.setProperty('--ui-title', colors.title)
  r.style.setProperty('--ui-dropdown-bg', colors.dropdownBg)
  r.style.setProperty('--ui-dropdown-fg', colors.dropdownFg)
  r.style.setProperty('--ui-app-bg', colors.appBg)
  r.style.setProperty('--ui-card-bg', colors.cardBg)
  r.style.setProperty('--ui-card-fg', colors.cardFg)
  r.style.setProperty('--ui-play-card-fg', colors.playCardFg)
  r.style.setProperty('--ui-user-profile-fg', colors.userProfileFg)
  r.style.setProperty('--ui-age-badge-bg', colors.ageBadgeBg)
  r.style.setProperty('--ui-age-badge-fg', colors.ageBadgeFg)
  r.style.setProperty('--ui-accent', colors.accent)
  r.style.setProperty('--ui-border', colors.border)
  r.style.setProperty('--ui-muted-text', colors.mutedText)

  r.style.setProperty('--ui-age-badge-border', colors.ageBadgeBorder)
  r.style.setProperty('--ui-play-card-border', colors.cardBorder)
  r.style.setProperty('--ui-content-card-bg', colors.contentCardBg)
  r.style.setProperty('--ui-content-text', colors.detailBodyText)
  r.style.setProperty('--ui-content-card-border', colors.cardBorder)

  for (let i = 0; i <= 5; i++) {
    r.style.setProperty(`--ui-level-${i}-bg`, (colors as any)[`level${i}Bg`])
    r.style.setProperty(`--ui-level-${i}-fg`, (colors as any)[`level${i}Fg`])
  }

  r.style.setProperty('--ui-content-bg', colors.contentBg)
  r.style.setProperty('--ui-playlist-card-bg', colors.playListCardBg)

  r.style.setProperty('--background', colors.appBg)
  r.style.setProperty('--foreground', colors.cardFg)
  r.style.setProperty('--card', colors.cardBg)
  r.style.setProperty('--card-foreground', colors.cardFg)
  r.style.setProperty('--popover', colors.dropdownBg)
  r.style.setProperty('--popover-foreground', colors.dropdownFg)
  r.style.setProperty('--accent', colors.accent)
  r.style.setProperty('--accent-foreground', colors.cardFg)
  r.style.setProperty('--border', colors.border)
  r.style.setProperty('--muted-foreground', colors.mutedText)

  document.body.style.background = 'var(--background)'
  document.body.style.color = 'var(--foreground)'
}
