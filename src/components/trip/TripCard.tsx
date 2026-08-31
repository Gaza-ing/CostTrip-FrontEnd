'use client';

import { Badge } from '@/components/ui/Badge';
import { formatKRW } from '@/lib/utils';
import type { Trip } from '@/types';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

interface TripCardProps {
  trip: Trip;
}

// 커버 그라데이션 (여행 id 해시로 결정 — 여행별 다른 색)
const GRADIENTS = [
  'bg-gradient-to-br from-[#4C6FFF] via-[#6B8AFF] to-[#A78BFA]',
  'bg-gradient-to-br from-[#10B981] via-[#34D399] to-[#06B6D4]',
  'bg-gradient-to-br from-[#EC4899] via-[#F472B6] to-[#F59E0B]',
  'bg-gradient-to-br from-[#F59E0B] via-[#FBBF24] to-[#F97316]',
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % 997;
  return GRADIENTS[hash % GRADIENTS.length];
}

const memberColors = ['bg-brand', 'bg-ok', 'bg-warn', 'bg-member-purple'];

const statusBadgeVariant: Record<string, 'brand' | 'ok' | 'default'> = {
  오늘: 'brand',
  예정: 'ok',
  완료: 'default',
};

export function TripCard({ trip }: TripCardProps) {
  const gradient = gradientFor(trip.id);
  // headcount 기반 아바타 자리표시 (목록에서는 멤버 상세를 조회하지 않음)
  const avatarCount = Math.min(trip.headcount, 4);

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

        {/* D-day 배지 (우상단) — 실제 날짜 기반 */}
        <div className="absolute right-4 top-3">
          <span className="rounded-sm bg-black/30 px-2 py-1 text-xs font-bold text-white">
            {computeDdayLabel(trip)}
          </span>
        </div>

        {/* 여행 정보 */}
        <div className="mt-3">
          <h3 className="text-lg font-bold text-white">{trip.title}</h3>
          <p className="mt-0.5 text-sm text-white/80">
            🧳 {trip.destination} · {getDuration(trip)} · {trip.headcount}명
          </p>
        </div>
      </div>

      {/* 본문 영역 */}
      <div className="px-4 py-3">
        {/* 상태 배지 + 멤버 아바타 */}
        <div className="flex items-center justify-between">
          <Badge
            variant={statusBadgeVariant[computeStatusLabel(trip)] || 'default'}
          >
            {computeStatusLabel(trip)}
          </Badge>
          <div className="flex -space-x-1.5">
            {Array.from({ length: avatarCount }).map((_, i) => (
              <div
                key={i}
                className={`flex h-6 w-6 items-center justify-center rounded-pill border-2 border-surface-card text-[10px] font-bold text-on-brand ${memberColors[i % memberColors.length]}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* 기간 + 예산 */}
        <div className="mt-3 flex items-center gap-3 text-sm text-ink-2">
          <span>
            📅 {trip.startDate.slice(5)}~{trip.endDate.slice(5)}
          </span>
          <span>
            예산 <b className="text-ink">{formatKRW(trip.totalBudget)}</b>
          </span>
        </div>
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

function computeDdayLabel(trip: Trip): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(trip.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(trip.endDate);
  end.setHours(0, 0, 0, 0);

  if (trip.status === 'completed') return '완료';

  if (today < start) {
    const diff = Math.ceil(
      (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return `D-${diff}`;
  }

  if (today >= start && today <= end) {
    const dayNum =
      Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
      1;
    return `Day ${dayNum}`;
  }

  return '완료';
}

function computeStatusLabel(trip: Trip): string {
  if (trip.status === 'completed') return '완료';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(trip.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(trip.endDate);
  end.setHours(0, 0, 0, 0);

  if (today >= start && today <= end) return '오늘';
  if (today < start) return '예정';
  return '완료';
}
