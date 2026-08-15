'use client';

import { MobileTabBar, Sidebar, Topbar } from '@/components/layout';
import { TripCreateModal } from '@/components/trip/TripCreateModal';
import { useTrips } from '@/hooks/use-trips';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useAppStore } from '@/stores/app-store';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: trips } = useTrips();
  const { sidebarOpen, sidebarWidth } = useAppStore();
  const [createOpen, setCreateOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const ongoing = trips?.filter((t) => t.status === 'in_progress').length ?? 0;
  const planning = trips?.filter((t) => t.status === 'planning').length ?? 0;
  const completed = trips?.filter((t) => t.status === 'completed').length ?? 0;

  const isHome = pathname === '/home';
  const title = isHome
    ? '내 여행'
    : pathname === '/notifications'
      ? '알림'
      : '설정';
  const subtitle = isHome
    ? `진행 중 ${ongoing} · 예정 ${planning} · 완료 ${completed}`
    : undefined;
  const searchEnabled = isHome || pathname === '/notifications';

  const mainMarginLeft = isDesktop && sidebarOpen ? sidebarWidth : 0;

  return (
    <>
      <Sidebar />
      <div
        className="min-h-screen flex flex-col pb-14 lg:pb-0 transition-[margin-left] duration-200"
        style={{ marginLeft: mainMarginLeft }}
      >
        <Topbar
          title={title}
          subtitle={subtitle}
          searchEnabled={searchEnabled}
          searchPlaceholder={isHome ? '여행 검색' : '검색...'}
          onCreateTrip={() => setCreateOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <MobileTabBar />
      <TripCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
