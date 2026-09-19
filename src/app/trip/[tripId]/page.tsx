'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { Avatar } from '@/components/ui/Avatar';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW } from '@/lib/utils';
import { useTrip } from '@/hooks/use-trips';
import { useMembers } from '@/hooks/use-members';
import { useMyProfile } from '@/hooks/use-my-profile';
import { useBudgets, usePlanCostSummary } from '@/hooks/use-budgets';
import { useDays, useDaysOverview } from '@/hooks/use-plan';
import {
  Plus,
  CalendarDays,
  Wallet,
  AlertCircle,
  CircleDollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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
  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: allMembers = [] } = useMembers(tripId);
  // 인원/아바타는 실제 합류(accepted)한 멤버만. invited(수락 대기)는 제외.
  const members = allMembers.filter((m) => m.inviteStatus === 'accepted');
  const { data: planCostSummary } = usePlanCostSummary(tripId);
  const { data: budgetData, isLoading: budgetLoading } = useBudgets(tripId);
  const { data: days = [], isLoading: daysLoading } = useDays(
    tripId,
    trip?.startDate,
  );
  const { data: daysOverview } = useDaysOverview(tripId);
  // dayId → 요약(제목 목록 + 예상비용 합). 타임라인 한 줄 표시에 사용.
  const overviewByDayId = new Map(
    (daysOverview?.days ?? []).map((d) => [d.dayId, d]),
  );

  // 카테고리별 예상 지출(일정의 예상비용 합계). 실지출은 진행 대시보드 담당.
  const estimatedByCategory = planCostSummary?.byCategory ?? {};
  const estimatedTotal = planCostSummary?.total ?? 0;

  // 예산
  const budgetCategories = CATEGORIES.map((cat, i) => ({
    id: `bc-${i}`,
    tripId,
    categoryId: cat.id,
    budgetAmount: budgetData?.categoryBudgets[cat.id] ?? 0,
  }));
  const totalBudget = budgetData?.totalBudget ?? 0;

  // 사용률/남은 예산은 예상 지출 기준
  const totalUsagePercent =
    totalBudget > 0 ? Math.round((estimatedTotal / totalBudget) * 100) : 0;
  const remaining = totalBudget - estimatedTotal;

  // 경고 항목 (예상 지출 기준)
  const warnings = budgetCategories
    .map((bc) => {
      const cat = CATEGORIES.find((c) => c.id === bc.categoryId);
      const estimated = estimatedByCategory[bc.categoryId] || 0;
      const pct =
        bc.budgetAmount > 0
          ? Math.round((estimated / bc.budgetAmount) * 100)
          : 0;
      if (pct >= 100)
        return { name: cat?.label || '', status: '초과' as const, pct };
      if (pct >= 80)
        return { name: cat?.label || '', status: '임박' as const, pct };
      return null;
    })
    .filter(Boolean);

  const hasBudget = totalBudget > 0;
  const hasDays = days.length > 0;

  // 아직 핵심 데이터(여행/예산/일정)를 불러오는 중이면 빈 상태를 먼저
  // 그리지 않고 로딩 UI를 보여준다. (새로고침 시 빈 화면이 깜빡이는 문제 방지)
  const coreLoading = tripLoading || budgetLoading || daysLoading;
  if (coreLoading) {
    return (
      <div className="space-y-5">
        <MemberAvatars members={members} tripId={tripId} />
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] items-start">
          <div className="h-64 animate-pulse rounded-md bg-surface-bg-alt" />
          <div className="h-64 animate-pulse rounded-md bg-surface-bg-alt" />
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
          {hasDays ? (
            <Card padding="sm" shadow="sm">
              <div className="divide-y divide-surface-line">
                {days.map((day, i) => {
                  const ov = overviewByDayId.get(day.id);
                  const titleSummary = summarizeTitles(ov?.titles ?? []);
                  return (
                    <Link
                      key={day.id}
                      href={`/trip/${tripId}/plan/${i}`}
                      className="flex items-center gap-3 rounded-xs px-2 py-3 transition-colors hover:bg-surface-bg-alt"
                    >
                      {/* 번호 배지 */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-bg-alt text-sm font-semibold text-ink-2">
                        {i + 1}
                      </div>
                      {/* Day · 날짜 + 일정 요약 */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          Day {i + 1}
                          {day.date && (
                            <span className="text-ink-2">
                              {' · '}
                              {formatMonthDay(day.date)}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-ink-3">
                          {titleSummary}
                        </p>
                      </div>
                      {/* 당일 예상비용 */}
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        {ov && ov.estimatedTotal > 0
                          ? formatKRW(ov.estimatedTotal)
                          : '-'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : (
            <PlanEmptyCard tripId={tripId} />
          )}
        </div>

        {/* 우: 예산 요약 */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-2">예산 요약</h2>

          {!hasBudget ? (
            <BudgetEmptyCard tripId={tripId} />
          ) : (
            <>
              <Card className="bg-brand-tint border-none">
                <div className="flex flex-col items-center py-4">
                  <div className="relative flex h-32 w-32 items-center justify-center">
                    <svg
                      viewBox="0 0 132 132"
                      className="h-full w-full -rotate-90"
                    >
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                      <span className="text-xl font-bold text-ink">
                        {totalUsagePercent}%
                      </span>
                      <span className="text-[11px] leading-tight text-ink-3">
                        예상 지출
                      </span>
                      <span className="text-xs font-medium leading-tight text-ink-2">
                        {formatKRW(estimatedTotal)}
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
                    <span className="text-ink-3">예상 지출 기준 · </span>
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
                    · 예상 지출 기준
                  </span>
                </div>
                <div className="space-y-3">
                  {budgetCategories.map((bc) => {
                    const cat = CATEGORIES.find((c) => c.id === bc.categoryId);
                    const estimated = estimatedByCategory[bc.categoryId] || 0;
                    const pct =
                      bc.budgetAmount > 0
                        ? Math.round((estimated / bc.budgetAmount) * 100)
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
                                  | 'stay'
                                  | 'move'
                                  | 'food'
                                  | 'tour'
                                  | 'shop'
                                  | 'etc'
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
                              {formatKRW(estimated)}/
                              {formatKRW(bc.budgetAmount)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** ISO date(YYYY-MM-DD) → "MM.DD" 표기(예: 2026-07-10 → 07.10). */
function formatMonthDay(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  return `${parts[1]}.${parts[2]}`;
}

// 타임라인 한 줄에 보여줄 최대 일정 제목 수. 초과분은 "외 N개"로 축약한다.
const MAX_TIMELINE_TITLES = 3;

/**
 * 일정 제목 목록을 한 줄 요약 문자열로.
 * - 없으면 "일정 없음"
 * - 최대 개수까지는 "·"로 나열, 초과하면 "… 외 N개"로 축약한다.
 *   (개수가 적어도 폭을 넘치면 CSS truncate가 추가로 말줄임 처리)
 */
function summarizeTitles(titles: string[]): string {
  if (titles.length === 0) return '일정 없음';
  if (titles.length <= MAX_TIMELINE_TITLES) return titles.join(' · ');
  const shown = titles.slice(0, MAX_TIMELINE_TITLES).join(' · ');
  const rest = titles.length - MAX_TIMELINE_TITLES;
  return `${shown} … 외 ${rest}개`;
}

function PlanEmptyCard({ tripId }: { tripId: string }) {
  return (
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
  );
}

function BudgetEmptyCard({ tripId }: { tripId: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand">
        <Wallet size={22} />
      </span>
      <h3 className="text-base font-semibold text-ink">예산을 설정하세요</h3>
      <p className="mt-1 text-sm text-ink-3">
        카테고리별 예산을 배분하고 지출을 관리해요
      </p>
      <Link href={`/trip/${tripId}/budget`}>
        <Button className="mt-4" size="sm" variant="secondary">
          예산 설정하기
        </Button>
      </Link>
    </Card>
  );
}

function MemberAvatars({
  members,
  tripId,
}: {
  members: {
    id: string;
    displayName: string;
    userId: string | null;
    avatarColor: string | null;
  }[];
  tripId: string;
}) {
  const { userId: myUserId, avatarColor: myColor } = useMyProfile();
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {members.slice(0, 4).map((m) => {
          const isMe = !!myUserId && m.userId === myUserId;
          const color = m.avatarColor ?? (isMe ? myColor : undefined);
          return (
            <Avatar
              key={m.id}
              name={m.displayName}
              colorSeed={m.id}
              color={color}
              size={32}
              className="border-2 border-surface-card text-xs"
            />
          );
        })}
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
