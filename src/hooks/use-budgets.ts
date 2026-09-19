import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBudgets,
  saveBudgets,
  fetchBudgetCategories,
  type BudgetData,
} from '@/lib/api/budgets';
import { fetchPlanCostSummary } from '@/lib/api/plan-items';

/** 여행 전체 일정의 카테고리별 예상비용 합계(예산 페이지 '예상 지출'용) */
export function usePlanCostSummary(tripId: string) {
  return useQuery({
    queryKey: ['plan-cost-summary', tripId],
    queryFn: () => fetchPlanCostSummary(tripId),
    enabled: !!tripId,
  });
}

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
    mutationFn: (
      data: BudgetData & {
        warningThreshold?: number;
        overThreshold?: number;
      },
    ) => saveBudgets(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
    },
  });
}
