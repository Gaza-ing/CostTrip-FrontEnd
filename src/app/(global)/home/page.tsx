'use client';

import { Button } from '@/components/ui/Button';
import { TripCard } from '@/components/trip/TripCard';
import { JoinByCode } from '@/components/trip/JoinByCode';
import { InviteAlertBanner } from '@/components/trip/InviteAlertBanner';
import { useTrips } from '@/hooks/use-trips';
import { useAppStore } from '@/stores/app-store';
import { formatKRW } from '@/lib/utils';
import { getTripPhase } from '@/lib/trip-status';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

type StatusFilter = 'all' | 'planning' | 'ongoing' | 'completed';

const filterLabels: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'planning', label: '예정' },
  { value: 'ongoing', label: '진행중' },
  { value: 'completed', label: '완료' },
];

export default function HomePage() {
  const { data: trips, isLoading, isError, refetch } = useTrips();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const searchQuery = useAppStore((s) => s.searchQuery);
  const query = searchQuery.trim().toLowerCase();

  // 필터·통계는 날짜 기준 파생 상태(getTripPhase)로 통일 — 카드 배지와 일치
  // 상태 필터 + 검색어(제목·목적지) 를 AND로 결합
  const filteredTrips =
    trips?.filter((t) => {
      const matchStatus = filter === 'all' || getTripPhase(t) === filter;
      const matchQuery =
        !query ||
        t.title.toLowerCase().includes(query) ||
        (t.destination ?? '').toLowerCase().includes(query);
      return matchStatus && matchQuery;
    }) ?? [];

  // Web 상단 stat 계산 (여행 목록에서 파생 가능한 값만)
  const stats = trips
    ? {
        ongoing: trips.filter((t) => getTripPhase(t) === 'ongoing').length,
        planning: trips.filter((t) => getTripPhase(t) === 'planning').length,
        completed: trips.filter((t) => getTripPhase(t) === 'completed').length,
        // 활성 예산 = 진행 중 + 예정 (완료된 여행은 제외)
        activeBudget: trips
          .filter((t) => getTripPhase(t) !== 'completed')
          .reduce((sum, t) => sum + t.totalBudget, 0),
        // 예산 미설정도 활성(진행·예정) 여행 기준으로만 센다
        noBudgetCount: trips.filter(
          (t) => getTripPhase(t) !== 'completed' && t.totalBudget === 0,
        ).length,
      }
    : null;

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand" />
        <p className="mt-3 text-sm text-ink-3">여행 불러오는 중...</p>
      </div>
    );
  }

  // 에러 상태
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-danger-text">데이터를 불러올 수 없습니다</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => refetch()}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  // 빈 상태
  if (!trips || trips.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16">
        {/* 여행은 없어도 받은 초대가 있으면 상단에 유도 배너 */}
        <div className="mb-6">
          <InviteAlertBanner />
        </div>
        <div className="flex flex-col items-center text-center">
          <p className="text-lg font-medium text-ink">
            첫 여행을 만들어 보세요
          </p>
          <p className="mt-1 text-sm text-ink-3">
            여행 계획과 예산을 한 곳에서 관리할 수 있어요
          </p>
          <p className="mt-3 text-sm text-ink-3">
            상단의 &quot;여행 생성&quot; 버튼을 눌러주세요
          </p>
        </div>
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-surface-line" />
          <span className="text-xs text-ink-3">또는</span>
          <div className="h-px flex-1 bg-surface-line" />
        </div>
        <JoinByCode />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 받은 초대가 있으면 상단에 유도 배너 */}
      <InviteAlertBanner />

      {/* 상단 stat (작은 화면 2열, 데스크톱 4열) */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="진행 중"
            value={`${stats.ongoing}건`}
            valueClassName="text-brand"
          />
          <StatCard
            label="예정"
            value={`${stats.planning}건`}
            valueClassName="text-warn-text"
          />
          <StatCard
            label="완료"
            value={`${stats.completed}건`}
            valueClassName="text-ok-text"
          />
          <StatCard
            label="총 예산 합계"
            value={formatKRW(stats.activeBudget)}
            valueClassName="text-brand"
            hint={
              stats.noBudgetCount > 0
                ? `완료 제외 · 예산 미설정 ${stats.noBudgetCount}건`
                : '완료된 여행 제외'
            }
          />
        </div>
      )}

      {/* 초대 코드로 참여 */}
      <JoinByCode />

      {/* 필터 + 여행 개수 */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-pill bg-surface-bg-alt p-1">
          {filterLabels.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-pill px-4 py-1.5 text-sm font-medium transition-all ${
                filter === f.value
                  ? 'bg-surface-card text-brand shadow-sm'
                  : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-ink-3">
          {filteredTrips.length}개의 여행
        </span>
      </div>

      {/* 여행 카드 그리드 */}
      {filteredTrips.length > 0 ? (
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          }}
        >
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-ink-3">
          {query
            ? `'${searchQuery.trim()}'에 해당하는 여행이 없습니다`
            : '해당 상태의 여행이 없습니다'}
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-sm border border-surface-line bg-surface-card p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p
        className={`mt-1 truncate text-lg font-semibold tabular-nums ${valueClassName || 'text-ink'}`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
