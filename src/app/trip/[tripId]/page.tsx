'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW } from '@/lib/utils';
import { useTrip } from '@/hooks/use-trips';
import { useMembers } from '@/hooks/use-members';
import { useExpenses } from '@/hooks/use-expenses';
import { useBudgets } from '@/hooks/use-budgets';
import { useDays } from '@/hooks/use-plan';
import {
  Plus,
  CalendarDays,
  Wallet,
  AlertCircle,
  CircleDollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const AVATAR_COLORS = ['#4C6FFF', '#16A34A', '#F97316', '#8B5CF6'];

export default function TripMainPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  useHeaderAction(
    <HeaderActionButton onClick={() => router.push(`/trip/${tripId}/plan/0`)}>
      <Plus size={16} />
      일정 추가
    </HeaderActionButton>,
    [tripId],
  );

  // 서버 데이터
  const { data: trip } = useTrip(tripId);
  const { data: members = [] } = useMembers(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: budgetData } = useBudgets(tripId);
  const { data: days = [] } = useDays(tripId, trip?.startDate);

  // 카테고리별 실지출
  const spentByCategory: Record<string, number> = {};
  for (const e of expenses) {
    spentByCategory[e.categoryId] =
      (spentByCategory[e.categoryId] || 0) + e.amount;
  }
  const spentTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // 예산
  const budgetCategories = CATEGORIES.map((cat, i) => ({
    id: `bc-${i}`,
    tripId,
    categoryId: cat.id,
    budgetAmount: budgetData?.categoryBudgets[cat.id] ?? 0,
  }));
  const totalBudget = budgetData?.totalBudget ?? 0;

  const totalUsagePercent =
    totalBudget > 0 ? Math.round((spentTotal / totalBudget) * 100) : 0;
  const remaining = totalBudget - spentTotal;

  // 경고 항목 (실지출 기준)
  const warnings = budgetCategories
    .map((bc) => {
      const cat = CATEGORIES.find((c) => c.id === bc.categoryId);
      const spent = spentByCategory[bc.categoryId] || 0;
      const pct =
        bc.budgetAmount > 0 ? Math.round((spent / bc.budgetAmount) * 100) : 0;
      if (pct >= 100)
        return { name: cat?.label || '', status: '초과' as const, pct };
      if (pct >= 80)
        return { name: cat?.label || '', status: '임박' as const, pct };
      return null;
    })
    .filter(Boolean);

  const hasBudget = totalBudget > 0;
  const hasDays = days.length > 0;

  // 빈 상태: 예산도 없고 일정(day)도 없음
  if (!hasBudget && !hasDays) {
    return (
      <div className="space-y-6">
        <MemberAvatars members={members} tripId={tripId} />
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand">
              <CalendarDays size={22} />
            </span>
            <h3 className="text-base font-semibold text-ink">
              날짜별 일정을 계획하세요
            </h3>
            <p className="mt-1 text-sm text-ink-3">
              여행 기간에 맞춰 Day별 일정을 추가할 수 있어요
            </p>
            <Link href={`/trip/${tripId}/plan/0`}>
              <Button className="mt-4" size="sm">
                일정 계획하기
              </Button>
            </Link>
          </Card>
          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand">
              <Wallet size={22} />
            </span>
            <h3 className="text-base font-semibold text-ink">
              예산을 설정하세요
            </h3>
            <p className="mt-1 text-sm text-ink-3">
              카테고리별 예산을 배분하고 지출을 관리해요
            </p>
            <Link href={`/trip/${tripId}/budget`}>
              <Button className="mt-4" size="sm" variant="secondary">
                예산 설정하기
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <MemberAvatars members={members} tripId={tripId} />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] items-start">
        {/* 좌: Day 타임라인 */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-2">Day 타임라인</h2>
          <Card padding="sm" shadow="sm">
            {days.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-3">
                아직 일정이 없어요
              </div>
            ) : (
              <div className="divide-y divide-surface-line">
                {days.map((day, i) => (
                  <Link
                    key={day.id}
                    href={`/trip/${tripId}/plan/${i}`}
                    className="flex items-center gap-3 py-3 px-2 transition-colors hover:bg-surface-bg-alt rounded-xs"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-surface-bg-alt text-ink-2">
                      <CalendarDays size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        Day {i + 1}
                      </p>
                      <p className="text-xs text-ink-3">
                        {day.date || '일정을 확인하세요'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-ink-3">보기 →</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 우: 예산 요약 */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-2">예산 요약</h2>

          <Card className="bg-brand-tint border-none">
            <div className="flex flex-col items-center py-4">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
                  <circle
                    cx="66"
                    cy="66"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    className="text-surface-line"
                    strokeWidth="12"
                  />
                  <circle
                    cx="66"
                    cy="66"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    className="text-brand"
                    strokeWidth="12"
                    strokeDasharray="351.9"
                    strokeDashoffset={351.9 * (1 - totalUsagePercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-ink">
                    {totalUsagePercent}%
                  </span>
                  <span className="text-xs text-ink-3">
                    실지출 {formatKRW(spentTotal)}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid w-full grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xs text-ink-3">전체 예산</p>
                  <p className="text-sm font-semibold text-ink">
                    {formatKRW(totalBudget)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-3">남은 예산</p>
                  <p className="text-sm font-semibold text-ok-text">
                    {formatKRW(remaining)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {warnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-sm bg-danger-soft px-4 py-3">
              <AlertCircle
                size={16}
                className="mt-0.5 shrink-0 text-danger-text"
              />
              <p className="text-sm text-danger-text">
                <span className="text-ink-3">실지출 기준 · </span>
                {warnings.map((w, i) => (
                  <span key={w!.name}>
                    {i > 0 && ' · '}
                    <b>{w!.name}</b> {w!.status} ({w!.pct}%)
                  </span>
                ))}
              </p>
            </div>
          )}

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">
                카테고리별 사용률
              </h3>
              <span className="text-xs text-ink-3 font-medium">
                · 실지출 기준
              </span>
            </div>
            <div className="space-y-3">
              {budgetCategories.map((bc) => {
                const cat = CATEGORIES.find((c) => c.id === bc.categoryId);
                const spent = spentByCategory[bc.categoryId] || 0;
                const pct =
                  bc.budgetAmount > 0
                    ? Math.round((spent / bc.budgetAmount) * 100)
                    : 0;
                const status =
                  pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : 'normal';
                return (
                  <div key={bc.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="category"
                          category={
                            bc.categoryId as
                              'stay' | 'move' | 'food' | 'tour' | 'shop' | 'etc'
                          }
                        >
                          {cat?.label}
                        </Badge>
                        {status === 'warn' && (
                          <Badge variant="warn">임박</Badge>
                        )}
                        {status === 'danger' && (
                          <Badge variant="danger">초과</Badge>
                        )}
                      </div>
                      <span className="text-xs text-ink-3">
                        {pct}%{' '}
                        <small>
                          {formatKRW(spent)}/{formatKRW(bc.budgetAmount)}
                        </small>
                      </span>
                    </div>
                    <ProgressBar
                      value={Math.min(pct, 100)}
                      status={status}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </Card>

          <span className="inline-flex items-center gap-1 rounded-xs border border-dashed border-surface-line-strong px-2 py-1 text-xs text-ink-3">
            <CircleDollarSign size={13} />
            다중통화 [TODO]
          </span>
        </div>
      </div>
    </div>
  );
}

function MemberAvatars({
  members,
  tripId,
}: {
  members: { id: string; displayName: string }[];
  tripId: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {members.slice(0, 4).map((m, i) => (
          <div
            key={m.id}
            className="flex h-8 w-8 items-center justify-center rounded-pill border-2 border-surface-card text-xs font-medium text-on-brand"
            style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
          >
            {m.displayName.charAt(0)}
          </div>
        ))}
      </div>
      <Link
        href={`/trip/${tripId}/members`}
        className="text-sm text-ink-3 hover:text-brand transition-colors"
      >
        멤버 {members.length}명
        {members.length > 1 &&
          ` · ${members[0]?.displayName} 외 ${members.length - 1}명`}
      </Link>
    </div>
  );
}
