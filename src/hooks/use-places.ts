import { useMutation, useQuery } from '@tanstack/react-query';
import {
  searchPlaces,
  areaBasedPlaces,
  areaCodes,
  estimatePlaceCost,
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
