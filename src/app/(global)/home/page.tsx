'use client';

import { Button } from '@/components/ui/Button';
import { TripCard } from '@/components/trip/TripCard';
import { TripCreateModal } from '@/components/trip/TripCreateModal';
import { useTrips } from '@/hooks/use-trips';
import { formatKRW } from '@/lib/utils';
import { Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';

type StatusFilter = 'all' | 'planning' | 'in_progress' | 'completed';

const filterLabels: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'planning', label: '예정' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
];

export default function HomePage() {
  const { data: trips, isLoading, isError, refetch } = useTrips();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const filteredTrips =
    trips?.filter((t) => filter === 'all' || t.status === filter) ?? [];

  // Web 상단 stat 계산
  const stats = trips
    ? {
        ongoing: trips.filter((t) => t.status === 'in_progress').length,
        planning: trips.filter((t) => t.status === 'planning').length,
        totalBudget: trips.reduce((sum, t) => sum + t.totalBudget, 0),
        totalExpense: 1560000, // mock
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
      <>
        <TripCreateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg font-medium text-ink">
            첫 여행을 만들어 보세요
          </p>
          <p className="mt-1 text-sm text-ink-3">
            여행 계획과 예산을 한 곳에서 관리할 수 있어요
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus size={16} className="mr-1" />새 여행 만들기
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <TripCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Web 상단 stat (lg 이상에서만 표시) */}
      {stats && (
        <div className="hidden lg:grid grid-cols-4 gap-4">
          <StatCard label="진행 중" value={`${stats.ongoing}건`} />
          <StatCard label="예정" value={`${stats.planning}건`} />
          <StatCard label="총 예산 합계" value={formatKRW(stats.totalBudget)} />
          <StatCard
            label="누적 지출 (실지출 기준)"
            value={formatKRW(stats.totalExpense)}
          />
        </div>
      )}

      {/* 필터 + 생성 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {filterLabels.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-brand text-on-brand'
                  : 'bg-surface-bg-alt text-ink-2 hover:bg-surface-line'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} className="mr-1" />새 여행 만들기
        </Button>
      </div>

      {/* 여행 카드 그리드 */}
      {filteredTrips.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-ink-3">
          해당 상태의 여행이 없습니다
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-surface-line bg-surface-card p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
