import { create } from 'zustand';
import type { Member } from '@/types';

/** 멤버 seed 데이터 (trip-001 오사카 여행) */
const SEED_MEMBERS: Member[] = [
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
    inviteStatus: 'accepted',
  },
];

interface MemberState {
  members: Member[];

  // Actions
  addMember: (member: Member) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  removeMember: (id: string) => void;
}

export const useMemberStore = create<MemberState>((set) => ({
  members: SEED_MEMBERS,

  addMember: (member) => set((s) => ({ members: [...s.members, member] })),

  updateMember: (id, updates) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  removeMember: (id) =>
    set((s) => ({ members: s.members.filter((m) => m.id !== id) })),
}));

// ─── Selectors ───

/** tripId로 필터된 멤버 목록 */
export function selectMembersByTrip(
  members: Member[],
  tripId: string,
): Member[] {
  return members.filter((m) => m.tripId === tripId);
}

/** 멤버 ID로 displayName 찾기 */
export function selectMemberName(members: Member[], memberId: string): string {
  return members.find((m) => m.id === memberId)?.displayName || '알 수 없음';
}
