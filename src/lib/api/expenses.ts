import type { Expense } from '@/types';
import { apiClient } from './client';
import { fetchBudgetCategories } from './budgets';
import { toFrontCategory, toBackendCategory } from '@/lib/category';

/**
 * 백엔드 Expense 응답(camel 변환 후).
 * - categoryId(백)는 BudgetCategory UUID → 프론트 카테고리 문자열로 매핑
 * - title(백) ↔ description(프)
 * - spentAt(백) ↔ createdAt(프)
 * - currencyCode 응답에 없음 → 'KRW' 기본
 */
interface BackendExpense {
  id: string;
  tripId: string;
  categoryId: string; // BudgetCategory UUID
  title: string;
  amount: number;
  paidByMemberId: string;
  splitMethod: string;
  isSettlementTarget: boolean;
  spentAt: string;
  memo: string | null;
}

/** 카테고리 UUID → 프론트 카테고리 id 맵을 만든다. */
async function buildCategoryMaps(tripId: string): Promise<{
  uuidToFront: Map<string, string>;
  frontToUuid: Map<string, string>;
}> {
  const categories = await fetchBudgetCategories(tripId);
  const uuidToFront = new Map<string, string>();
  const frontToUuid = new Map<string, string>();
  for (const c of categories) {
    uuidToFront.set(c.id, toFrontCategory(c.key));
    frontToUuid.set(toFrontCategory(c.key), c.id);
  }
  return { uuidToFront, frontToUuid };
}

function normalize(
  e: BackendExpense,
  uuidToFront: Map<string, string>,
): Expense {
  return {
    id: e.id,
    tripId: e.tripId,
    dayId: null,
    categoryId: uuidToFront.get(e.categoryId) ?? 'etc',
    amount: e.amount,
    currencyCode: 'KRW',
    description: e.title,
    paidByMemberId: e.paidByMemberId,
    splitMethod: e.splitMethod as Expense['splitMethod'],
    isSettlementTarget: e.isSettlementTarget,
    createdAt: e.spentAt,
    updatedAt: e.spentAt,
  };
}

/** 지출 목록 조회 (카테고리 매핑 포함). */
export async function fetchExpenses(tripId: string): Promise<Expense[]> {
  const [{ uuidToFront }, data] = await Promise.all([
    buildCategoryMaps(tripId),
    apiClient.get<BackendExpense[]>(`/trips/${tripId}/expenses`),
  ]);
  return data.map((e) => normalize(e, uuidToFront));
}

export interface ExpenseInput {
  categoryId: string; // 프론트 카테고리 id (stay/move/...)
  title: string;
  amount: number;
  paidByMemberId: string;
  splitMethod: 'equal' | 'ratio' | 'shares' | 'exact' | 'none';
  isSettlementTarget: boolean;
  participantIds: string[];
  dayId?: string | null;
  memo?: string | null;
  weights?: Record<string, number> | null;
  exactAmounts?: Record<string, number> | null;
}

/** 지출 추가. 프론트 카테고리 id를 BudgetCategory UUID로 변환해 전송. */
export async function createExpense(
  tripId: string,
  input: ExpenseInput,
): Promise<Expense> {
  const { uuidToFront, frontToUuid } = await buildCategoryMaps(tripId);
  const categoryUuid =
    frontToUuid.get(input.categoryId) ??
    frontToUuid.get(toFrontCategory(toBackendCategory(input.categoryId)));

  if (!categoryUuid) {
    throw new Error('카테고리를 찾을 수 없습니다.');
  }

  const created = await apiClient.post<BackendExpense>(
    `/trips/${tripId}/expenses`,
    {
      categoryId: categoryUuid,
      title: input.title,
      amount: input.amount,
      paidByMemberId: input.paidByMemberId,
      splitMethod: input.splitMethod,
      isSettlementTarget: input.isSettlementTarget,
      dayId: input.dayId ?? null,
      memo: input.memo ?? null,
      participantIds: input.participantIds,
      weights: input.weights ?? null,
      exactAmounts: input.exactAmounts ?? null,
    },
  );
  return normalize(created, uuidToFront);
}

/** 지출 삭제. */
export async function deleteExpense(
  tripId: string,
  expenseId: string,
): Promise<void> {
  await apiClient.delete<void>(`/trips/${tripId}/expenses/${expenseId}`);
}
