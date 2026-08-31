import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSettlement,
  proposeSettlement,
  toggleTransfer,
} from '@/lib/api/settlements';

/** 정산 현황 조회 */
export function useSettlement(tripId: string) {
  return useQuery({
    queryKey: ['settlement', tripId],
    queryFn: () => fetchSettlement(tripId),
    enabled: !!tripId,
  });
}

/** 정산안 생성 */
export function useProposeSettlement(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => proposeSettlement(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement', tripId] });
    },
  });
}

/** 송금 완료 토글 */
export function useToggleTransfer(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => toggleTransfer(tripId, transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement', tripId] });
    },
  });
}
