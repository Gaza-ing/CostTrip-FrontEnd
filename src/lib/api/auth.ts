import type { User } from '@/types';
import { apiClient } from './client';

export interface UserSyncInput {
  email: string;
  displayName: string;
  photoUrl?: string | null;
  avatarColor?: string | null;
  notifyBudget?: boolean;
  notifyMember?: boolean;
  notifySettlement?: boolean;
}

/**
 * Supabase 로그인 직후 호출.
 * 우리 백엔드 users 테이블에 사용자 레코드를 생성/갱신한다.
 */
export function syncUser(input: UserSyncInput): Promise<User> {
  return apiClient.post<User>('/auth/sync', input);
}

/** 현재 로그인한 사용자 정보 (백엔드 기준). */
export function fetchMe(): Promise<User> {
  return apiClient.get<User>('/auth/me');
}

export interface UserLookupResult {
  exists: boolean;
  email: string;
  displayName?: string | null;
  avatarColor?: string | null;
}

/** 이메일로 가입 여부 확인 (초대 대상 미리 검증용). */
export function lookupUser(email: string): Promise<UserLookupResult> {
  return apiClient.get<UserLookupResult>('/users/lookup', {
    params: { email },
  });
}
