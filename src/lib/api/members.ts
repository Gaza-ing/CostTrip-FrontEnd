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

/** 초대 미리보기 (수락 전, 인증 불필요). 어떤 여행 초대인지 요약. */
export interface InvitePreview {
  tripTitle: string;
  destination: string;
  startDate: string;
  endDate: string;
  inviterName: string;
  memberCount: number;
  defaultRole: string;
  expiresAt: string;
  isExpired: boolean;
}

/** 토큰 또는 코드로 초대 미리보기 조회. */
export function previewInvite(input: {
  token?: string;
  code?: string;
}): Promise<InvitePreview> {
  return apiClient.get<InvitePreview>('/invite/preview', {
    params: { token: input.token, code: input.code },
    skipAuth: true,
  });
}

export interface EmailInviteResult {
  /** 'invited' | 'not_registered' | 'already_member' */
  status: string;
  message: string;
  member: Member | null;
}

/** 이메일로 특정인 초대. 가입자면 멤버(invited) 추가 + 알림 발송. 소유자만. */
export function inviteByEmail(
  tripId: string,
  input: { email: string; role?: 'editor' | 'viewer' },
): Promise<EmailInviteResult> {
  return apiClient.post<EmailInviteResult>(`/trips/${tripId}/invite/email`, {
    email: input.email,
    role: input.role ?? 'editor',
  });
}

/** 이메일 초대(알림)에 응답. 내 invited 멤버를 accepted/declined로 전환. */
export function respondMembershipInvite(
  tripId: string,
  action: 'accept' | 'decline',
): Promise<{ status: string; tripId: string }> {
  return apiClient.post<{ status: string; tripId: string }>(
    `/trips/${tripId}/invite/respond`,
    { action },
  );
}
