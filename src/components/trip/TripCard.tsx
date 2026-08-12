'use client';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatKRW } from '@/lib/utils';
import type { Trip } from '@/types';
import { MapPin, MoreHorizontal, Users } from 'lucide-react';
import Link from 'next/link';

interface TripCardProps {
  trip: Trip;
}

function getDdayBadge(trip: Trip) {
  const today = new Date();
  const start = new Date(trip.startDate);
  const diffMs = start.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  switch (trip.status) {
    case 'planning':
      return { label: `D-${diffDays}`, variant: 'brand' as const };
    case 'in_progress': {
      const elapsed = Math.ceil(
        (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { label: `Day ${elapsed + 1}`, variant: 'ok' as const };
    }
    case 'completed':
      return { label: '종료', variant: 'default' as const };
  }
}

function getStatusFilter(status: Trip['status']) {
  switch (status) {
    case 'planning':
      return '예정';
    case 'in_progress':
      return '진행중';
    case 'completed':
      return '완료';
  }
}

// mock: 사용률 (실제로는 지출 합계 / 예산)
function getUsagePercent(trip: Trip) {
  if (!trip.totalBudget) return null;
  const mockUsage: Record<string, number> = {
    'trip-001': 65,
    'trip-002': 0,
    'trip-003': 92,
  };
  return mockUsage[trip.id] ?? 30;
}

export function TripCard({ trip }: TripCardProps) {
  const dday = getDdayBadge(trip);
  const usage = getUsagePercent(trip);
  const usageStatus =
    usage === null
      ? 'normal'
      : usage >= 100
        ? 'danger'
        : usage >= 80
          ? 'warn'
          : 'normal';

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <Link href={`/trip/${trip.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">{trip.title} 열기</span>
      </Link>

      {/* 상단: 타이틀 + 배지 + 더보기 */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-ink">{trip.title}</h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-ink-2">
            <MapPin size={14} />
            <span>{trip.destination}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={dday.variant}>{dday.label}</Badge>
          <button
            className="relative z-20 flex h-7 w-7 items-center justify-center rounded-xs text-ink-3 hover:bg-surface-bg-alt hover:text-ink-2 transition-colors"
            aria-label={`${trip.title} 추가 작업`}
            aria-haspopup="menu"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* 중간: 기간 + 인원 */}
      <div className="mt-3 flex items-center gap-3 text-sm text-ink-3">
        <span>
          {trip.startDate.slice(5)} – {trip.endDate.slice(5)}
        </span>
        <span className="flex items-center gap-1">
          <Users size={13} />
          {trip.headcount}명
        </span>
      </div>

      {/* 하단: 예산 사용률 */}
      {usage !== null ? (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-ink-3">
            <span>{formatKRW(trip.totalBudget)}</span>
            <span>{usage}%</span>
          </div>
          <ProgressBar value={usage} status={usageStatus} size="sm" />
        </div>
      ) : (
        <div className="mt-3">
          <Badge variant="default">예산 미설정</Badge>
        </div>
      )}
    </Card>
  );
}

export { getStatusFilter };
