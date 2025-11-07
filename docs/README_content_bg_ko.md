# contentBg 추가 패치 (V1.94.0)

## 포함 파일
- lib/theme/defaultColors.ts  (UIColors.contentBg + 기본값)
- lib/theme/applyCssVars.ts   (--ui-content-bg 매핑)
- components/ColorSettingsDialog.tsx  (패널에 "Main Content 배경" 항목 추가)
- app/ui-color-utilities.css  (.main-content 유틸 클래스)

## 적용
1) 압축을 프로젝트 루트에 풀어 **덮어쓰기**
2) app/globals.css 상단 `@import "tailwindcss";` 아래에 한 줄 추가(이미 있으면 생략):
   ```css
   @import "./ui-color-utilities.css";
   ```
3) 카드 리스트를 감싸는 섹션에 `className="main-content"` 적용
   ```tsx
   <section className="main-content">
     {/* B 카드들 */}
   </section>
   ```
4) `pnpm dev` 실행 후, 🎨 패널의 "Main Content 배경"으로 B와 B 사이 공간 색을 조정하세요.
