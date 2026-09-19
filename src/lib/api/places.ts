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

/**
 * 좌표 주변 장소 검색 (TourAPI locationBasedList2).
 * 지도 중심 좌표 기준 반경 내 관광지 등을 찾아 마커로 표시하는 데 쓴다.
 */
export function nearbyPlaces(
  lat: number,
  lng: number,
  options?: { radius?: number },
): Promise<Place[]> {
  return apiClient.get<Place[]>('/places/nearby', {
    params: { lat, lng, radius: options?.radius ?? 2000 },
  });
}

/** 지역코드 목록. parent 없으면 시·도, 있으면 하위 시군구. */
export function areaCodes(parent?: string): Promise<AreaCode[]> {
  return apiClient.get<AreaCode[]>('/places/area-codes', {
    params: { parent },
  });
}

/** 비용 추정 신뢰도. high=실측 다건, medium=실측 단건/무료, low=카테고리 평균. */
export type CostConfidence = 'high' | 'medium' | 'low';

/** 추천 비용 범위(원). */
export interface CostRange {
  min: number;
  max: number;
}

/**
 * 비용 추정 응답 (백엔드 estimate_cost).
 *
 * TourAPI 비용 데이터가 상세하지 않아 단일값이 아니라
 * 대표값(amount) + 추천 범위(range) + 신뢰도(confidence) + 근거(basis)를 준다.
 */
export interface CostEstimate {
  /** 대표 추정 금액(원). null = 추정 불가 */
  amount: number | null;
  /** api = 관광공사 실측, category = 카테고리 평균 기반 추천 */
  source: 'api' | 'category' | null;
  currency: string;
  /** 통일 카테고리(폼 카테고리 프리필 힌트). */
  category?: string;
  /** 추천 범위. min==max면 단일값. */
  range?: CostRange;
  /** 신뢰도. */
  confidence?: CostConfidence;
  /** 사람이 읽는 근거 문자열. 예: "이용요금 실측 3,000~10,000원 (5건)" */
  basis?: string;
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
 * TourAPI 검색 결과(Place)에서 contentTypeId를 뽑는다.
 * 원본 raw.contenttypeid가 가장 정확하고, 없으면 통일 카테고리로 폴백.
 */
export function contentTypeIdForPlace(place: Place): string {
  const raw = place.raw?.contenttypeid;
  if (typeof raw === 'string' && raw) return raw;
  if (typeof raw === 'number') return String(raw);
  return contentTypeIdForCategory(place.category);
}

/**
 * 장소 예상 비용 추정(추천: 범위+신뢰도+근거).
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

/**
 * 마커 클릭용 장소 상세 카드 (백엔드 GET /places/detail-card/{contentId}).
 *
 * 카카오맵 앱 상세와 유사한 UX(사진·개요·요금)를 TourAPI 데이터로 재현한다.
 * detailCommon2(개요·대표이미지·연락처) + detailImage2(사진 갤러리)
 * + detailIntro2(이용시간·요금) + 비용추정을 한 번에 담아 준다.
 */
export interface PlaceDetailCard {
  externalId: string;
  provider: string;
  name: string;
  /** 통일 카테고리(sightseeing/lodging/food/...) */
  category: string;
  /** TourAPI 원본 타입(12/32/39 ...). 비용 재추정·일정 카테고리 매핑에 사용. */
  contentTypeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  tel?: string | null;
  /** homepage는 <a href> HTML로 오는 경우가 많다(그대로 렌더 주의). */
  homepage?: string | null;
  /** 개요(설명). HTML 개행(<br>)이 섞일 수 있다. */
  overview?: string | null;
  firstImage?: string | null;
  /** 사진 갤러리 URL 목록. */
  images: string[];
  useTime?: string | null;
  useFee?: string | null;
  costEstimate?: CostEstimate | null;
}

/** 장소 상세 카드 조회. contentId는 TourAPI externalId. */
export function fetchPlaceDetailCard(
  contentId: string,
): Promise<PlaceDetailCard> {
  return apiClient.get<PlaceDetailCard>(`/places/detail-card/${contentId}`);
}
