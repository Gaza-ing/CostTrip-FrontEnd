import { apiClient } from './client';

/** 백엔드 NormalizedPlace(camelCase 변환 후) 형태. */
export interface Place {
  provider: string;
  externalId: string;
  name: string;
  latitude: number;
  longitude: number;
  /** lodging/transport/food/sightseeing/shopping/etc */
  category: string;
  address?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  priceLevel?: number | null;
  raw?: Record<string, unknown>;
}

/** 지역코드 항목 (TourAPI areaCode2). */
export interface AreaCode {
  code: string;
  name: string;
}

/** 키워드로 장소 검색 (TourAPI searchKeyword2). 백엔드 파라미터명은 q. */
export function searchPlaces(
  keyword: string,
  provider = 'tour_api',
): Promise<Place[]> {
  return apiClient.get<Place[]>('/places/search', {
    params: { q: keyword, provider },
  });
}

/**
 * 지역 기반 관광지 목록 (TourAPI areaBasedList2).
 * areaCode: 시·도 코드 (광주=5). contentTypeId 예: 12 관광지, 39 음식점.
 */
export function areaBasedPlaces(
  areaCode: string,
  options?: { contentTypeId?: string; numRows?: number },
): Promise<Place[]> {
  return apiClient.get<Place[]>('/places/area-based', {
    params: {
      areaCode,
      contentTypeId: options?.contentTypeId,
      numRows: options?.numRows ?? 20,
    },
  });
}

/** 지역코드 목록. parent 없으면 시·도, 있으면 하위 시군구. */
export function areaCodes(parent?: string): Promise<AreaCode[]> {
  return apiClient.get<AreaCode[]>('/places/area-codes', {
    params: { parent },
  });
}

/** 비용 추정 응답 (백엔드 estimate_cost). */
export interface CostEstimate {
  /** 추정 금액(원). null = 추정 불가 */
  amount: number | null;
  /** api = 관광공사 실측, category = 카테고리 기본값 */
  source: 'api' | 'category' | null;
  currency: string;
}

/** 통일 카테고리 → 대표 TourAPI contentTypeId (비용 추정 힌트용). */
const CATEGORY_TO_CONTENT_TYPE: Record<string, string> = {
  sightseeing: '12',
  lodging: '32',
  food: '39',
  shopping: '38',
  // transport/etc는 대응 타입이 마땅치 않아 관광지로 폴백
};

/** Place.category → contentTypeId (없으면 관광지 12). */
export function contentTypeIdForCategory(category: string): string {
  return CATEGORY_TO_CONTENT_TYPE[category] ?? '12';
}

/**
 * 장소 예상 비용 추정 (3단 폴백 중 API→카테고리).
 * contentId는 TourAPI 장소의 externalId, contentTypeId는 관광타입.
 */
export function estimatePlaceCost(
  contentId: string,
  contentTypeId: string,
): Promise<CostEstimate> {
  return apiClient.get<CostEstimate>(`/places/estimate-cost/${contentId}`, {
    params: { contentTypeId },
  });
}
