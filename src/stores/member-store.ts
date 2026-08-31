import { create } from 'zustand';
import type { Member } from '@/types';

/**
 * 멤버 클라이언트 스토어.
 *
 * 멤버 데이터의 원천은 백엔드(useMembers 훅)이다. 이 스토어는 아직
 * 서버 연동 전인 화면(expense/progress/settlement 등)이 참조하는 과도기용이며,
 * 각 화면이 서버 훅으로 전환되면 제거 대상이다.
 * selectMembersByTrip / selectMemberName 은 서버 배열에도 쓰는 순수 함수라 유지한다.
 */
interface MemberState {
  members: Member[];

  // Actions
  setMembers: (members: Member[]) => void;
  addMember: (member: Member) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  removeMember: (id: string) => void;
}

export const useMemberStore = create<MemberState>((set) => ({
  members: [],

  setMembers: (members) => set({ members }),

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
