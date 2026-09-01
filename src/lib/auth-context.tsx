'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
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

  useEffect(() => {
    let active = true;

    // 초기 세션 로드
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    // 세션 변화 구독 (로그인/로그아웃/토큰갱신)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
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
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isAuthenticated: !!session,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
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
