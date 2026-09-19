import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDays } from '@/lib/api/days';
import {
  fetchPlanItems,
  createPlanItem,
  createPlanItemsBulk,
  updatePlanItem,
  deletePlanItem,
  reorderPlanItems,
  fetchDaySummary,
  fetchDaysOverview,
  fetchGapSuggestions,
  fetchRouteLegs,
  type PlanItemInput,
} from '@/lib/api/plan-items';

/** 여행 일자 목록 */
export function useDays(tripId: string, tripStartDate?: string) {
  return useQuery({
    queryKey: ['days', tripId],
    queryFn: () => fetchDays(tripId, tripStartDate),
    enabled: !!tripId,
  });
}

/** 일자별 일정 항목 목록 */
export function usePlanItems(tripId: string, dayId: string | undefined) {
  return useQuery({
    queryKey: ['plan-items', tripId, dayId],
    queryFn: () => fetchPlanItems(tripId, dayId as string),
    enabled: !!tripId && !!dayId,
  });
}

/** 일정 항목 추가 */
export function useCreatePlanItem(tripId: string, dayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      dayDate,
    }: {
      input: PlanItemInput;
      dayDate?: string;
    }) => createPlanItem(tripId, dayId, input, dayDate),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['plan-items', tripId, dayId],
      });
      queryClient.invalidateQueries({
        queryKey: ['day-summary', tripId, dayId],
      });
      queryClient.invalidateQueries({
        queryKey: ['gap-suggestions', tripId, dayId],
      });
    },
  });
}

/** 일정 항목 수정 */
export function useUpdatePlanItem(tripId: string, dayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      patch,
      dayDate,
    }: {
      itemId: string;
      patch: Partial<PlanItemInput>;
      dayDate?: string;
    }) => updatePlanItem(tripId, itemId, patch, dayDate),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['plan-items', tripId, dayId],
      });
    },
  });
}

/** 일정 항목 삭제 */
export function useDeletePlanItem(tripId: string, dayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deletePlanItem(tripId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['plan-items', tripId, dayId],
      });
      queryClient.invalidateQueries({
        queryKey: ['day-summary', tripId, dayId],
      });
      queryClient.invalidateQueries({
        queryKey: ['gap-suggestions', tripId, dayId],
      });
    },
  });
}

/**
 * 일정 항목 순서 일괄 변경(드래그앤드롭).
 * 드래그 후의 최종 순서(itemIds)를 보내면 서버가 sortOrder를 재부여한다.
 * 성공 시 서버가 돌려준 정렬 결과로 캐시를 즉시 갱신한다.
 */
export function useReorderPlanItems(tripId: string, dayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) => reorderPlanItems(tripId, dayId, itemIds),
    onSuccess: (items) => {
      // 서버 정렬 결과를 캐시에 즉시 반영(재요청 없이 순서 확정)
      queryClient.setQueryData(['plan-items', tripId, dayId], items);
      queryClient.invalidateQueries({
        queryKey: ['day-summary', tripId, dayId],
      });
    },
  });
}

/** Day 요약 (항목수/이동/거리/시간/합계비용) */
export function useDaySummary(tripId: string, dayId: string | undefined) {
  return useQuery({
    queryKey: ['day-summary', tripId, dayId],
    queryFn: () => fetchDaySummary(tripId, dayId as string),
    enabled: !!tripId && !!dayId,
  });
}

/** 여행 전체 Day별 요약(메인 페이지 타임라인: 제목 목록 + 예상비용 합) */
export function useDaysOverview(tripId: string) {
  return useQuery({
    queryKey: ['days-overview', tripId],
    queryFn: () => fetchDaysOverview(tripId),
    enabled: !!tripId,
  });
}

/**
 * 동선 사이 관광지 추천.
 * 좌표 있는 항목이 2개 이상일 때만 의미가 있으므로 enabled로 제어한다.
 * TourAPI 호출이 있어 staleTime을 넉넉히 둔다.
 */
export function useGapSuggestions(
  tripId: string,
  dayId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['gap-suggestions', tripId, dayId],
    queryFn: () => fetchGapSuggestions(tripId, dayId as string),
    enabled: !!tripId && !!dayId && enabled,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * 구간별 자동차 이동시간(지도 동선 위 라벨용).
 * 지도에 그리는 좌표 순서 그대로 넘기면, 인접 구간마다 시간을 받는다.
 * 좌표가 바뀌면(추가/삭제/순서변경) 자동 재조회.
 */
export function useRouteLegs(
  points: { latitude: number; longitude: number }[],
) {
  // 좌표 목록을 문자열 키로 만들어 동일 동선은 캐시 재사용
  const key = points.map((p) => `${p.latitude},${p.longitude}`).join('|');
  return useQuery({
    queryKey: ['route-legs', key],
    queryFn: () => fetchRouteLegs(points),
    enabled: points.length >= 2,
    staleTime: 1000 * 60 * 10,
  });
}

/** 여러 날에 동일 일정 항목 추가 (벌크) */
export function useCreatePlanItemsBulk(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      dayIds,
      input,
      dayDate,
    }: {
      dayIds: string[];
      input: PlanItemInput;
      dayDate?: string;
    }) => createPlanItemsBulk(tripId, dayIds, input, dayDate),
    onSuccess: (_data, variables) => {
      // 영향받은 각 Day의 일정 목록 + 요약 캐시 무효화
      variables.dayIds.forEach((dayId) => {
        queryClient.invalidateQueries({
          queryKey: ['plan-items', tripId, dayId],
        });
        queryClient.invalidateQueries({
          queryKey: ['day-summary', tripId, dayId],
        });
      });
    },
  });
}
