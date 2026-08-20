'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW, cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { mockBudgetCategories } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

// Mock: 카테고리별 실지출 (trip-001)
const mockExpenseByCategory: Record<string, number> = {
  stay: 600000,
  move: 210000,
  food: 520000,
  tour: 150000,
  shop: 340000,
  etc: 80000,
};

// Mock: 일자별 지출 (trip-001, 5일 중 3일 진행)
const mockDailyExpense = [
  { dayIndex: 0, date: '07.10', amount: 420000, label: 'Day1' },
  { dayIndex: 1, date: '07.11', amount: 640000, label: 'Day2' },
  { dayIndex: 2, date: '07.12', amount: 500000, label: 'Day3' },
  { dayIndex: 3, date: '07.13', amount: 0, label: 'Day4', isFuture: true },
  { dayIndex: 4, date: '07.14', amount: 0, label: 'Day5', isFuture: true },
];

// Mock: 최근 지출 (trip-001)
const mockRecentExpenses = [
  {
    id: 'exp-001',
    description: '도톤보리 타코야키',
    categoryId: 'food',
    amount: 8400,
    paidBy: '박서준',
    splitInfo: '4명 균등',
    time: '오전 12:30',
  },
  {
    id: 'exp-002',
    description: '유니버셜 입장권',
    categoryId: 'tour',
    amount: 96000,
    paidBy: '김지원',
    splitInfo: '4명 균등',
    time: '어제 10:00',
  },
  {
    id: 'exp-003',
    description: '지하철 1일권',
    categoryId: 'move',
    amount: 12000,
    paidBy: '이하늘',
    splitInfo: '4명 균등',
    time: '어제 09:15',
  },
  {
    id: 'exp-004',
    description: '신사이바시 쇼핑',
    categoryId: 'shop',
    amount: 64000,
    paidBy: '최유나',
    splitInfo: '4명 균등',
    time: '어제 16:40',
  },
];

// 카테고리별 색상
const CATEGORY_COLORS: Record<string, string> = {
  stay: '#6366F1',
  move: '#10B981',
  food: '#F59E0B',
  tour: '#F59E0B',
  shop: '#EF4444',
  etc: '#10B981',
};

export default function ProgressDashboardPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [showTable, setShowTable] = useState(false);

  const storeBudgets = useAppStore((s) => s.categoryBudgets);
  const tripStartDate = useAppStore((s) => s.tripStartDate);
  const tripEndDate = useAppStore((s) => s.tripEndDate);
  const tripHeadcount = useAppStore((s) => s.tripHeadcount);

  // 예산 데이터
  const budgetCategories =
    tripId === 'trip-001'
      ? mockBudgetCategories.filter((bc) => bc.tripId === 'trip-001')
      : CATEGORIES.map((cat, i) => ({
          id: `bc-new-${i}`,
          tripId,
          categoryId: cat.id,
          budgetAmount: storeBudgets[cat.id] || 0,
        }));

  const budgetTotal =
    tripId === 'trip-001'
      ? 2400000
      : budgetCategories.reduce((s, bc) => s + bc.budgetAmount, 0);

  // 실지출 합계
  const spentTotal =
    tripId === 'trip-001'
      ? Object.values(mockExpenseByCategory).reduce((s, v) => s + v, 0)
      : 0;

  // 잔여 예산
  const remaining = budgetTotal - spentTotal;
  const usagePercent =
    budgetTotal > 0 ? Math.round((spentTotal / budgetTotal) * 100) : 0;

  // 일수 계산
  const totalDays =
    tripId === 'trip-001'
      ? 5
      : tripStartDate && tripEndDate
        ? Math.ceil(
            (new Date(tripEndDate).getTime() -
              new Date(tripStartDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1
        : 5;

  // 경과 일수 (trip-001은 3일 진행 중)
  const elapsedDays = tripId === 'trip-001' ? 3 : 0;

  // 경고 항목
  const warnings = budgetCategories
    .map((bc) => {
      const cat = CATEGORIES.find((c) => c.id === bc.categoryId);
      const spent =
        tripId === 'trip-001' ? mockExpenseByCategory[bc.categoryId] || 0 : 0;
      if (bc.budgetAmount === 0 && spent > 0)
        return {
          name: cat?.label || '',
          status: '초과' as const,
          spent,
          budget: bc.budgetAmount,
          pct: 999,
        };
      const pct =
        bc.budgetAmount > 0 ? Math.round((spent / bc.budgetAmount) * 100) : 0;
      if (pct >= 100)
        return {
          name: cat?.label || '',
          status: '초과' as const,
          spent,
          budget: bc.budgetAmount,
          pct,
        };
      if (pct >= 80)
        return {
          name: cat?.label || '',
          status: '임박' as const,
          spent,
          budget: bc.budgetAmount,
          pct,
        };
      return null;
    })
    .filter(Boolean) as {
    name: string;
    status: '초과' | '임박';
    spent: number;
    budget: number;
    pct: number;
  }[];

  // 일자별 데이터
  const dailyData = tripId === 'trip-001' ? mockDailyExpense : [];

  // 도넛 차트 데이터
  const doughnutData = {
    datasets: [
      {
        data: [usagePercent, Math.max(0, 100 - usagePercent)],
        backgroundColor: ['#6366F1', '#F1F5F9'],
        borderWidth: 0,
        cutout: '75%',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  };

  // 빈 상태: 예산 미설정
  if (budgetTotal === 0 && spentTotal === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">📊</span>
        <h2 className="text-lg font-semibold text-ink">
          예산을 설정하면 진행 현황을 볼 수 있어요
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          예산을 설정하고 지출을 기록하면 실시간 사용률을 확인할 수 있습니다
        </p>
        <Link href={`/trip/${tripId}/budget`}>
          <button className="mt-6 rounded-sm bg-brand px-6 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-dark transition-colors">
            예산 설정하기
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 경고 배너 */}
      {warnings.length > 0 && (
        <div className="flex items-center gap-3 rounded-sm bg-danger-soft px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-danger-text shrink-0" />
          <p className="text-sm text-ink">
            {warnings
              .filter((w) => w.status === '초과')
              .map(
                (w) =>
                  `${w.name} 예산을 초과했어요 (${formatKRW(w.spent)} / ${formatKRW(w.budget)}, ${w.pct}%)`,
              )
              .join(' · ')}
            {warnings.filter((w) => w.status === '초과').length > 0 &&
              warnings.filter((w) => w.status === '임박').length > 0 &&
              ' · '}
            {warnings
              .filter((w) => w.status === '임박')
              .map((w) => `${w.name} 예산이 ${w.pct}% 사용으로 임박 상태에요`)
              .join(' · ')}
          </p>
        </div>
      )}

      {/* 상단 핵심 지표 3개 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">전체 예산</p>
          <p className="mt-1.5 text-2xl font-bold text-ink">
            {formatKRW(budgetTotal)}
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">누적 실지출</p>
          <p className="mt-1.5 text-2xl font-bold text-brand">
            {formatKRW(spentTotal)}
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">남은 예산</p>
          <p
            className={cn(
              'mt-1.5 text-2xl font-bold',
              remaining >= 0 ? 'text-danger-text' : 'text-danger-text',
            )}
          >
            {remaining >= 0
              ? formatKRW(remaining)
              : `-${formatKRW(Math.abs(remaining))}`}
          </p>
        </div>
      </div>

      {/* 전체 예산 사용률 + 카테고리별 차트 */}
      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        {/* 좌: 전체 예산 사용률 도넛 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink">전체 예산 사용률</h3>
            <button
              onClick={() => setShowTable(!showTable)}
              className="rounded-sm border border-surface-line px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-surface-bg-alt transition-colors"
            >
              {showTable ? '차트 보기' : '표로 보기'}
            </button>
          </div>

          {showTable ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-[11px] text-ink-3 font-medium border-b border-surface-line pb-2">
                <span>항목</span>
                <span className="text-right">금액</span>
                <span className="text-right">비율</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1">
                <span className="text-sm text-ink">실지출</span>
                <span className="text-right text-sm font-medium text-ink">
                  {formatKRW(spentTotal)}
                </span>
                <span className="text-right text-sm text-ink-2">
                  {usagePercent}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1">
                <span className="text-sm text-ink">잔여</span>
                <span className="text-right text-sm font-medium text-ink">
                  {formatKRW(Math.max(0, remaining))}
                </span>
                <span className="text-right text-sm text-ink-2">
                  {Math.max(0, 100 - usagePercent)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="relative mx-auto w-44 h-44">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-ink">
                  {usagePercent}%
                </span>
                <span className="text-xs text-ink-3 mt-0.5">
                  {formatKRW(spentTotal)}
                </span>
              </div>
            </div>
          )}

          {/* 요약 정보 */}
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-3">예산 경고</span>
              <div className="flex gap-1.5">
                {warnings
                  .filter((w) => w.status === '초과')
                  .map((w) => (
                    <Badge key={w.name} variant="danger">
                      {w.name} 초과
                    </Badge>
                  ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-3">임박 카테고리</span>
              <div className="flex gap-1.5">
                {warnings
                  .filter((w) => w.status === '임박')
                  .map((w) => (
                    <Badge key={w.name} variant="warn">
                      {w.name} {w.pct}%
                    </Badge>
                  ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-3">잔여 일수</span>
              <span className="font-semibold text-ink">
                {Math.max(0, totalDays - elapsedDays)}일
              </span>
            </div>
          </div>
        </Card>

        {/* 우: 카테고리별 계획 vs 실지출 */}
        <Card>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-ink">
              카테고리별 계획 vs 실지출
            </h3>
            <p className="text-[11px] text-ink-3">
              막대를 누르면 해당 카테고리의 지출 내역으로 이동해요.
            </p>
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-4 mb-4 text-[11px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> 실지출
            </span>
          </div>

          {/* 카테고리 막대 리스트 */}
          <div className="space-y-4">
            {budgetCategories.map((bc) => {
              const cat = CATEGORIES.find((c) => c.id === bc.categoryId);
              const spent =
                tripId === 'trip-001'
                  ? mockExpenseByCategory[bc.categoryId] || 0
                  : 0;
              const pct =
                bc.budgetAmount > 0
                  ? Math.round((spent / bc.budgetAmount) * 100)
                  : spent > 0
                    ? 999
                    : 0;
              const isOver = pct >= 100;
              const isWarn = pct >= 80 && pct < 100;

              // 막대 색상 결정
              const barColor = isOver
                ? 'bg-red-500'
                : isWarn
                  ? 'bg-amber-400'
                  : 'bg-emerald-500';

              return (
                <Link
                  key={bc.id}
                  href={`/trip/${tripId}/expense?category=${bc.categoryId}`}
                  className="block group"
                  aria-label={`${cat?.label} 실지출 ${formatKRW(spent)} / 예산 ${formatKRW(bc.budgetAmount)} ${isOver ? '초과' : isWarn ? '임박' : '정상'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[bc.categoryId] || '#6366F1',
                        }}
                      />
                      <span className="text-sm font-medium text-ink group-hover:text-brand transition-colors">
                        {cat?.icon} {cat?.label}
                      </span>
                      {isOver && <Badge variant="danger">초과</Badge>}
                      {isWarn && <Badge variant="warn">임박</Badge>}
                    </div>
                    <span className="text-xs text-ink-3">
                      {formatKRW(spent)} / {formatKRW(bc.budgetAmount)} · {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-pill bg-surface-bg-alt overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-pill transition-all duration-300',
                        barColor,
                      )}
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 하단 2컬럼: 일자별 추이 + 최근 지출 */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 일자별 지출 추이 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink">일자별 지출 추이</h3>
            <span className="text-xs text-ink-3">
              {totalDays}일 중 {elapsedDays}일 진행
            </span>
          </div>
          {dailyData.length > 0 ? (
            <div className="flex items-end justify-between gap-2 px-2 pt-6 pb-2">
              {dailyData.map((d, i) => {
                const maxAmount = Math.max(...dailyData.map((dd) => dd.amount));
                const barHeight =
                  maxAmount > 0 && d.amount > 0
                    ? Math.max(20, (d.amount / maxAmount) * 120)
                    : 24;
                const isToday = i === elapsedDays - 1;
                const isFuture = d.isFuture;

                return (
                  <div key={i} className="flex flex-col items-center flex-1">
                    {/* 금액 라벨 (막대 위) */}
                    <span
                      className={cn(
                        'text-[11px] font-semibold mb-1.5',
                        isFuture
                          ? 'text-ink-3'
                          : isToday
                            ? 'text-brand'
                            : 'text-ink',
                      )}
                    >
                      {isFuture ? '예정' : formatKRW(d.amount)}
                    </span>
                    {/* 막대 */}
                    <div
                      className={cn(
                        'w-8 rounded-[4px] transition-all',
                        isFuture
                          ? 'bg-surface-bg-alt border border-dashed border-surface-line-strong'
                          : isToday
                            ? 'bg-brand'
                            : 'bg-brand/60',
                      )}
                      style={{ height: isFuture ? 24 : barHeight }}
                    />
                    {/* Day 라벨 (막대 아래) */}
                    <span
                      className={cn(
                        'text-[11px] mt-2',
                        isToday
                          ? 'text-brand font-bold'
                          : 'text-ink-3 font-medium',
                      )}
                    >
                      {d.label}
                    </span>
                    {/* 오늘 dot */}
                    {isToday && (
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-brand" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-ink-3">
              지출 기록이 쌓이면 일자별 추이가 표시됩니다
            </div>
          )}
        </Card>

        {/* 최근 지출 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink">최근 지출</h3>
            <Link
              href={`/trip/${tripId}/expense`}
              className="text-xs text-ink-3 hover:text-brand transition-colors"
            >
              전체보기
            </Link>
          </div>
          {tripId === 'trip-001' ? (
            <div className="space-y-4">
              {mockRecentExpenses.map((exp) => {
                const cat = CATEGORIES.find((c) => c.id === exp.categoryId);
                return (
                  <div key={exp.id} className="flex items-center gap-3">
                    {/* 카테고리 아이콘 */}
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-base shrink-0"
                      style={{
                        backgroundColor: CATEGORY_COLORS[exp.categoryId] + '20',
                      }}
                    >
                      {cat?.icon}
                    </div>
                    {/* 설명 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {exp.description}
                      </p>
                      <p className="text-xs text-ink-3">
                        {cat?.label} · {exp.paidBy} 결제 · {exp.splitInfo}
                      </p>
                    </div>
                    {/* 금액 + 시간 */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-brand">
                        {formatKRW(exp.amount)}
                      </p>
                      <p className="text-[11px] text-ink-3">{exp.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-ink-3">
              아직 기록된 지출이 없어요
            </div>
          )}
        </Card>
      </div>

      {/* 정산 섹션 */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-ink">정산</h3>
          <span className="text-xs text-ink-3">
            미정산{' '}
            <span className="font-semibold text-ink">{formatKRW(320000)}</span>
          </span>
        </div>
        <p className="text-sm text-ink-3 mb-4">
          지출 18건 · 멤버 {tripHeadcount}명 기준 분담이 계산돼 있어요. 추천
          송금 3건으로 끝낼 수 있어요.
        </p>
        <Link href={`/trip/${tripId}/settlement`} className="block">
          <button className="w-full h-12 rounded-sm bg-brand text-base font-semibold text-on-brand hover:bg-brand-dark transition-colors">
            정산하기
          </button>
        </Link>
      </Card>
    </div>
  );
}
