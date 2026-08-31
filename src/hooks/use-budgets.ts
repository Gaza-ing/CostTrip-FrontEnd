import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBudgets,
  saveBudgets,
  fetchBudgetCategories,
  type BudgetData,
} from '@/lib/api/budgets';

/** 예산 조회 (전체 + 카테고리별, 프론트 카테고리 id 기준) */
export function useBudgets(tripId: string) {
  return useQuery({
    queryKey: ['budgets', tripId],
    queryFn: () => fetchBudgets(tripId),
    enabled: !!tripId,
  });
}

/** 예산 카테고리 목록 (id ↔ key) */
export function useBudgetCategories(tripId: string) {
  return useQuery({
    queryKey: ['budget-categories', tripId],
    queryFn: () => fetchBudgetCategories(tripId),
    enabled: !!tripId,
  });
}

/** 예산 일괄 저장 */
export function useSaveBudgets(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetData) => saveBudgets(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
    },
  });
}
