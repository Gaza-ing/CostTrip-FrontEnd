import { apiClient } from './client';
import { toFrontCategory } from '@/lib/category';

interface BackendBudgetCategory {
  id: string;
  key: string;
  name: string;
  iconName: string | null;
  sortOrder: number;
}

interface BackendBudget {
  id: string;
  categoryId: string | null;
  plannedAmount: number;
  currencyCode: string;
}

/**
 * 프론트에서 다루기 쉬운 예산 형태.
 * - totalBudget: 전체 예산
 * - categoryBudgets: 프론트 카테고리 id(stay/move/...) → 금액
 */
export interface BudgetData {
  totalBudget: number;
  categoryBudgets: Record<string, number>;
}

/** 예산 카테고리 목록 (id ↔ key 매핑). 다른 리소스에서도 재사용. */
export function fetchBudgetCategories(
  tripId: string,
): Promise<BackendBudgetCategory[]> {
  return apiClient.get<BackendBudgetCategory[]>(
    `/trips/${tripId}/budget-categories`,
  );
}

/**
 * 예산 조회. budget-categories와 budgets를 함께 읽어
 * 프론트 카테고리 id 기준 금액 맵으로 정규화한다.
 */
export async function fetchBudgets(tripId: string): Promise<BudgetData> {
  const [categories, budgets] = await Promise.all([
    fetchBudgetCategories(tripId),
    apiClient.get<BackendBudget[]>(`/trips/${tripId}/budgets`),
  ]);

  // categoryId(UUID) → 프론트 카테고리 id
  const catIdToFront = new Map<string, string>();
  for (const c of categories) {
    catIdToFront.set(c.id, toFrontCategory(c.key));
  }

  let totalBudget = 0;
  const categoryBudgets: Record<string, number> = {};
  for (const b of budgets) {
    if (b.categoryId === null) {
      totalBudget = b.plannedAmount;
    } else {
      const frontId = catIdToFront.get(b.categoryId);
      if (frontId) categoryBudgets[frontId] = b.plannedAmount;
    }
  }

  return { totalBudget, categoryBudgets };
}

/**
 * 예산 저장. 프론트 카테고리 id 맵을 백엔드 category_id(UUID) 기준으로 변환해 전송.
 * budget-categories를 조회해 프론트 id → UUID 역매핑을 만든다.
 */
export async function saveBudgets(
  tripId: string,
  data: BudgetData,
): Promise<void> {
  const categories = await fetchBudgetCategories(tripId);

  // 프론트 카테고리 id → BudgetCategory UUID
  const frontToCatId = new Map<string, string>();
  for (const c of categories) {
    frontToCatId.set(toFrontCategory(c.key), c.id);
  }

  const categoryBudgetItems = Object.entries(data.categoryBudgets)
    .map(([frontId, amount]) => {
      const categoryId = frontToCatId.get(frontId);
      if (!categoryId) return null;
      return { categoryId, plannedAmount: amount };
    })
    .filter((x): x is { categoryId: string; plannedAmount: number } => !!x);

  await apiClient.put<{ message: string }>(`/trips/${tripId}/budgets`, {
    totalBudget: data.totalBudget,
    categoryBudgets: categoryBudgetItems,
  });
}
