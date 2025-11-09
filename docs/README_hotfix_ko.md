# V1.94.1 UI Color Hotfix

## 해결
- "놀이 요약카드 배경"을 일반 카드 배경과 분리 (playListCardBg)
- 패널 라벨 "보조 텍스트" → "발달 나이 색"
- .play-card가 --ui-playlist-card-bg를 우선 사용

## 적용
1) 압축을 프로젝트 루트에 풀어 덮어쓰기
2) (이미 했다면 생략) app/globals.css 상단 근처에 다음이 들어있어야 함:
   @import "./ui-color-utilities.css";
3) 실행: pnpm dev

## 체크
- 드롭다운 색: 컨테이너에 .dropdown-scope 적용 필수
- Main Content 배경: 리스트 래퍼에 .main-content 적용
- 적정연령 색: 해당 엘리먼트에 .age-badge 적용
- Title 글자색: h2에 style={{color:'var(--ui-title)'}} 적용
