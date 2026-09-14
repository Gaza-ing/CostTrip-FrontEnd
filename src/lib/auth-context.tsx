'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { syncUser } from '@/lib/api/auth';

interface AuthContextValue {
  /** Supabase 세션 (없으면 비로그인) */
  session: Session | null;
  /** 세션 로딩 여부 (초기 확인 중) */
  loading: boolean;
  /** 로그인 여부 */
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Supabase 세션에서 표시 이름을 추출한다. */
function displayNameFromSession(session: Session): string {
  const meta = session.user.user_metadata ?? {};
  return (
    (meta.display_name as string) ||
    (meta.full_name as string) ||
    (meta.name as string) ||
    session.user.email?.split('@')[0] ||
    '사용자'
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  // 직전에 로그인돼 있던 사용자 id (계정 전환 감지용)
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    // 초기 세션 로드
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      prevUserIdRef.current = data.session?.user.id ?? null;
      setLoading(false);
    });

    // 세션 변화 구독 (로그인/로그아웃/토큰갱신)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      const newUserId = newSession?.user.id ?? null;
      // 로그인 사용자가 바뀌었거나 로그아웃되면 이전 사용자 데이터 캐시를 비운다
      if (prevUserIdRef.current !== newUserId) {
        queryClient.clear();
      }
      prevUserIdRef.current = newUserId;

      setSession(newSession);
      setLoading(false);

      // 로그인/가입 시 백엔드 users 테이블과 동기화
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        newSession
      ) {
        syncUser({
          email: newSession.user.email ?? '',
          displayName: displayNameFromSession(newSession),
          photoUrl:
            (newSession.user.user_metadata?.avatar_url as string) ?? null,
        }).catch((err) => {
          // sync 실패는 치명적이지 않으니 콘솔에만 남긴다
          console.error('사용자 동기화(sync) 실패:', err);
        });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isAuthenticated: !!session,
      signOut: async () => {
        await supabase.auth.signOut();
        // 이전 사용자 데이터가 다음 로그인에 남지 않도록 캐시 비움
        queryClient.clear();
      },
    }),
    [session, loading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}
