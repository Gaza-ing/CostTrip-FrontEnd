/**
 * 프론트 카테고리 id ↔ 백엔드 카테고리 key 매핑.
 *
 * 프론트 UI는 stay/move/food/tour/shop/etc 를 쓰고,
 * 백엔드(BudgetCategory.key)는 lodging/transport/food/sightseeing/shopping/etc 를 쓴다.
 */

export const FRONT_TO_BACKEND_CATEGORY: Record<string, string> = {
  stay: 'lodging',
  move: 'transport',
  food: 'food',
  tour: 'sightseeing',
  shop: 'shopping',
  etc: 'etc',
};

export const BACKEND_TO_FRONT_CATEGORY: Record<string, string> = {
  lodging: 'stay',
  transport: 'move',
  food: 'food',
  sightseeing: 'tour',
  shopping: 'shop',
  etc: 'etc',
};

/** 프론트 카테고리 id → 백엔드 key (알 수 없으면 etc) */
export function toBackendCategory(frontId: string): string {
  return FRONT_TO_BACKEND_CATEGORY[frontId] ?? 'etc';
}

/** 백엔드 key → 프론트 카테고리 id (알 수 없으면 etc) */
export function toFrontCategory(backendKey: string): string {
  return BACKEND_TO_FRONT_CATEGORY[backendKey] ?? 'etc';
}
