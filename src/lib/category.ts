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

// ─────────────────────────────────────────────────────────────
// 일정(PlanItem) 전용 카테고리 매핑 — TourAPI 분류 기반.
// 예산용(위) 매핑과 별개. 일정 카테고리 id는 곧 백엔드 PlanItem.type 값.
// ─────────────────────────────────────────────────────────────

/** TourAPI contentTypeId → 일정 카테고리. */
export const CONTENT_TYPE_TO_PLAN_CATEGORY: Record<string, string> = {
  '12': 'attraction', // 관광지
  '14': 'culture', // 문화시설
  '15': 'festival', // 축제·공연·행사
  '25': 'attraction', // 여행코스 → 관광지로 흡수
  '28': 'leisure', // 레포츠
  '32': 'lodging', // 숙박
  '38': 'shopping', // 쇼핑
  '39': 'food', // 음식점
};

/**
 * 백엔드 통일 카테고리(sightseeing/lodging/food/shopping/etc) → 일정 카테고리.
 * contentTypeId가 없을 때의 폴백. sightseeing은 관광지로 대표.
 */
const UNIFIED_TO_PLAN_CATEGORY: Record<string, string> = {
  sightseeing: 'attraction',
  lodging: 'lodging',
  food: 'food',
  shopping: 'shopping',
  transport: 'transport',
  etc: 'etc',
};

/**
 * 장소 정보로 일정 카테고리를 정한다.
 * contentTypeId(가장 정확) 우선, 없으면 통일 카테고리로 폴백.
 */
export function toPlanCategory(opts: {
  contentTypeId?: string | null;
  unifiedCategory?: string | null;
}): string {
  const { contentTypeId, unifiedCategory } = opts;
  if (contentTypeId && CONTENT_TYPE_TO_PLAN_CATEGORY[contentTypeId]) {
    return CONTENT_TYPE_TO_PLAN_CATEGORY[contentTypeId];
  }
  if (unifiedCategory && UNIFIED_TO_PLAN_CATEGORY[unifiedCategory]) {
    return UNIFIED_TO_PLAN_CATEGORY[unifiedCategory];
  }
  return 'etc';
}

/**
 * 일정 카테고리 → 예산/지출 카테고리(stay/move/food/tour/shop/etc) 귀속.
 *
 * 일정은 TourAPI 분류로 세분화돼 있고, 예산은 6개다. 일정 항목의 예상 비용이
 * 어느 예산 카테고리에 속하는지 정한다:
 *   - 관광지/문화시설/축제·공연/레포츠 → 관광(tour)
 *   - 음식점 → 식비(food), 숙박 → 숙소(stay), 쇼핑 → 쇼핑(shop),
 *     교통 → 교통(move), 그 외 → 기타(etc)
 */
export function planCategoryToBudgetCategory(
  planCategory: string,
): 'stay' | 'move' | 'food' | 'tour' | 'shop' | 'etc' {
  switch (planCategory) {
    case 'lodging':
      return 'stay';
    case 'transport':
      return 'move';
    case 'food':
      return 'food';
    case 'shopping':
      return 'shop';
    case 'attraction':
    case 'culture':
    case 'festival':
    case 'leisure':
      return 'tour';
    default:
      return 'etc';
  }
}

/** Badge 색상은 예산 카테고리 귀속과 동일 기준을 쓴다. */
export const planCategoryColor = planCategoryToBudgetCategory;
