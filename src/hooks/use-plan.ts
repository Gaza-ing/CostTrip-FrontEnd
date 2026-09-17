import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDays } from '@/lib/api/days';
import {
  fetchPlanItems,
  createPlanItem,
  createPlanItemsBulk,
  updatePlanItem,
  deletePlanItem,
  fetchDaySummary,
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
