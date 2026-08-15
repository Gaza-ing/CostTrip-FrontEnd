'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW } from '@/lib/utils';
import { mockDays, mockMembers, mockBudgetCategories } from '@/lib/api';
import { CalendarDays, MapPin, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Mock: Day별 일정 수 & 예상 비용
const mockDayPlanSummary: Record<string, { items: number; cost: number }> = {
  'day-001': { items: 3, cost: 250000 },
  'day-002': { items: 4, cost: 380000 },
  'day-003': { items: 5, cost: 520000 },
  'day-004': { items: 2, cost: 180000 },
  'day-005': { items: 3, cost: 270000 },
};

// Mock: 카테고리별 실제 계획 비용
const mockPlannedByCategory: Record<string, number> = {
  stay: 480000,
  move: 320000,
  food: 450000,
  tour: 350000,
  shop: 200000,
  etc: 100000,
};

export default function TripMainPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const days = mockDays.filter((d) => d.tripId === 'trip-001');
  const members = mockMembers.filter((m) => m.tripId === 'trip-001');
  const budgetCategories = mockBudgetCategories.filter(
    (bc) => bc.tripId === 'trip-001',
  );

  const totalBudget = 2400000;
  const totalPlanned = Object.values(mockPlannedByCategory).reduce(
    (sum, v) => sum + v,
    0,
  );
  const totalUsagePercent = Math.round((totalPlanned / totalBudget) * 100);

  return (
    <div className="space-y-6">
      {/* 상단 정보 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <MapPin size={14} />
            <span>오사카</span>
            <span>·</span>
            <CalendarDays size={14} />
            <span>2026.07.10 – 07.14 (4박5일)</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Link href={`/trip/${tripId}/members`}>
              <div className="flex items-center gap-1 text-sm text-ink-2 hover:text-brand transition-colors">
                <Users size={14} />
                <span>멤버 {members.length}명 ›</span>
              </div>
            </Link>
            {/* 멤버 아바타 스택 */}
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((m, i) => (
                <div
                  key={m.id}
                  className="flex h-7 w-7 items-center justify-center rounded-pill border-2 border-surface-card text-xs font-medium text-on-brand"
                  style={{
                    backgroundColor: [
                      '#4C6FFF',
                      '#16A34A',
                      '#F97316',
                      '#8B5CF6',
                    ][i],
                  }}
                >
                  {m.displayName.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* + 일정 추가 (Web) */}
        <Link href={`/trip/${tripId}/plan/0`}>
          <Button size="sm">
            <Plus size={14} className="mr-1" />
            일정 추가
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 좌: Day 리스트 (2/3) */}
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink-2">일정 Day</h2>
          {days.map((day) => {
            const summary = mockDayPlanSummary[day.id] || {
              items: 0,
              cost: 0,
            };
            return (
              <Link key={day.id} href={`/trip/${tripId}/plan/${day.dayIndex}`}>
                <Card
                  padding="sm"
                  shadow="sm"
                  className="cursor-pointer transition-shadow hover:shadow-base"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-brand-soft text-sm font-bold text-brand-dark">
                        D{day.dayIndex + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">
                          Day {day.dayIndex + 1}
                        </p>
                        <p className="text-xs text-ink-3">{day.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-ink-2">
                        {summary.items}개 일정
                      </p>
                      <p className="text-xs text-ink-3">
                        {summary.cost > 0
                          ? formatKRW(summary.cost)
                          : '비용 미정'}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* 우: 예산 요약 (1/3) */}
        <div className="space-y-4">
          {/* 전체 예산 */}
          <Card>
            <CardHeader>
              <CardTitle>예산 요약</CardTitle>
              <Link
                href={`/trip/${tripId}/budget`}
                className="text-xs text-brand hover:underline"
              >
                설정 ›
              </Link>
            </CardHeader>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink-2">전체</span>
                  <span className="text-ink">
                    {formatKRW(totalPlanned)} / {formatKRW(totalBudget)}
                  </span>
                </div>
                <ProgressBar
                  value={totalUsagePercent}
                  status={
                    totalUsagePercent >= 100
                      ? 'danger'
                      : totalUsagePercent >= 80
                        ? 'warn'
                        : 'normal'
                  }
                  label={`전체 예산 사용률 ${totalUsagePercent}%`}
                />
                <p className="mt-1 text-right text-xs text-ink-3">
                  {totalUsagePercent}%
                </p>
              </div>

              {/* 카테고리별 */}
              <div className="space-y-2 border-t border-surface-line pt-3">
                {budgetCategories.map((bc) => {
                  const cat = CATEGORIES.find((c) => c.id === bc.categoryId);
                  const planned = mockPlannedByCategory[bc.categoryId] || 0;
                  const percent =
                    bc.budgetAmount > 0
                      ? Math.round((planned / bc.budgetAmount) * 100)
                      : 0;
                  return (
                    <div key={bc.id}>
                      <div className="mb-0.5 flex justify-between text-xs">
                        <span className="text-ink-2">
                          {cat?.icon} {cat?.label}
                        </span>
                        <span className="text-ink-3">
                          {formatKRW(planned)} / {formatKRW(bc.budgetAmount)}
                        </span>
                      </div>
                      <ProgressBar
                        value={percent}
                        size="sm"
                        status={
                          percent >= 100
                            ? 'danger'
                            : percent >= 80
                              ? 'warn'
                              : 'normal'
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* 초과 경고 */}
          {budgetCategories.some((bc) => {
            const planned = mockPlannedByCategory[bc.categoryId] || 0;
            return bc.budgetAmount > 0 && planned >= bc.budgetAmount;
          }) && (
            <Card padding="sm" className="border-warn bg-warn-soft">
              <div className="flex items-center gap-2 text-sm text-warn-text">
                <span>⚠️</span>
                <span>일부 카테고리 예산이 초과되었습니다</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
