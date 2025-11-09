// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: events.ts
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------
// lib/events.ts
import type { PlayCategory } from "./lib/types";

// 전역 선언 병합: 커스텀 이벤트 타입을 WindowEventMap에 등록
declare global {
  interface RecalculateCategoryDetail {
    category: PlayCategory;
  }
  interface WindowEventMap {
    recalculateCategory: CustomEvent<RecalculateCategoryDetail>;
  }
}

export {};
