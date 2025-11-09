# UI 색상 팝업 설치 가이드 (V1.94.0, 안전 패치)
> 이 패치는 `globals.css`를 절대 수정하지 않습니다.

## 1) 폴더 복사
압축을 풀고 아래 경로로 복사합니다. (없는 폴더는 생성됨)
- `context/ColorSettingsContext.tsx`
- `lib/theme/defaultColors.ts`
- `lib/theme/applyCssVars.ts`
- `components/ColorSettingsDialog.tsx`
- `components/RegisterColorOpener.tsx`
- `components/ColorSettingsFab.tsx`
- (선택) `public/colorsOfUI.json`

## 2) 레이아웃에 Provider/팝업/버튼 연결
파일: `app/layout.tsx` 상단
```ts
import { ColorSettingsProvider } from "@/context/ColorSettingsContext"
import ColorSettingsDialog from "@/components/ColorSettingsDialog"
import RegisterColorOpener from "@/components/RegisterColorOpener"
import ColorSettingsFab from "@/components/ColorSettingsFab"
```

`<body>` 내부에 아래를 추가하세요.
```tsx
<ColorSettingsProvider>
  {children}
  <ColorSettingsDialog />
  <RegisterColorOpener />
  <ColorSettingsFab />
</ColorSettingsProvider>
```

## 3) 안전 기본값(선택)
예: body 배경
```tsx
<body style={{ background: 'var(--ui-app-bg, #ffffff)' }}>
```

## 4) 사용법
- 우하단 🎨 버튼 클릭 → 색 변경 → 즉시 미리보기
- 브라우저 LocalStorage('colorsOfUI')에 저장
- `public/colorsOfUI.json`이 있으면 최초 로드시 프리셋으로 사용

## 5) 주의
- Tailwind v4.1.14 기준 (OK)
- 플러그인은 설정파일에서 등록하세요 (CSS에서 @plugin 사용하지 않음)
- 워크스페이스 `.vscode/settings.json` 적용으로 경고(Unknown at rule) 0 유지
