import { create } from 'zustand';
import type { Expense } from '@/types';

/** 지출 seed 데이터 (trip-001 오사카 여행) */
const SEED_EXPENSES: Expense[] = [
  {
    id: 'exp-001',
    tripId: 'trip-001',
    dayId: 'day-005',
    categoryId: 'food',
    amount: 8400,
    currencyCode: 'KRW',
    description: '도톤보리 타코야키',
    paidByMemberId: 'member-001',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-14T03:30:00Z',
    updatedAt: '2026-07-14T03:30:00Z',
  },
  {
    id: 'exp-002',
    tripId: 'trip-001',
    dayId: 'day-005',
    categoryId: 'tour',
    amount: 96000,
    currencyCode: 'KRW',
    description: '유니버셜 입장권',
    paidByMemberId: 'member-002',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-14T01:00:00Z',
    updatedAt: '2026-07-14T01:00:00Z',
  },
  {
    id: 'exp-003',
    tripId: 'trip-001',
    dayId: 'day-004',
    categoryId: 'move',
    amount: 12000,
    currencyCode: 'KRW',
    description: '지하철 1일권',
    paidByMemberId: 'member-003',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-13T00:15:00Z',
    updatedAt: '2026-07-13T00:15:00Z',
  },
  {
    id: 'exp-004',
    tripId: 'trip-001',
    dayId: 'day-004',
    categoryId: 'shop',
    amount: 64000,
    currencyCode: 'KRW',
    description: '신사이바시 쇼핑',
    paidByMemberId: 'member-004',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-13T07:40:00Z',
    updatedAt: '2026-07-13T07:40:00Z',
  },
  {
    id: 'exp-005',
    tripId: 'trip-001',
    dayId: 'day-005',
    categoryId: 'stay',
    amount: 150000,
    currencyCode: 'KRW',
    description: '호텔 마지막날',
    paidByMemberId: 'member-002',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-14T09:00:00Z',
    updatedAt: '2026-07-14T09:00:00Z',
  },
  {
    id: 'exp-006',
    tripId: 'trip-001',
    dayId: 'day-001',
    categoryId: 'stay',
    amount: 150000,
    currencyCode: 'KRW',
    description: '호텔 1박',
    paidByMemberId: 'member-002',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-10T06:00:00Z',
    updatedAt: '2026-07-10T06:00:00Z',
  },
  {
    id: 'exp-007',
    tripId: 'trip-001',
    dayId: 'day-002',
    categoryId: 'stay',
    amount: 150000,
    currencyCode: 'KRW',
    description: '호텔 2박',
    paidByMemberId: 'member-002',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-11T06:00:00Z',
    updatedAt: '2026-07-11T06:00:00Z',
  },
  {
    id: 'exp-008',
    tripId: 'trip-001',
    dayId: 'day-003',
    categoryId: 'stay',
    amount: 150000,
    currencyCode: 'KRW',
    description: '호텔 3박',
    paidByMemberId: 'member-002',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-12T06:00:00Z',
    updatedAt: '2026-07-12T06:00:00Z',
  },
  {
    id: 'exp-009',
    tripId: 'trip-001',
    dayId: 'day-001',
    categoryId: 'move',
    amount: 60000,
    currencyCode: 'KRW',
    description: '공항 리무진버스',
    paidByMemberId: 'member-001',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-10T02:00:00Z',
    updatedAt: '2026-07-10T02:00:00Z',
  },
  {
    id: 'exp-010',
    tripId: 'trip-001',
    dayId: 'day-001',
    categoryId: 'food',
    amount: 48000,
    currencyCode: 'KRW',
    description: '이치란 라멘',
    paidByMemberId: 'member-001',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-10T08:00:00Z',
    updatedAt: '2026-07-10T08:00:00Z',
  },
  {
    id: 'exp-011',
    tripId: 'trip-001',
    dayId: 'day-002',
    categoryId: 'tour',
    amount: 54000,
    currencyCode: 'KRW',
    description: '오사카성 입장료',
    paidByMemberId: 'member-001',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-11T02:00:00Z',
    updatedAt: '2026-07-11T02:00:00Z',
  },
  {
    id: 'exp-012',
    tripId: 'trip-001',
    dayId: 'day-002',
    categoryId: 'food',
    amount: 72000,
    currencyCode: 'KRW',
    description: '구로몬 시장',
    paidByMemberId: 'member-003',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-11T04:00:00Z',
    updatedAt: '2026-07-11T04:00:00Z',
  },
  {
    id: 'exp-013',
    tripId: 'trip-001',
    dayId: 'day-003',
    categoryId: 'food',
    amount: 56000,
    currencyCode: 'KRW',
    description: '스시 오마카세',
    paidByMemberId: 'member-001',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-12T08:00:00Z',
    updatedAt: '2026-07-12T08:00:00Z',
  },
  {
    id: 'exp-014',
    tripId: 'trip-001',
    dayId: 'day-003',
    categoryId: 'shop',
    amount: 120000,
    currencyCode: 'KRW',
    description: '돈키호테',
    paidByMemberId: 'member-003',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-12T06:00:00Z',
    updatedAt: '2026-07-12T06:00:00Z',
  },
  {
    id: 'exp-015',
    tripId: 'trip-001',
    dayId: 'day-002',
    categoryId: 'move',
    amount: 28000,
    currencyCode: 'KRW',
    description: '택시',
    paidByMemberId: 'member-001',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-11T10:00:00Z',
    updatedAt: '2026-07-11T10:00:00Z',
  },
  {
    id: 'exp-016',
    tripId: 'trip-001',
    dayId: 'day-003',
    categoryId: 'food',
    amount: 85600,
    currencyCode: 'KRW',
    description: '야키니쿠',
    paidByMemberId: 'member-002',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-12T09:00:00Z',
    updatedAt: '2026-07-12T09:00:00Z',
  },
  {
    id: 'exp-017',
    tripId: 'trip-001',
    dayId: 'day-004',
    categoryId: 'food',
    amount: 45000,
    currencyCode: 'KRW',
    description: '편의점+간식',
    paidByMemberId: 'member-004',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-13T03:00:00Z',
    updatedAt: '2026-07-13T03:00:00Z',
  },
  {
    id: 'exp-018',
    tripId: 'trip-001',
    dayId: 'day-004',
    categoryId: 'shop',
    amount: 156000,
    currencyCode: 'KRW',
    description: '약국 쇼핑',
    paidByMemberId: 'member-001',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-13T05:00:00Z',
    updatedAt: '2026-07-13T05:00:00Z',
  },
  {
    id: 'exp-019',
    tripId: 'trip-001',
    dayId: 'day-004',
    categoryId: 'move',
    amount: 36000,
    currencyCode: 'KRW',
    description: '교통카드 충전',
    paidByMemberId: 'member-003',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-13T01:00:00Z',
    updatedAt: '2026-07-13T01:00:00Z',
  },
  {
    id: 'exp-020',
    tripId: 'trip-001',
    dayId: 'day-005',
    categoryId: 'food',
    amount: 205000,
    currencyCode: 'KRW',
    description: '마지막 회식',
    paidByMemberId: 'member-001',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-14T08:00:00Z',
    updatedAt: '2026-07-14T08:00:00Z',
  },
  {
    id: 'exp-021',
    tripId: 'trip-001',
    dayId: 'day-005',
    categoryId: 'move',
    amount: 64000,
    currencyCode: 'KRW',
    description: '공항 리무진 복귀',
    paidByMemberId: 'member-002',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-14T10:00:00Z',
    updatedAt: '2026-07-14T10:00:00Z',
  },
  {
    id: 'exp-022',
    tripId: 'trip-001',
    dayId: 'day-001',
    categoryId: 'etc',
    amount: 80000,
    currencyCode: 'KRW',
    description: '포켓와이파이 대여',
    paidByMemberId: 'member-001',
    splitMethod: 'equal',
    isSettlementTarget: true,
    createdAt: '2026-07-10T01:00:00Z',
    updatedAt: '2026-07-10T01:00:00Z',
  },
];

interface ExpenseState {
  expenses: Expense[];

  // Actions
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: SEED_EXPENSES,

  addExpense: (expense) => set((s) => ({ expenses: [...s.expenses, expense] })),

  updateExpense: (id, updates) =>
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),

  deleteExpense: (id) =>
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
}));

// ─── Selectors (컴포넌트에서 사용) ───

/** tripId로 필터된 지출 목록 */
export function selectExpensesByTrip(
  expenses: Expense[],
  tripId: string,
): Expense[] {
  return expenses.filter((e) => e.tripId === tripId);
}

/** 카테고리별 실지출 합계 */
export function selectSpentByCategory(
  expenses: Expense[],
  tripId: string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of expenses) {
    if (e.tripId !== tripId) continue;
    result[e.categoryId] = (result[e.categoryId] || 0) + e.amount;
  }
  return result;
}

/** 전체 실지출 합계 */
export function selectTotalSpent(expenses: Expense[], tripId: string): number {
  return expenses
    .filter((e) => e.tripId === tripId)
    .reduce((sum, e) => sum + e.amount, 0);
}

/** 일자(dayId)별 지출 합계 */
export function selectDailyExpenses(
  expenses: Expense[],
  tripId: string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of expenses) {
    if (e.tripId !== tripId || !e.dayId) continue;
    result[e.dayId] = (result[e.dayId] || 0) + e.amount;
  }
  return result;
}

/** 최근 N건 지출 (최신순) */
export function selectRecentExpenses(
  expenses: Expense[],
  tripId: string,
  limit = 5,
): Expense[] {
  return expenses
    .filter((e) => e.tripId === tripId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}
