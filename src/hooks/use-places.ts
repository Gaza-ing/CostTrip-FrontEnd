import { useMutation, useQuery } from '@tanstack/react-query';
import {
  searchPlaces,
  areaBasedPlaces,
  areaCodes,
  estimatePlaceCost,
  nearbyPlaces,
  fetchPlaceDetailCard,
} from '@/lib/api/places';

/** 광주 지역코드 (TourAPI 표준). 지역특색형 기본 추천에 사용. */
export const GWANGJU_AREA_CODE = '5';

/**
 * 지역 기반 관광지 추천 (기본: 광주 관광지).
 * 여행 생성 목적지 추천 칩에 사용.
 */
export function useAreaBasedPlaces(
  areaCode: string = GWANGJU_AREA_CODE,
  options?: { contentTypeId?: string; numRows?: number; enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      'places',
      'area-based',
      areaCode,
      options?.contentTypeId ?? null,
      options?.numRows ?? 20,
    ],
    queryFn: () =>
      areaBasedPlaces(areaCode, {
        contentTypeId: options?.contentTypeId,
        numRows: options?.numRows,
      }),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 30, // 관광 데이터는 자주 안 바뀜
  });
}

/** 키워드로 장소 검색. keyword가 비면 비활성. */
export function useSearchPlaces(keyword: string) {
  const trimmed = keyword.trim();
  return useQuery({
    queryKey: ['places', 'search', trimmed],
    queryFn: () => searchPlaces(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

/** 지역코드 목록 (시·도 또는 하위 시군구). */
export function useAreaCodes(parent?: string) {
  return useQuery({
    queryKey: ['places', 'area-codes', parent ?? null],
    queryFn: () => areaCodes(parent),
    staleTime: Infinity, // 지역코드는 사실상 불변
  });
}

/**
 * 장소 예상 비용 추정 (선택 시점에 명령형 호출).
 * mutateAsync로 호출해 폼 "예상 비용"을 프리필한다.
 */
export function useEstimatePlaceCost() {
  return useMutation({
    mutationFn: ({
      contentId,
      contentTypeId,
    }: {
      contentId: string;
      contentTypeId: string;
    }) => estimatePlaceCost(contentId, contentTypeId),
  });
}

/**
 * 마커 클릭용 장소 상세 카드(사진·개요·요금).
 * contentId가 있을 때만 조회한다. TourAPI 호출이라 staleTime을 넉넉히 둔다.
 */
export function usePlaceDetailCard(contentId: string | null) {
  return useQuery({
    queryKey: ['places', 'detail-card', contentId],
    queryFn: () => fetchPlaceDetailCard(contentId as string),
    enabled: !!contentId,
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * 지도 중심 주변 관광지 검색 ("이 지역에서 찾기").
 * 버튼 클릭 시 mutateAsync로 호출해 지도에 마커로 뿌린다.
 */
export function useNearbyPlaces() {
  return useMutation({
    mutationFn: ({
      lat,
      lng,
      radius,
    }: {
      lat: number;
      lng: number;
      radius?: number;
    }) => nearbyPlaces(lat, lng, { radius }),
  });
}
