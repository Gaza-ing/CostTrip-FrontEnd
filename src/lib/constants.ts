/**
 * 앱 전역 상수
 */

/** 예산 카테고리 (6개). 아이콘은 lib/category-icons.tsx의 CategoryIcon 사용 */
export const CATEGORIES = [
  { id: 'stay', label: '숙소' },
  { id: 'move', label: '교통' },
  { id: 'food', label: '식비' },
  { id: 'tour', label: '관광' },
  { id: 'shop', label: '쇼핑' },
  { id: 'etc', label: '기타' },
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
