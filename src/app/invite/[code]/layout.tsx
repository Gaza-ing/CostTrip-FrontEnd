import type { ReactNode } from 'react';

/**
 * 초대 수락 화면 레이아웃.
 *
 * (global) 레이아웃(사이드바/탑바)을 거치지 않는 독립 화면이라,
 * 콘텐츠가 화면 상단에 붙지 않도록 세로·가로 중앙에 배치한다.
 */
export default function InviteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-bg px-4 py-10">
      <div className="w-full max-w-[460px]">{children}</div>
    </div>
  );
}
