import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchExpenses,
  createExpense,
  deleteExpense,
  type ExpenseInput,
} from '@/lib/api/expenses';

/** 지출 목록 조회 */
export function useExpenses(tripId: string) {
  return useQuery({
    queryKey: ['expenses', tripId],
    queryFn: () => fetchExpenses(tripId),
    enabled: !!tripId,
  });
}

/** 지출 추가 */
export function useCreateExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => createExpense(tripId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', tripId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** 지출 삭제 */
export function useDeleteExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => deleteExpense(tripId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', tripId] });
    },
  });
}
