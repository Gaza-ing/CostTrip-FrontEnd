import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTrips,
  fetchTrip,
  createTrip,
  updateTrip,
  deleteTrip,
} from '@/lib/api';
import type { Trip } from '@/types';

/** 여행 목록 조회 */
export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });
}

/** 여행 단건 조회 */
export function useTrip(tripId: string) {
  return useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => fetchTrip(tripId),
    enabled: !!tripId,
  });
}

/** 여행 생성 */
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<
        Trip,
        | 'id'
        | 'createdAt'
        | 'updatedAt'
        | 'budgetWarningThreshold'
        | 'budgetOverThreshold'
      >,
    ) => createTrip(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

/** 여행 수정 */
export function useUpdateTrip(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      patch: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>,
    ) => updateTrip(tripId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
      // 기간 변경 시 Day가 서버에서 재조정되므로 일정/요약 캐시도 갱신한다.
      queryClient.invalidateQueries({ queryKey: ['days', tripId] });
      queryClient.invalidateQueries({ queryKey: ['days-overview', tripId] });
      queryClient.invalidateQueries({ queryKey: ['plan-items', tripId] });
      queryClient.invalidateQueries({ queryKey: ['day-summary', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({
        queryKey: ['plan-cost-summary', tripId],
      });
    },
  });
}

/** 여행 삭제 */
export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
