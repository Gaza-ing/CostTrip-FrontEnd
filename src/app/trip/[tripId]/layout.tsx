'use client';

import { MobileTabBar, Sidebar, Topbar } from '@/components/layout';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useAppStore } from '@/stores/app-store';
import { useParams, usePathname } from 'next/navigation';

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const tripId = params.tripId as string;
  const { sidebarOpen, sidebarWidth, editMode } = useAppStore();
  const isDesktop = useIsDesktop();

  const basePath = `/trip/${tripId}`;
  const subPath = pathname.replace(basePath, '') || '';

  // 동적 타이틀 (편집 모드 시 오버라이드)
  let headerTitle = '오사카 우정여행';
  let headerSubtitle = '2026.07.10~07.14 · 4박5일 · Day 3 진행 중';

  if (editMode.active) {
    headerTitle = editMode.title;
    headerSubtitle = editMode.subtitle;
  } else if (subPath.startsWith('/plan')) {
    const dayMatch = subPath.match(/\/plan\/(\d+)/);
    const dayNum = dayMatch ? parseInt(dayMatch[1]) + 1 : 1;
    headerTitle = '날짜별 세부 계획';
    headerSubtitle = `오사카 우정여행 · 2026.07.10~07.14 · Day ${dayNum} (오늘)`;
  } else if (subPath === '/budget') {
    headerTitle = '예산 설정';
    headerSubtitle = '오사카 우정여행 · 전체 + 카테고리별 예산';
  } else if (subPath === '/members') {
    headerTitle = '그룹 · 멤버';
    headerSubtitle = '오사카 우정여행 · 4명';
  } else if (subPath === '/progress') {
    headerTitle = '진행 대시보드';
    headerSubtitle = '오사카 우정여행 · 예산 대비 실지출';
  } else if (subPath === '/expense') {
    headerTitle = '지출 내역';
    headerSubtitle = '오사카 우정여행';
  } else if (subPath === '/settlement') {
    headerTitle = '정산';
    headerSubtitle = '오사카 우정여행';
  }

  const mainMarginLeft = isDesktop && sidebarOpen ? sidebarWidth : 0;

  return (
    <>
      <Sidebar tripId={tripId} tripTitle="오사카 우정여행" />
      <div
        className="min-h-screen flex flex-col pb-14 lg:pb-0 transition-[margin-left] duration-200"
        style={{ marginLeft: mainMarginLeft }}
      >
        <Topbar
          title={headerTitle}
          subtitle={headerSubtitle}
          searchEnabled
          searchPlaceholder="일정·지출 검색"
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <MobileTabBar tripId={tripId} />
    </>
  );
}
