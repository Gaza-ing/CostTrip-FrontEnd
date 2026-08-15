'use client';

import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatKRW } from '@/lib/utils';
import type { Trip } from '@/types';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

interface TripCardProps {
  trip: Trip;
}

// 커버 그라데이션 (여행별 다른 색)
const coverGradients: Record<string, string> = {
  'trip-001': 'bg-gradient-to-br from-[#4C6FFF] via-[#6B8AFF] to-[#A78BFA]',
  'trip-002': 'bg-gradient-to-br from-[#10B981] via-[#34D399] to-[#06B6D4]',
  'trip-003': 'bg-gradient-to-br from-[#EC4899] via-[#F472B6] to-[#F59E0B]',
};

const defaultGradient =
  'bg-gradient-to-br from-[#4C6FFF] via-[#6B8AFF] to-[#A78BFA]';

// Mock: 여행별 데이터
const mockTripData: Record<
  string,
  {
    usage: number;
    expense: number;
    members: string[];
    warnings?: string;
    statusLabel: string;
    ddayLabel: string;
    icon: string;
  }
> = {
  'trip-001': {
    usage: 65,
    expense: 1560000,
    members: ['지', '서', '하', '유'],
    warnings: '쇼핑 초과 · 식비 임박',
    statusLabel: '오늘',
    ddayLabel: 'Day 3',
    icon: '🗾',
  },
  'trip-002': {
    usage: 0,
    expense: 0,
    members: ['지', '서', '유'],
    statusLabel: '예정',
    ddayLabel: 'D-65',
    icon: '🌊',
  },
  'trip-003': {
    usage: 94,
    expense: 1692000,
    members: ['지', '서', '하', '유'],
    statusLabel: '완료',
    ddayLabel: '완료',
    icon: '🌴',
  },
};

const memberColors = ['bg-brand', 'bg-ok', 'bg-warn', 'bg-member-purple'];

const statusBadgeVariant: Record<string, 'brand' | 'ok' | 'default'> = {
  오늘: 'brand',
  예정: 'ok',
  완료: 'default',
};

export function TripCard({ trip }: TripCardProps) {
  const data = mockTripData[trip.id] || mockTripData['trip-001'];
  const gradient = coverGradients[trip.id] || defaultGradient;
  const usageStatus =
    data.usage >= 100 ? 'danger' : data.usage >= 80 ? 'warn' : 'normal';

  return (
    <div className="group relative overflow-hidden rounded-md border border-surface-line bg-surface-card shadow-sm transition-shadow hover:shadow-base">
      <Link href={`/trip/${trip.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">{trip.title} 열기</span>
      </Link>

      {/* 커버 영역 */}
      <div className={`relative px-4 pb-4 pt-3 ${gradient}`}>
        {/* ⋯ 버튼 */}
        <button
          className="relative z-20 flex h-7 w-7 items-center justify-center rounded-sm bg-black/30 text-white transition-colors hover:bg-black/50"
          aria-label={`${trip.title} 추가 작업`}
          aria-haspopup="menu"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal size={14} />
        </button>

        {/* D-day 배지 (우상단) */}
        <div className="absolute right-4 top-3">
          <span className="rounded-sm bg-black/30 px-2 py-1 text-xs font-bold text-white">
            {data.ddayLabel}
          </span>
        </div>

        {/* 여행 정보 */}
        <div className="mt-3">
          <h3 className="text-lg font-bold text-white">{trip.title}</h3>
          <p className="mt-0.5 text-sm text-white/80">
            {data.icon} {trip.destination} · {getDuration(trip)} ·{' '}
            {trip.headcount}명
          </p>
        </div>
      </div>

      {/* 본문 영역 */}
      <div className="px-4 py-3">
        {/* 상태 배지 + 멤버 아바타 */}
        <div className="flex items-center justify-between">
          <Badge variant={statusBadgeVariant[data.statusLabel] || 'default'}>
            {data.statusLabel}
          </Badge>
          <div className="flex -space-x-1.5">
            {data.members.map((m, i) => (
              <div
                key={i}
                className={`flex h-6 w-6 items-center justify-center rounded-pill border-2 border-surface-card text-[10px] font-bold text-on-brand ${memberColors[i % memberColors.length]}`}
              >
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* 기간 + 예산 */}
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-2">
          <span>
            📅 {trip.startDate.slice(5)}~{trip.endDate.slice(5)}
          </span>
          <span>
            예산 <b className="text-ink">{formatKRW(trip.totalBudget)}</b>
          </span>
        </div>

        {/* 사용률 */}
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs text-ink-3">
            <span>{data.usage > 0 ? '예산 사용률' : '예산 사용률'}</span>
            <span>
              {data.usage}%{' '}
              {data.expense > 0 ? (
                <span className="text-ink-3">{formatKRW(data.expense)}</span>
              ) : (
                <span className="text-ink-3">출발 전</span>
              )}
            </span>
          </div>
          <ProgressBar value={data.usage} status={usageStatus} size="sm" />
        </div>

        {/* 경고 배너 */}
        {data.warnings && (
          <div className="mt-3 flex items-center gap-2 rounded-sm bg-danger-soft px-3 py-2 text-xs text-danger-text">
            <span>🔴</span>
            <span>{data.warnings}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getDuration(trip: Trip) {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const days =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return `${days - 1}박${days}일`;
}
