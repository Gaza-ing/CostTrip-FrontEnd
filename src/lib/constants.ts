/**
 * 앱 전역 상수
 */

/** 예산 카테고리 (6개) */
export const CATEGORIES = [
  { id: 'stay', label: '숙소', icon: '🏨' },
  { id: 'move', label: '교통', icon: '🚗' },
  { id: 'food', label: '식비', icon: '🍽️' },
  { id: 'tour', label: '관광', icon: '🎡' },
  { id: 'shop', label: '쇼핑', icon: '🛍️' },
  { id: 'etc', label: '기타', icon: '📦' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

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
