import type { Trip, Day, Member, BudgetCategory } from '@/types';

export const mockTrips: Trip[] = [
  {
    id: 'trip-001',
    title: '오사카 우정여행',
    destination: '오사카',
    startDate: '2026-07-10',
    endDate: '2026-07-14',
    headcount: 4,
    totalBudget: 2400000,
    currencyCode: 'KRW',
    tripTimeZone: 'Asia/Tokyo',
    status: 'in_progress',
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-07-10T09:00:00Z',
  },
  {
    id: 'trip-002',
    title: '제주 힐링여행',
    destination: '제주',
    startDate: '2026-08-20',
    endDate: '2026-08-23',
    headcount: 2,
    totalBudget: 1200000,
    currencyCode: 'KRW',
    tripTimeZone: 'Asia/Seoul',
    status: 'planning',
    createdAt: '2026-07-15T09:00:00Z',
    updatedAt: '2026-07-15T09:00:00Z',
  },
  {
    id: 'trip-003',
    title: '도쿄 혼자여행',
    destination: '도쿄',
    startDate: '2026-05-01',
    endDate: '2026-05-05',
    headcount: 1,
    totalBudget: 1800000,
    currencyCode: 'KRW',
    tripTimeZone: 'Asia/Tokyo',
    status: 'completed',
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-05-05T18:00:00Z',
  },
];

export const mockDays: Day[] = [
  { id: 'day-001', tripId: 'trip-001', dayIndex: 0, date: '2026-07-10' },
  { id: 'day-002', tripId: 'trip-001', dayIndex: 1, date: '2026-07-11' },
  { id: 'day-003', tripId: 'trip-001', dayIndex: 2, date: '2026-07-12' },
  { id: 'day-004', tripId: 'trip-001', dayIndex: 3, date: '2026-07-13' },
  { id: 'day-005', tripId: 'trip-001', dayIndex: 4, date: '2026-07-14' },
];

export const mockMembers: Member[] = [
  {
    id: 'member-001',
    tripId: 'trip-001',
    userId: 'user-001',
    displayName: '종현',
    role: 'owner',
    inviteStatus: 'accepted',
  },
  {
    id: 'member-002',
    tripId: 'trip-001',
    userId: 'user-002',
    displayName: '민지',
    role: 'editor',
    inviteStatus: 'accepted',
  },
  {
    id: 'member-003',
    tripId: 'trip-001',
    userId: 'user-003',
    displayName: '수현',
    role: 'editor',
    inviteStatus: 'accepted',
  },
  {
    id: 'member-004',
    tripId: 'trip-001',
    userId: null,
    displayName: '지훈',
    role: 'viewer',
    inviteStatus: 'pending',
  },
];

export const mockBudgetCategories: BudgetCategory[] = [
  {
    id: 'bc-001',
    tripId: 'trip-001',
    categoryId: 'stay',
    budgetAmount: 600000,
  },
  {
    id: 'bc-002',
    tripId: 'trip-001',
    categoryId: 'move',
    budgetAmount: 400000,
  },
  {
    id: 'bc-003',
    tripId: 'trip-001',
    categoryId: 'food',
    budgetAmount: 500000,
  },
  {
    id: 'bc-004',
    tripId: 'trip-001',
    categoryId: 'tour',
    budgetAmount: 400000,
  },
  {
    id: 'bc-005',
    tripId: 'trip-001',
    categoryId: 'shop',
    budgetAmount: 300000,
  },
  { id: 'bc-006', tripId: 'trip-001', categoryId: 'etc', budgetAmount: 200000 },
];
