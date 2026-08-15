'use client';

import { MobileTabBar, Sidebar, Topbar } from '@/components/layout';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useAppStore } from '@/stores/app-store';
import { useParams } from 'next/navigation';

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const tripId = params.tripId as string;
  const { sidebarOpen, sidebarWidth } = useAppStore();
  const isDesktop = useIsDesktop();

  const mainMarginLeft = isDesktop && sidebarOpen ? sidebarWidth : 0;

  return (
    <>
      <Sidebar tripId={tripId} tripTitle="오사카 우정여행" />
      <div
        className="min-h-screen flex flex-col pb-14 lg:pb-0 transition-[margin-left] duration-200"
        style={{ marginLeft: mainMarginLeft }}
      >
        <Topbar
          title="오사카 우정여행"
          subtitle="2026.07.10~07.14 · 4박5일 · Day 3 진행 중"
          searchEnabled
          searchPlaceholder="일정·지출 검색"
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <MobileTabBar tripId={tripId} />
    </>
  );
}
