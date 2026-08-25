import { useAppStore } from '@/stores/app-store';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

/**
 * 페이지별 헤더 우측 액션 등록 훅.
 *
 * 사이드바 섹션(여행 메인 / 날짜별 계획 / 예산 / 그룹·멤버 등)을 이동할 때마다
 * 각 페이지가 Topbar 우측에 노출할 액션(버튼 등)을 스스로 지정할 수 있게 한다.
 * 페이지 마운트 시 액션을 등록하고, 언마운트(라우트 이탈) 시 자동으로 비운다.
 *
 * @example
 * useHeaderAction(
 *   <Button onClick={() => setInviteOpen(true)}>+ 멤버 초대</Button>
 * );
 */
export function useHeaderAction(action: ReactNode, deps: unknown[] = []) {
  const setHeaderAction = useAppStore((s) => s.setHeaderAction);

  useEffect(() => {
    setHeaderAction(action);
    return () => setHeaderAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
