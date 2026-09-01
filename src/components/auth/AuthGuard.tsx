'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * 로그인이 필요한 영역을 감싸는 클라이언트 사이드 가드.
 * - 세션 확인 중에는 간단한 로딩 표시
 * - 비로그인 시 /login 으로 리다이렉트(원래 경로를 redirect 쿼리로 보존)
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const target = pathname && pathname !== '/' ? pathname : '/home';
      router.replace(`/login?redirect=${encodeURIComponent(target)}`);
    }
  }, [loading, isAuthenticated, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-3 text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!isAuthenticated) {
    // 리다이렉트가 실행되는 동안 아무것도 렌더링하지 않음
    return null;
  }

  return <>{children}</>;
}
