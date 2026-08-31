import type { Member, Invite } from '@/types';
import { apiClient } from './client';

/** 여행 멤버 목록 (left 제외). */
export function fetchMembers(tripId: string): Promise<Member[]> {
  return apiClient.get<Member[]>(`/trips/${tripId}/members`);
}

/** 가상 멤버(계정 없는 동행자) 추가. 소유자만 가능. */
export function addVirtualMember(
  tripId: string,
  input: { displayName: string; role?: 'editor' | 'viewer' },
): Promise<Member> {
  return apiClient.post<Member>(`/trips/${tripId}/members`, {
    displayName: input.displayName,
    role: input.role ?? 'viewer',
  });
}

/** 멤버 역할 변경. 소유자만 가능. */
export function updateMemberRole(
  tripId: string,
  memberId: string,
  role: 'owner' | 'editor' | 'viewer',
): Promise<Member> {
  return apiClient.patch<Member>(`/trips/${tripId}/members/${memberId}`, {
    role,
  });
}

/** 멤버 제거(소프트 삭제). 소유자만 가능. */
export function removeMember(tripId: string, memberId: string): Promise<void> {
  return apiClient.delete<void>(`/trips/${tripId}/members/${memberId}`);
}

/** 초대 링크 + 코드 생성. 소유자만 가능. */
export function createInvite(
  tripId: string,
  input?: { defaultRole?: 'editor' | 'viewer'; maxUses?: number | null },
): Promise<Invite> {
  return apiClient.post<Invite>(`/trips/${tripId}/invite`, {
    defaultRole: input?.defaultRole ?? 'editor',
    maxUses: input?.maxUses ?? 1,
  });
}

/** 초대 수락 (링크 토큰 또는 코드). 성공 시 합류한 tripId 반환. */
export async function acceptInvite(input: {
  token?: string;
  code?: string;
}): Promise<{ tripId: string; message?: string }> {
  return apiClient.post<{ tripId: string; message?: string }>(
    '/invite/accept',
    input,
  );
}
