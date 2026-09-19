/**
 * 앱 전역 상수
 */

/** 예산 카테고리 (6개). 아이콘은 lib/category-icons.tsx의 CategoryIcon 사용 */
// 예산/지출용 카테고리(6개). 일정용 PLAN_CATEGORIES와 별개.
export const CATEGORIES = [
  { id: 'stay', label: '숙소' },
  { id: 'move', label: '교통' },
  { id: 'food', label: '식비' },
  { id: 'tour', label: '관광' },
  { id: 'shop', label: '쇼핑' },
  { id: 'etc', label: '기타' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

/**
 * 일정(PlanItem) 전용 카테고리 — 한국관광공사(TourAPI) 분류 기반.
 * 예산/지출용 CATEGORIES(6개)와 별개다. 여기 id가 곧 백엔드 PlanItem.type 값.
 *   관광지/문화시설/축제·공연/레포츠/숙박/쇼핑/음식점/교통/기타
 */
export const PLAN_CATEGORIES = [
  { id: 'attraction', label: '관광지' },
  { id: 'culture', label: '문화시설' },
  { id: 'festival', label: '축제·공연' },
  { id: 'leisure', label: '레포츠' },
  { id: 'lodging', label: '숙박' },
  { id: 'food', label: '음식점' },
  { id: 'shopping', label: '쇼핑' },
  { id: 'transport', label: '교통' },
  { id: 'etc', label: '기타' },
] as const;

export type PlanCategoryId = (typeof PLAN_CATEGORIES)[number]['id'];

/** 여행 상태 */
export const TRIP_STATUS = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

/** 분담 방식 */
export const SPLIT_METHOD = {
  EQUAL: 'equal',
  RATIO: 'ratio',
  SHARES: 'shares',
  EXACT: 'exact',
  NONE: 'none',
} as const;
