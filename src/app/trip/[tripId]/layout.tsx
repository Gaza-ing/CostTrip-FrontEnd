'use client';

import { MobileTabBar, Sidebar, Topbar } from '@/components/layout';
import { TripDateEditor } from '@/components/trip/TripDateEditor';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useAppStore } from '@/stores/app-store';
import { useTrip, useUpdateTrip } from '@/hooks/use-trips';
import { useMembers } from '@/hooks/use-members';
import { useParams, usePathname } from 'next/navigation';

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <TripLayoutInner>{children}</TripLayoutInner>
    </AuthGuard>
  );
}

function TripLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const tripId = params.tripId as string;
  const { sidebarOpen, sidebarWidth, editMode, headerAction } = useAppStore();
  const isDesktop = useIsDesktop();

  // 실제 여행/멤버 데이터
  const { data: trip } = useTrip(tripId);
  const { data: members = [] } = useMembers(tripId);
  const updateTripMut = useUpdateTrip(tripId);

  const tripTitle = trip?.title ?? '여행';
  const tripStartDate = trip?.startDate ?? '';
  const tripEndDate = trip?.endDate ?? '';
  // 계획 인원과 실제 멤버 중 큰 값 (초대 전 동행자 포함)
  const tripHeadcount = Math.max(trip?.headcount ?? 1, members.length, 1);

  function setTripDates(startDate: string, endDate: string) {
    updateTripMut.mutate({ startDate, endDate });
  }

  const basePath = `/trip/${tripId}`;
  const subPath = pathname.replace(basePath, '') || '';

  // 일수 계산
  const dayCount =
    tripStartDate && tripEndDate
      ? Math.ceil(
          (new Date(tripEndDate).getTime() -
            new Date(tripStartDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 5;
  const durationLabel = `${dayCount - 1}박${dayCount}일`;

  // 동적 타이틀 (편집 모드 시 오버라이드)
  let headerTitle = tripTitle;
  let headerSubtitle: string | React.ReactNode =
    `${tripStartDate.replace(/-/g, '.')}~${tripEndDate.replace(/-/g, '.')} · ${durationLabel}`;
  // 페이지별 검색 placeholder (mockup web-top .wt-search 기준)
  let searchPlaceholder = '일정·지출 검색';

  if (editMode.active) {
    headerTitle = editMode.title;
    headerSubtitle = editMode.subtitle;
    searchPlaceholder = '여행·지출 검색';
  } else if (subPath.startsWith('/plan')) {
    const dayMatch = subPath.match(/\/plan\/(\d+)/);
    const dayNum = dayMatch ? parseInt(dayMatch[1]) + 1 : 1;
    headerTitle = '날짜별 세부 계획';
    headerSubtitle = (
      <span className="text-xs text-ink-3">
        {tripTitle} ·{' '}
        <TripDateEditor
          startDate={tripStartDate}
          endDate={tripEndDate}
          onSave={setTripDates}
        />{' '}
        · Day {dayNum}
      </span>
    );
    searchPlaceholder = '일정·장소 검색';
  } else if (subPath === '' || subPath === '/') {
    headerTitle = tripTitle;
    headerSubtitle = (
      <span className="text-xs text-ink-3">
        <TripDateEditor
          startDate={tripStartDate}
          endDate={tripEndDate}
          onSave={setTripDates}
        />{' '}
        · {durationLabel} · {tripHeadcount}명
      </span>
    );
    searchPlaceholder = '일정·지출 검색';
  } else if (subPath === '/budget') {
    headerTitle = '예산 설정';
    headerSubtitle = `${tripTitle} · 전체 + 카테고리별 예산`;
    searchPlaceholder = '여행·지출 검색';
  } else if (subPath === '/members') {
    headerTitle = '그룹 · 멤버';
    headerSubtitle = `${tripTitle} · ${tripHeadcount}명`;
    searchPlaceholder = '멤버 검색';
  } else if (subPath === '/progress') {
    headerTitle = '진행 대시보드';
    headerSubtitle = `${tripTitle} · 예산 대비 실지출`;
    searchPlaceholder = '여행·지출 검색';
  } else if (subPath === '/expense') {
    headerTitle = '지출 내역';
    headerSubtitle = tripTitle;
    searchPlaceholder = '지출 검색';
  } else if (subPath === '/settlement') {
    headerTitle = '정산';
    headerSubtitle = tripTitle;
    searchPlaceholder = '멤버·지출 검색';
  } else if (subPath === '/expense/add') {
    searchPlaceholder = '여행·지출 검색';
  }

  const mainMarginLeft = isDesktop && sidebarOpen ? sidebarWidth : 0;

  return (
    <>
      <Sidebar tripId={tripId} tripTitle={tripTitle} />
      <div
        className="min-h-screen flex flex-col pb-14 lg:pb-0 transition-[margin-left] duration-200"
        style={{ marginLeft: mainMarginLeft }}
      >
        <Topbar
          title={headerTitle}
          subtitle={headerSubtitle}
          searchEnabled
          searchPlaceholder={searchPlaceholder}
          action={headerAction}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <MobileTabBar tripId={tripId} />
    </>
  );
}
