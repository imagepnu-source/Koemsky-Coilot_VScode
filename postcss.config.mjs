// Tailwind v4 전용 PostCSS 설정 (ESM)
export default {
  plugins: {
    "@tailwindcss/postcss": {}, // ← 핵심: tailwindcss가 아니라 이 패키지
    autoprefixer: {},
  },
}
