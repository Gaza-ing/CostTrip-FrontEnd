import type { User } from '@/types';
import { apiClient } from './client';

export interface UserSyncInput {
  email: string;
  displayName: string;
  photoUrl?: string | null;
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
