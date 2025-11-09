# 교체용 패치 (V1.94.0 색 토큰 확장)

## 포함 파일
- lib/theme/defaultColors.ts
- lib/theme/applyCssVars.ts
- app/ui-color-utilities.css

## 적용 방법
1) 압축을 프로젝트 루트에 풀어 덮어쓰기
2) app/globals.css 상단의 `@import "tailwindcss";` 아래에 한 줄 추가:
   ```css
   @import "./ui-color-utilities.css";
   ```
3) 컴포넌트 적용 예시
   - 리스트 카드: `className="play-card p-4"`
   - 디테일 섹션: `className="content-card p-4"`
   - 적정연령: `className="age-badge px-2 py-0.5 text-xs rounded"`
   - 레벨: `className="level-badge px-2 py-0.5 text-xs rounded"` + `data-level={0..5}`
   - 드롭다운 컨테이너: `className="dropdown-scope"`
4) pnpm dev 실행

## 기대 효과
- 리스트/디테일 카드 테두리 동기화
- 적정연령 테두리 독립 제어
- 레벨(0~5) 배경/글자 토큰화
- 드롭다운 하드코딩 색 우회
