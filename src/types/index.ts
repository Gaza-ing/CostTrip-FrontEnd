/**
 * 공통 타입 정의
 * 데이터 모델: docs/spec/foundation/data-model/spec.md
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  defaultCurrencyCode: string;
  locale: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string; // ISO date
  endDate: string;
  headcount: number;
  totalBudget: number; // KRW (정수, 원 단위)
  currencyCode: string; // 현재 'KRW' 고정
  tripTimeZone: string; // e.g. 'Asia/Tokyo'
  status: 'planning' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface Day {
  id: string;
  tripId: string;
  dayIndex: number; // 0-based
  date: string; // ISO date
}

export interface PlanItem {
  id: string;
  dayId: string;
  categoryId: string;
  title: string;
  estimatedCost: number;
  startTime?: string;
  endTime?: string;
  latitude?: number;
  longitude?: number;
  sortOrder: number;
}

export interface Expense {
  id: string;
  tripId: string;
  dayId: string | null;
  categoryId: string;
  amount: number; // 양수=지출, 음수=환불
  currencyCode: string;
  description: string;
  paidByMemberId: string;
  splitMethod: 'equal' | 'ratio' | 'shares' | 'exact' | 'none';
  isSettlementTarget: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  tripId: string;
  userId: string | null; // null = 가상 멤버
  displayName: string;
  type: 'registered' | 'placeholder';
  role: 'owner' | 'editor' | 'viewer';
  inviteStatus: 'invited' | 'accepted' | 'declined' | 'left';
  joinedAt: string | null;
}

export interface Invite {
  inviteLink: string;
  inviteCode: string;
  expiresAt: string;
}

export interface MemberBalance {
  memberId: string;
  displayName: string;
  paid: number; // 결제 총액
  owed: number; // 부담 총액
  net: number; // 순잔액 (양수=받을, 음수=낼)
}

export interface Transfer {
  id: string | null;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  isSettled: boolean;
}

export interface SettlementSummary {
  totalSettlementAmount: number;
  perPersonAverage: number;
  balances: MemberBalance[];
  transfers: Transfer[];
}

export type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'category_warning'
  | 'category_exceeded'
  | 'pace_warning'
  | 'settlement'
  | 'member_expense'
  | 'invite'
  | 'info';

export interface Notification {
  id: string;
  tripId: string;
  type: NotificationType;
  level: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  isRead: boolean;
  triggeredAt: string;
}

export interface BudgetCategory {
  id: string;
  tripId: string;
  categoryId: string;
  budgetAmount: number;
}
