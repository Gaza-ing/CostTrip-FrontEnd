'use client';

import { Card } from '@/components/ui/Card';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW, cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

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
  const {
    totalBudget,
    categoryBudgets,
    setTotalBudget,
    setCategoryBudgets,
    tripHeadcount,
    tripStartDate: startDate,
    tripEndDate: endDate,
  } = useAppStore();

  const [localTotal, setLocalTotal] = useState(totalBudget);
  const [localBudgets, setLocalBudgets] = useState({ ...categoryBudgets });
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [overThreshold, setOverThreshold] = useState(100);
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
    setTotalBudget(localTotal);
    setCategoryBudgets(localBudgets);
    alert('예산이 저장되었습니다');
  }

  // 헤더 우측 액션: 예산 설정 전용 "예산 저장" 버튼
  useHeaderAction(
    <HeaderActionButton onClick={handleSave}>예산 저장</HeaderActionButton>,
    [localTotal, localBudgets],
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
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">전체 예산</p>
          <p className="mt-1.5 text-2xl font-bold text-ink">
            {formatKRW(localTotal)}
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">배분 합계</p>
          <p className="mt-1.5 text-2xl font-bold text-ink">
            {formatKRW(categoryTotal)}
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">잔여 미배분</p>
          <p
            className={cn(
              'mt-1.5 text-2xl font-bold',
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
              <span className="rounded-pill border border-dashed border-surface-line-strong px-3 py-1 text-xs text-ink-3">
                ＄ 다중통화 [TODO]
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
                <select
                  disabled
                  className="h-11 w-full rounded-sm border border-surface-line bg-surface-bg px-3 text-sm text-ink-2 cursor-not-allowed"
                >
                  <option>KRW (₩)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* 카테고리별 배분 */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-ink">카테고리별 배분</h2>
              <span className="text-xs text-ink-3">금액 또는 비율로 조정</span>
            </div>

            {/* 테이블 헤더 */}
            <div className="grid grid-cols-[90px_1fr_70px_1fr] gap-3 mb-3 px-1">
              <span className="text-[11px] font-medium text-ink-3">
                카테고리
              </span>
              <span className="text-[11px] font-medium text-ink-3">예산</span>
              <span className="text-[11px] font-medium text-ink-3">비율</span>
              <span className="text-[11px] font-medium text-ink-3">배분</span>
            </div>

            {/* 카테고리 행 */}
            <div className="space-y-4">
              {CATEGORIES.map((cat, i) => {
                const budget = localBudgets[cat.id] || 0;
                const percent =
                  localTotal > 0
                    ? Math.round((budget / localTotal) * 1000) / 10
                    : 0;

                return (
                  <div
                    key={cat.id}
                    className="grid grid-cols-[90px_1fr_70px_1fr] gap-3 items-center"
                  >
                    {/* 카테고리 */}
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-pill shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[i] }}
                      />
                      <span className="text-sm font-medium text-ink">
                        {cat.icon} {cat.label}
                      </span>
                    </div>

                    {/* 예산 금액 */}
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

                    {/* 비율 */}
                    <div className="relative">
                      <input
                        type="number"
                        value={percent}
                        onChange={(e) => {
                          const pct = parseFloat(e.target.value) || 0;
                          setLocalBudgets((prev) => ({
                            ...prev,
                            [cat.id]: Math.round((pct / 100) * localTotal),
                          }));
                        }}
                        className="h-9 w-full rounded-sm border border-surface-line bg-surface-card px-2 text-center text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>

                    {/* 배분 바 */}
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
                );
              })}
            </div>

            {/* 합계 */}
            <div className="mt-5 pt-4 border-t border-surface-line flex items-center justify-between">
              <span className="text-base font-bold text-ink">합계</span>
              <span className="text-base font-bold text-ink">
                {formatKRW(categoryTotal)}{' '}
                <span className="text-sm font-normal text-ink-3">/ 100%</span>
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
                  value={warningThreshold}
                  onChange={(e) =>
                    setWarningThreshold(parseInt(e.target.value) || 80)
                  }
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
                  value={overThreshold}
                  onChange={(e) =>
                    setOverThreshold(parseInt(e.target.value) || 100)
                  }
                  className="h-11 w-full rounded-sm border border-surface-line bg-surface-card px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <span className="flex h-11 shrink-0 items-center rounded-pill bg-danger-soft px-4 text-xs font-semibold text-danger-text">
                초과
              </span>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-sm bg-brand-tint px-4 py-3">
              <span className="shrink-0 text-base">💡</span>
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
              <span className="shrink-0 text-base">💡</span>
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
