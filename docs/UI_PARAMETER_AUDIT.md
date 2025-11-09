# UI Parameter 전수 조사 결과

## 1. 현재 파라미터 처리 방식 분석

### A. UI Design Dialog (UIDesignDialog.tsx)의 파라미터
**파일**: `components/UIDesignDialog.tsx`
**저장소**: `lib/ui-design.ts` (loadUIDesignCfg, saveUIDesignCfg)
**CSS 적용**: `applyUIDesignCSS()` 함수
**CSS 변수 접두사**: `--kp-*`

#### 상단 컨테이너 파라미터:
1. **topHeaderBox**: BoxCfg (bg, padding, border) - ❌ CSS 연결 없음
2. **title**: FontCfg (size, bold, color) - ✅ CSS 연결됨 (`--kp-title-*`)
3. **namebio**: FontCfg - ✅ CSS 연결됨 (`--kp-namebio-*`)
4. **devage**: FontCfg - ❌ CSS 연결 없음
5. **catag**: {size, bold} - ❌ CSS 연결 없음 (page.tsx에서 --ui-catag-color 사용하지만 설정되지 않음)
6. **dropdown**: DropdownCfg - ❌ CSS 연결 없음

#### 놀이 리스트 컨테이너 파라미터:
7. **playListBox**: BoxCfg - ❌ CSS 연결 없음
8. **activityBox**: SmallBoxCfg - ❌ CSS 연결 없음
9. **levelBadgeBox**: SmallBoxCfg - ❌ CSS 연결 없음
10. **activity**: FontCfg - ✅ CSS 연결됨 (`--kp-activity-*`)
11. **levelBadge**: LevelBadgeCfg - ❌ CSS 연결 없음
12. **ageBadge**: AgeBadgeCfg - ❌ CSS 연결 없음

#### Play Detail 탭 파라미터:
13. **detailSmallBox**: SmallBoxCfg - ❌ CSS 연결 없음
14. **detailTitle**: FontCfg - ✅ CSS 연결됨 (`--kp-detail-title-*`)
15. **detailBody**: FontCfg - ✅ CSS 연결됨 (`--kp-detail-body-*`)
16. **difficultyBox**: SmallBoxCfg - ❌ CSS 연결 없음
17. **difficultyText**: FontCfg - ❌ CSS 연결 없음

**결과**: 17개 파라미터 중 5개만 CSS 연결됨 (29% 작동)

---

### B. UISettingsContext의 파라미터
**파일**: `components/context/UISettingsContext.tsx`
**저장소**: localStorage `ui-settings:v1`
**CSS 적용**: useEffect에서 직접 CSS 변수 설정
**CSS 변수 접두사**: `--ui-*`, `--primary`

#### 파라미터:
1. **theme**: UITheme - ❌ CSS 연결 없음 (진단용만)
2. **primary**: string - ✅ CSS 연결됨 (`--primary`)
3. **radius**: number - ❌ CSS 연결 없음
4. **spacing**: number - ❌ CSS 연결 없음
5. **fontScale**: number - ❌ CSS 연결 없음
6. **nameAgeBold**: boolean - ✅ CSS 연결됨 (`--ui-name-age-weight`)
7. **activityNum**: FontCfg - ❌ CSS 연결 없음 (진단용만)
8. **activityTitle**: FontCfg - ❌ CSS 연결 없음 (진단용만)
9. **activityFont**: FontCfg - ❌ CSS 연결 없음 (진단용만)

**결과**: 9개 파라미터 중 2개만 CSS 연결됨 (22% 작동)

---

## 2. CSS 변수 충돌 및 불일치

### 문제점:
1. **접두사 불일치**: `--kp-*` vs `--ui-*` 두 가지 접두사 혼용
2. **UI 요소 연결 없음**: 
   - `page.tsx`의 `data-ui="title"` 요소는 CSS 변수를 사용하지 않고 Tailwind 클래스만 사용
   - `data-ui="namebio"`, `data-ui="devage"` 등도 마찬가지
3. **catag의 특이 케이스**: 
   - `page.tsx`에서 `var(--ui-catag-color)`를 사용하지만
   - `ui-design.ts`에서 `--ui-catag-color`를 설정하지 않음
   - `UISettingsContext`도 설정하지 않음

---

## 3. 실제 UI 요소 현황

### page.tsx의 UI 요소:
```tsx
<h2 data-ui="title" className="justify-self-center text-xl font-bold text-foreground">
  // Tailwind 클래스만 사용, CSS 변수 없음
</h2>

<div data-ui="namebio" className="text-center text-sm text-muted-foreground">
  // Tailwind 클래스만 사용, CSS 변수 없음
</div>

<div data-ui="devage" className="text-sm text-muted-foreground">
  // Tailwind 클래스만 사용, CSS 변수 없음
</div>

<div data-ui="catag" className="text-sm font-medium" style={{ color: "var(--ui-catag-color, inherit)" }}>
  // CSS 변수 사용하지만 설정되지 않음
</div>
```

---

## 4. 리팩토링 전략 제안

### Phase 1: 상단 컨테이너 통합 (프로토타입)
**목표**: title, namebio, devage, catag를 완전히 연결

#### 단계:
1. **CSS 변수 통일**:
   - `--kp-*` 접두사로 통일
   - `applyUIDesignCSS`에 devage, catag 추가

2. **page.tsx 수정**:
   ```tsx
   <h2 data-ui="title" style={{
     fontSize: 'var(--kp-title-size)',
     fontWeight: 'var(--kp-title-weight)',
     color: 'var(--kp-title-color)'
   }}>
   ```

3. **검증**:
   - UI Design Dialog에서 파라미터 변경
   - 실시간 UI 반영 확인
   - Save 후 새로고침해도 유지되는지 확인

### Phase 2: 나머지 파라미터 확산
- activityBox, levelBadge, ageBadge 등
- Box 파라미터들 (bg, border, radius 등)

### Phase 3: UISettingsContext 통합
- 두 시스템 중복 제거
- 단일 설정 소스로 통합

---

## 5. 즉시 수정이 필요한 버그

### Bug #1: catag Color 미연결
**현상**: `page.tsx`가 `--ui-catag-color`를 참조하지만 설정되지 않음
**수정**: `applyUIDesignCSS`에 추가 필요

### Bug #2: devage CSS 변수 미사용
**현상**: CSS 변수가 설정되지만 UI가 사용하지 않음
**수정**: `page.tsx`에서 inline style로 변경

### Bug #3: Box 파라미터 전체 미연결
**현상**: topHeaderBox, playListBox 등의 설정이 UI에 반영 안됨
**수정**: CSS 변수 생성 및 data-ui 요소에 적용

---

## 6. 권장 일관성 패턴

```typescript
// 1. ui-design.ts에서 CSS 변수 설정
set('--kp-title-size', cfg.title.size + 'px')
set('--kp-title-weight', cfg.title.bold ? '700' : '400')
set('--kp-title-color', cfg.title.color)

// 2. page.tsx에서 inline style 사용
<h2 data-ui="title" style={{
  fontSize: 'var(--kp-title-size)',
  fontWeight: 'var(--kp-title-weight)',
  color: 'var(--kp-title-color)'
}}>

// 3. Dialog에서 실시간 업데이트
React.useEffect(() => { applyUIDesignCSS(cfg); }, [cfg]);
```

---

## 다음 단계
1. ✅ 전수 조사 완료
2. ⏳ Phase 1 프로토타입 구현 (상단 컨테이너 4개 요소)
3. ⏳ 검증 및 테스트
4. ⏳ Phase 2 확산
5. ⏳ 최종 통합 및 정리
