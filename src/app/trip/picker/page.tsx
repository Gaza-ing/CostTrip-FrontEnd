'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTrips } from '@/hooks/use-trips';
import type { Trip } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function statusBadgeVariant(status: Trip['status']) {
  switch (status) {
    case 'in_progress':
      return 'brand' as const;
    default:
      return 'default' as const;
  }
}

/** 여행 기간을 "N박N일"로 표기 */
function durationLabel(trip: Trip): string {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const days =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (days <= 1) return '당일';
  return `${days - 1}박${days}일`;
}

/** 상태/시작일 기준 D-day 라벨 */
function ddayLabel(trip: Trip): string {
  if (trip.status === 'completed') return '완료';
  const start = new Date(trip.startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (trip.status === 'in_progress') return '진행 중';
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export default function TripPickerPage() {
  const router = useRouter();
  const { data: trips = [], isLoading } = useTrips();

  const ongoing = trips.filter((t) => t.status === 'in_progress');
  const planning = trips.filter((t) => t.status === 'planning');

  function handleSelectTrip(tripId: string) {
    router.push(`/trip/${tripId}`);
  }

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-ink-3">
        여행 불러오는 중...
      </div>
    );
  }

  // 빈 상태 (여행 0건)
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">✈️</span>
        <h2 className="text-lg font-semibold text-ink">
          첫 여행을 만들어 보세요
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          여행을 생성하면 일정·예산·정산을 함께 관리할 수 있어요.
        </p>
        <div className="flex gap-3 mt-6">
          <Link href="/trip/create">
            <Button>+ 여행 만들기</Button>
          </Link>
        </div>
        <Link
          href="/home"
          className="mt-4 text-sm text-ink-3 hover:text-brand transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-ink">
          계획을 보려면 여행을 선택해 주세요
        </h2>
        <p className="mt-1 text-sm text-ink-3">
          선택하면 그 여행의 계획 화면으로 이어집니다.
        </p>
      </div>

      {ongoing.length > 0 && (
        <section>
          <h3 className="text-[13px] font-bold text-ink-2 mb-3">진행 중</h3>
          <div className="space-y-2">
            {ongoing.map((trip) => (
              <Card
                key={trip.id}
                className="cursor-pointer hover:border-brand transition-colors"
                onClick={() => handleSelectTrip(trip.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-base font-bold text-on-brand">
                    {trip.title.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{trip.title}</p>
                    <p className="text-xs text-ink-3">
                      {trip.destination} · {durationLabel(trip)} ·{' '}
                      {trip.headcount}명
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(trip.status)}>
                    {ddayLabel(trip)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {planning.length > 0 && (
        <section>
          <h3 className="text-[13px] font-bold text-ink-2 mb-3">예정</h3>
          <div className="space-y-2">
            {planning.map((trip) => (
              <Card
                key={trip.id}
                className="cursor-pointer hover:border-brand transition-colors"
                onClick={() => handleSelectTrip(trip.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-bg-alt text-base font-bold text-ink-2">
                    {trip.title.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{trip.title}</p>
                    <p className="text-xs text-ink-3">
                      {trip.destination} · {durationLabel(trip)} ·{' '}
                      {trip.headcount}명
                    </p>
                  </div>
                  <Badge>{ddayLabel(trip)}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-center gap-4 pt-4 border-t border-surface-line">
        <Link href="/trip/create">
          <Button size="sm">+ 여행 만들기</Button>
        </Link>
      </div>

      <div className="text-center">
        <Link
          href="/home"
          className="text-sm text-ink-3 hover:text-brand transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
