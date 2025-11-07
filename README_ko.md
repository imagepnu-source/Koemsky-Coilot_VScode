# Name/Age Bold 토글 — 독립 위젯 (page.tsx 변경 없음)

UI Design 창에 체크박스가 보이지 않는 환경에서도, **확실히 보이고 동작**하도록
독립적인 작은 위젯을 제공합니다. (레이아웃에 한 줄로 마운트)

## 포함 파일
- `components/NameAgeBoldToggle.tsx` — 하단 우측에 작게 떠 있는 Bold On/Off 토글
- `styles/name-age-toggle.css` — 위젯 스타일

## 설치
1) 두 파일을 프로젝트에 복사
   - `components/NameAgeBoldToggle.tsx`
   - `styles/name-age-toggle.css`

2) `app/layout.tsx` 수정 (page.tsx는 건드리지 않음)
```tsx
import './globals.css';
import '../styles/name-age-toggle.css'; // ← 추가
import NameAgeBoldToggle from '@/components/NameAgeBoldToggle'; // 경로 alias가 없다면 상대경로로 변경

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <NameAgeBoldToggle />  {/* ← 하단 우측에 작은 토글이 항상 보입니다 */}
      </body>
    </html>
  );
}
```

## 동작
- On: `--ui-name-age-weight`를 `700`으로, Off: `400`으로 즉시 설정
- 값은 `localStorage('ui-name-age-bold')`에 저장되어 **다음 실행 시 자동 복원**
- **page.tsx 구조 변경 없음**
- 이미 넣어두신 `globals.css` 규칙과 자동 태깅 스크립트와 함께 동작합니다.

## 수동 복원 스크립트(선택, 이미 있다면 중복 금지)
`app/layout.tsx`에 다음 스크립트를 한 번만 추가하면, 초기 로드 시 자동 복원됩니다.
```tsx
<script
  dangerouslySetInnerHTML={{
    __html: "try{var s=localStorage.getItem('ui-name-age-bold');document.documentElement.style.setProperty('--ui-name-age-weight', s==='on'?'700':'400');}catch(e){}"
  }}
/>
```

## 문제 해결
- 토글은 보이는데 폰트가 안 바뀌면 → `globals.css` 맨 아래의 규칙이 있는지 재확인:
```css
:root { --ui-name-age-weight: 400; }
[data-ui="name-age"], #name-age, .name-age,
[data-ui="name-age"] *, #name-age * , .name-age * {
  font-weight: var(--ui-name-age-weight) !important;
}
```
- `document.querySelectorAll('[data-ui="name-age"]').length`가 0이면, 자동 태깅 스크립트가 필요합니다.
