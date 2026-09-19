'use client';

import { Lightbulb, CircleDollarSign } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW, cn } from '@/lib/utils';
import {
  useBudgets,
  useSaveBudgets,
  usePlanCostSummary,
} from '@/hooks/use-budgets';
import { useTrip } from '@/hooks/use-trips';
import { useMembers } from '@/hooks/use-members';
import { toast } from '@/stores/toast-store';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { BudgetData } from '@/lib/api/budgets';

ChartJS.register(ArcElement, Tooltip, Legend);

const DONUT_COLORS = [
  '#6366F1',
  '#0EA5E9',
  '#F97316',
  '#10B981',
  '#EC4899',
  '#8B96AB',
];

export default function BudgetSetupPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const { data: budgetData, isLoading } = useBudgets(tripId);

  if (isLoading || !budgetData) {
    return (
      <div className="py-20 text-center text-sm text-ink-3">
        예산 불러오는 중...
      </div>
    );
  }

  return <BudgetSetupForm tripId={tripId} initial={budgetData} />;
}

function BudgetSetupForm({
  tripId,
  initial,
}: {
  tripId: string;
  initial: BudgetData;
}) {
  const { data: trip } = useTrip(tripId);
  const { data: members = [] } = useMembers(tripId);
  const saveBudgetsMut = useSaveBudgets(tripId);
  // 일정에서 나온 카테고리별 예상 지출(프론트 카테고리 id 기준)
  const { data: planCost } = usePlanCostSummary(tripId);

  const startDate = trip?.startDate ?? '';
  const endDate = trip?.endDate ?? '';
  // 1인당 예산은 '계획 인원(trip.headcount)' 기준.
  // 아직 초대되지 않은 동행자도 예산 분담 대상이므로 계획 인원을 우선한다.
  // 단, 실제 등록 멤버가 더 많으면 그 수를 쓴다.
  const tripHeadcount = Math.max(trip?.headcount ?? 1, members.length, 1);

  const [localTotal, setLocalTotal] = useState(initial.totalBudget);
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>(
    () => {
      // 모든 카테고리 키를 0으로 초기화 후 서버값 덮어쓰기
      const base: Record<string, number> = {};
      for (const c of CATEGORIES)
        base[c.id] = initial.categoryBudgets[c.id] ?? 0;
      return base;
    },
  );
  // 임계값: trip 값을 기본으로, 편집 중에는 override로 즉시 반영
  const [thresholdOverride, setThresholdOverride] = useState<{
    warning?: number;
    over?: number;
  }>({});
  const warningThreshold =
    thresholdOverride.warning ?? trip?.budgetWarningThreshold ?? 80;
  const overThreshold =
    thresholdOverride.over ?? trip?.budgetOverThreshold ?? 100;
  const setWarningThreshold = (v: number) =>
    setThresholdOverride((o) => ({ ...o, warning: v }));
  const setOverThreshold = (v: number) =>
    setThresholdOverride((o) => ({ ...o, over: v }));

  // 임계값 입력 필드는 '타이핑 중 자유 입력 → blur 시 clamp' 방식.
  // 실시간 clamp는 타이핑을 방해하므로 로컬 텍스트 상태를 따로 둔다.
  const [warningText, setWarningText] = useState(String(warningThreshold));
  const [overText, setOverText] = useState(String(overThreshold));

  const [showTable, setShowTable] = useState(false);

  const categoryTotal = Object.values(localBudgets).reduce(
    (sum, v) => sum + v,
    0,
  );
  const remaining = localTotal - categoryTotal;
  const headcount = tripHeadcount;
  const totalDays =
    startDate && endDate
      ? Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 5;
  const perPerson =
    categoryTotal > 0 ? Math.round(categoryTotal / headcount) : 0;
  const perDay = categoryTotal > 0 ? Math.round(categoryTotal / totalDays) : 0;

  function handleSave() {
    // 이미 저장 중이면 중복 제출 방지
    if (saveBudgetsMut.isPending) return;
    saveBudgetsMut.mutate(
      {
        totalBudget: localTotal,
        categoryBudgets: localBudgets,
        warningThreshold,
        overThreshold,
      },
      {
        onSuccess: () => {
          toast.success('예산이 저장되었습니다');
          // 저장한 값으로 입력 텍스트를 확정한 뒤 override 초기화(서버값 기준으로)
          setWarningText(String(warningThreshold));
          setOverText(String(overThreshold));
          setThresholdOverride({});
        },
        onError: () => toast.error('예산 저장에 실패했습니다'),
      },
    );
  }

  // 헤더 우측 액션: 예산 설정 전용 "예산 저장" 버튼
  useHeaderAction(
    <HeaderActionButton
      onClick={handleSave}
      disabled={saveBudgetsMut.isPending}
    >
      {saveBudgetsMut.isPending ? '저장 중...' : '예산 저장'}
    </HeaderActionButton>,
    [
      localTotal,
      localBudgets,
      warningThreshold,
      overThreshold,
      saveBudgetsMut.isPending,
    ],
  );

  // Chart.js 데이터
  const chartData = {
    labels: CATEGORIES.map((c) => c.label),
    datasets: [
      {
        data: CATEGORIES.map((c) => localBudgets[c.id] || 0),
        backgroundColor: DONUT_COLORS,
        borderWidth: 0,
        cutout: '65%',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            `${ctx.label}: ${formatKRW(ctx.parsed)}`,
        },
      },
    },
  };

  return (
    <div className="space-y-5">
      {/* 상단 stat 3개 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="min-w-0 rounded-md border border-surface-line bg-surface-card p-4 sm:p-5">
          <p className="text-xs text-ink-3 font-medium">전체 예산</p>
          <p className="mt-1.5 truncate text-lg font-bold text-ink tabular-nums sm:text-2xl">
            {formatKRW(localTotal)}
          </p>
        </div>
        <div className="min-w-0 rounded-md border border-surface-line bg-surface-card p-4 sm:p-5">
          <p className="text-xs text-ink-3 font-medium">배분 합계</p>
          <p className="mt-1.5 truncate text-lg font-bold text-ink tabular-nums sm:text-2xl">
            {formatKRW(categoryTotal)}
          </p>
        </div>
        <div className="min-w-0 rounded-md border border-surface-line bg-surface-card p-4 sm:p-5">
          <p className="text-xs text-ink-3 font-medium">잔여 미배분</p>
          <p
            className={cn(
              'mt-1.5 truncate text-lg font-bold tabular-nums sm:text-2xl',
              remaining > 0
                ? 'text-ok-text'
                : remaining === 0
                  ? 'text-ink'
                  : 'text-danger-text',
            )}
          >
            {formatKRW(remaining)}
          </p>
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] items-start">
        {/* 좌: 예산 입력 */}
        <div className="space-y-5">
          {/* 전체 예산 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-ink">전체 예산</h2>
              <span className="inline-flex items-center gap-1 rounded-pill border border-dashed border-surface-line-strong px-3 py-1 text-xs text-ink-3">
                <CircleDollarSign size={13} />
                다중통화 [TODO]
              </span>
            </div>
            <div className="grid grid-cols-[1fr_140px] gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-3">
                  총 예산 금액
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-3">
                    ₩
                  </span>
                  <input
                    type="text"
                    value={localTotal.toLocaleString()}
                    onChange={(e) => {
                      const num =
                        parseInt(e.target.value.replace(/,/g, '')) || 0;
                      setLocalTotal(num);
                    }}
                    className="h-11 w-full rounded-sm border border-surface-line bg-surface-card pl-7 pr-3 text-base font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-3">
                  통화
                </label>
                <Select
                  aria-label="통화"
                  disabled
                  value="KRW"
                  onChange={() => {}}
                  triggerClassName="h-11"
                  options={[{ value: 'KRW', label: 'KRW (₩)' }]}
                />
              </div>
            </div>
          </Card>

          {/* 카테고리별 배분 */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-ink">카테고리별 배분</h2>
              <span className="text-xs text-ink-3">
                예상 지출을 참고해 예산을 정하세요
              </span>
            </div>

            {/* 테이블 헤더 */}
            <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-3 mb-3 px-1">
              <span className="text-[11px] font-medium text-ink-3">
                카테고리
              </span>
              <span className="text-[11px] font-medium text-ink-3">
                예상 지출
              </span>
              <span className="text-[11px] font-medium text-ink-3">예산</span>
              <span className="text-[11px] font-medium text-ink-3">비중</span>
            </div>

            {/* 카테고리 행 */}
            <div className="space-y-4">
              {CATEGORIES.map((cat, i) => {
                const budget = localBudgets[cat.id] || 0;
                const percent =
                  localTotal > 0
                    ? Math.round((budget / localTotal) * 1000) / 10
                    : 0;

                const planned = planCost?.byCategory[cat.id] ?? 0;
                const overBudget = budget > 0 && planned > budget;
                return (
                  <div
                    key={cat.id}
                    className="grid grid-cols-[80px_1fr_1fr_1fr] gap-3 items-center"
                  >
                    {/* 카테고리 */}
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-pill shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[i] }}
                      />
                      <span className="text-sm font-medium text-ink">
                        {cat.label}
                      </span>
                    </div>

                    {/* 예상 지출(일정 합계, 읽기 전용) */}
                    <div
                      className={cn(
                        'flex h-9 items-center justify-end rounded-sm bg-surface-bg-alt px-2.5 text-sm tabular-nums',
                        overBudget
                          ? 'font-semibold text-danger-text'
                          : 'text-ink-2',
                      )}
                      title={
                        overBudget ? '예상 지출이 예산을 초과했어요' : undefined
                      }
                    >
                      {formatKRW(planned)}
                    </div>

                    {/* 예산 금액(입력) */}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-3">
                        ₩
                      </span>
                      <input
                        type="text"
                        value={budget.toLocaleString()}
                        onChange={(e) => {
                          const num =
                            parseInt(e.target.value.replace(/,/g, '')) || 0;
                          setLocalBudgets((prev) => ({
                            ...prev,
                            [cat.id]: num,
                          }));
                        }}
                        className="h-9 w-full rounded-sm border border-surface-line bg-surface-card pl-6 pr-2 text-right text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>

                    {/* 비중: 배분 바 + 비율(%) 읽기 전용 */}
                    <div className="flex flex-col gap-1">
                      <span className="text-right text-[11px] tabular-nums text-ink-3">
                        {percent}%
                      </span>
                      <div className="h-2.5 rounded-pill bg-surface-bg-alt overflow-hidden">
                        <div
                          className="h-full rounded-pill transition-all duration-300"
                          style={{
                            width: `${Math.min(100, percent)}%`,
                            backgroundColor: DONUT_COLORS[i],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 합계: 배분 합계 / 전체 예산 */}
            <div className="mt-5 pt-4 border-t border-surface-line flex items-center justify-between">
              <span className="text-base font-bold text-ink">배분 합계</span>
              <span className="text-base font-bold text-ink">
                {formatKRW(categoryTotal)}{' '}
                <span className="text-sm font-normal text-ink-3">
                  / {formatKRW(localTotal)}
                </span>
              </span>
            </div>
          </Card>

          {/* 경고 임계값 */}
          <Card>
            <h2 className="mb-5 text-base font-bold text-ink">경고 임계값</h2>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-2 block text-xs font-medium text-ink-3">
                  임박 경고 (사용률 %)
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={warningText}
                  onChange={(e) => setWarningText(e.target.value)}
                  onBlur={() => {
                    // 입력 끝나면 1~99로 확정(타이핑 중엔 건드리지 않음)
                    const v = parseInt(warningText);
                    const next = Number.isNaN(v)
                      ? 80
                      : Math.min(99, Math.max(1, v));
                    // 범위를 벗어나 보정된 경우에만 안내
                    if (!Number.isNaN(v) && v !== next) {
                      toast.info(
                        `임박 경고는 1~99%만 가능해서 ${next}%로 맞췄어요`,
                      );
                    }
                    setWarningThreshold(next);
                    setWarningText(String(next));
                    // 초과가 임박 이하가 되면 초과도 끌어올림(초과 > 임박 보장)
                    if (overThreshold <= next) {
                      const nextOver = Math.min(200, next + 1);
                      setOverThreshold(nextOver);
                      setOverText(String(nextOver));
                      toast.info(
                        `초과 경고를 임박보다 크게 ${nextOver}%로 조정했어요`,
                      );
                    }
                  }}
                  className="h-11 w-full rounded-sm border border-surface-line bg-surface-card px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <span className="flex h-11 shrink-0 items-center rounded-pill bg-warn-soft px-4 text-xs font-semibold text-warn-text">
                임박
              </span>
              <div className="flex-1">
                <label className="mb-2 block text-xs font-medium text-ink-3">
                  초과 경고 (사용률 %)
                </label>
                <input
                  type="number"
                  min={warningThreshold + 1}
                  max={200}
                  value={overText}
                  onChange={(e) => setOverText(e.target.value)}
                  onBlur={() => {
                    // 입력 끝나면 (임박+1)~200으로 확정
                    const v = parseInt(overText);
                    const next = Number.isNaN(v)
                      ? 100
                      : Math.min(200, Math.max(warningThreshold + 1, v));
                    if (!Number.isNaN(v) && v !== next) {
                      toast.info(
                        `초과 경고는 임박(${warningThreshold}%)보다 크고 200% 이하여야 해서 ${next}%로 맞췄어요`,
                      );
                    }
                    setOverThreshold(next);
                    setOverText(String(next));
                  }}
                  className="h-11 w-full rounded-sm border border-surface-line bg-surface-card px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <span className="flex h-11 shrink-0 items-center rounded-pill bg-danger-soft px-4 text-xs font-semibold text-danger-text">
                초과
              </span>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-sm bg-brand-tint px-4 py-3">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-brand" />
              <p className="text-sm text-ink-2 leading-relaxed">
                임박 <b className="text-ink">{warningThreshold}%</b> · 초과{' '}
                <b className="text-ink">{overThreshold}%</b> 기준이
                전체·카테고리 모두에 적용돼요. 실제 사용률은 진행 대시보드에서
                확인할 수 있어요.
              </p>
            </div>
          </Card>
        </div>

        {/* 우: 카테고리 비중 + 차트 */}
        <div className="space-y-5 lg:sticky lg:top-20">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-ink">카테고리 비중</h3>
              <button
                onClick={() => setShowTable(!showTable)}
                className="rounded-sm border border-surface-line px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-bg-alt transition-colors"
              >
                {showTable ? '차트 보기' : '표로 보기'}
              </button>
            </div>

            {showTable ? (
              /* 표 뷰 */
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs text-ink-3 font-medium border-b border-surface-line pb-2">
                  <span>카테고리</span>
                  <span className="text-right">금액</span>
                  <span className="text-right">비율</span>
                </div>
                {CATEGORIES.map((cat, i) => {
                  const budget = localBudgets[cat.id] || 0;
                  const pct =
                    categoryTotal > 0
                      ? Math.round((budget / categoryTotal) * 1000) / 10
                      : 0;
                  return (
                    <div
                      key={cat.id}
                      className="grid grid-cols-3 gap-2 items-center py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-pill"
                          style={{ backgroundColor: DONUT_COLORS[i] }}
                        />
                        <span className="text-sm text-ink">{cat.label}</span>
                      </div>
                      <span className="text-right text-sm font-medium text-ink">
                        {formatKRW(budget)}
                      </span>
                      <span className="text-right text-sm text-ink-2">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-3 gap-2 items-center border-t border-surface-line pt-2 mt-2">
                  <span className="text-sm font-semibold text-ink">합계</span>
                  <span className="text-right text-sm font-bold text-ink">
                    {formatKRW(categoryTotal)}
                  </span>
                  <span className="text-right text-sm font-medium text-ink">
                    100%
                  </span>
                </div>
              </div>
            ) : (
              /* 차트 뷰 */
              <>
                <div className="relative mx-auto w-48 h-48">
                  <Doughnut data={chartData} options={chartOptions} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-ink">
                      ₩{(localTotal / 1000000).toFixed(1)}M
                    </span>
                    <span className="text-xs text-ink-3">전체 예산</span>
                  </div>
                </div>

                {/* 범례 */}
                <div className="space-y-2.5 mt-6">
                  {CATEGORIES.map((cat, i) => {
                    const pct =
                      categoryTotal > 0
                        ? Math.round(
                            ((localBudgets[cat.id] || 0) / categoryTotal) *
                              1000,
                          ) / 10
                        : 0;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-3 w-3 rounded-pill"
                            style={{ backgroundColor: DONUT_COLORS[i] }}
                          />
                          <span className="text-sm text-ink">{cat.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-ink">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* 1인당/하루 안내 */}
            <div className="mt-6 flex items-start gap-3 rounded-sm bg-brand-tint px-4 py-3">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-brand" />
              <p className="text-sm text-ink-2 leading-relaxed">
                총 {totalDays - 1}박{totalDays}일 기준{' '}
                <b className="text-ink">1인당 {formatKRW(perPerson)}</b>, 하루
                평균 약 <b className="text-ink">{formatKRW(perDay)}</b>{' '}
                예산이에요.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
