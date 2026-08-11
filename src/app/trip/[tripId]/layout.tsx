'use client';

import { MobileTabBar, Sidebar, Topbar } from '@/components/layout';
import { useParams, usePathname } from 'next/navigation';

const tripPageTitles: Record<string, string> = {
  '': '여행 메인',
  '/budget': '예산 설정',
  '/members': '멤버 관리',
  '/progress': '진행 대시보드',
  '/expense': '지출 내역',
  '/expense/add': '지출 추가',
  '/settlement': '정산',
};

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const tripId = params.tripId as string;

  // 현재 페이지 타이틀 결정
  const basePath = `/trip/${tripId}`;
  const subPath = pathname.replace(basePath, '') || '';
  const title = tripPageTitles[subPath] || '여행';

  return (
    <>
      <Sidebar tripId={tripId} tripTitle="오사카 우정여행" />
      <div className="lg:ml-60 min-h-screen flex flex-col pb-14 lg:pb-0">
        <Topbar title={title} subtitle="오사카 우정여행" searchEnabled />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <MobileTabBar tripId={tripId} />
    </>
  );
}
