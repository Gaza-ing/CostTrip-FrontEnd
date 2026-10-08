import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchExpenses,
  fetchExpenseDetail,
  createExpense,
  updateExpense,
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

/** 지출 상세 조회(분담 포함). 수정 화면 프리필용. */
export function useExpenseDetail(tripId: string, expenseId: string | null) {
  return useQuery({
    queryKey: ['expense', tripId, expenseId],
    queryFn: () => fetchExpenseDetail(tripId, expenseId as string),
    enabled: !!tripId && !!expenseId,
  });
}

/** 지출 수정 */
export function useUpdateExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      expenseId,
      input,
    }: {
      expenseId: string;
      input: ExpenseInput;
    }) => updateExpense(tripId, expenseId, input),
    onSuccess: (_data, { expenseId }) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({
        queryKey: ['expense', tripId, expenseId],
      });
      queryClient.invalidateQueries({ queryKey: ['settlement', tripId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
