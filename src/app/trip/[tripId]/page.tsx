'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW } from '@/lib/utils';
import { mockDays, mockMembers, mockBudgetCategories } from '@/lib/api';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Mock: Day별 요약
const mockDaySummary = [
  {
    dayId: 'day-001',
    title: 'Day 1 · 도착·난바',
    date: '07.10(목)',
    items: 3,
    icon: '✈️',
    iconCat: 'move',
    desc: '도착 후 난바 일대 자유',
    cost: 320000,
  },
  {
    dayId: 'day-002',
    title: 'Day 2 · 유니버설 스튜디오',
    date: '07.11(금)',
    items: 4,
    icon: '🎢',
    iconCat: 'tour',
    desc: '입장권 4인 예매',
    cost: 420000,
  },
  {
    dayId: 'day-003',
    title: 'Day 3 · 오사카성·도톤보리',
    date: '07.12(토)',
    items: 4,
    icon: '🏯',
    iconCat: 'tour',
    desc: '진행 중',
    cost: 280000,
    isToday: true,
  },
  {
    dayId: 'day-004',
    title: 'Day 4 · 교토 당일치기',
    date: '07.13(일)',
    items: 3,
    icon: '🚄',
    iconCat: 'move',
    desc: '신칸센 왕복',
    cost: 240000,
  },
  {
    dayId: 'day-005',
    title: 'Day 5 · 쇼핑·출국',
    date: '07.14(월)',
    items: 2,
    icon: '🛍',
    iconCat: 'shop',
    desc: '신사이바시 쇼핑',
    cost: 180000,
  },
];

// Mock: 오늘 Day 세부 일정
const mockTodayPlanItems = [
  {
    time: '09:30',
    icon: '🏯',
    title: '오사카성',
    cat: 'tour',
    place: '오사카성',
    duration: '약 2시간',
    cost: 2400,
  },
  {
    time: '12:30',
    icon: '🍢',
    title: '도톤보리 점심',
    cat: 'food',
    place: '도톤보리',
    duration: '약 1시간',
    cost: 8000,
  },
  {
    time: '15:00',
    icon: '🛍',
    title: '신사이바시 쇼핑',
    cat: 'shop',
    place: '신사이바시',
    duration: '',
    cost: null,
  },
  {
    time: '19:00',
    icon: '🏨',
    title: '호텔 체크인',
    cat: 'stay',
    place: '난바 호텔',
    duration: '체크인',
    cost: null,
  },
];

// Mock: 카테고리별 실지출
const mockExpenseByCategory: Record<string, number> = {
  stay: 600000,
  move: 210000,
  food: 520000,
  tour: 150000,
  shop: 340000,
  etc: 80000,
};

export default function TripMainPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const members = mockMembers.filter((m) => m.tripId === 'trip-001');
  const budgetCategories = mockBudgetCategories.filter(
    (bc) => bc.tripId === 'trip-001',
  );

  const totalBudget = 2400000;
  const totalPlanned = 1980000;
  const totalUsagePercent = Math.round((totalPlanned / totalBudget) * 100);
  const remaining = totalBudget - totalPlanned;

  // 경고 항목
  const warnings = budgetCategories
    .map((bc) => {
      const cat = CATEGORIES.find((c) => c.id === bc.categoryId);
      const spent = mockExpenseByCategory[bc.categoryId] || 0;
      const pct =
        bc.budgetAmount > 0 ? Math.round((spent / bc.budgetAmount) * 100) : 0;
      if (pct >= 100)
        return { name: cat?.label || '', status: '초과' as const, pct };
      if (pct >= 80)
        return { name: cat?.label || '', status: '임박' as const, pct };
      return null;
    })
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {/* 멤버 아바타 */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {members.slice(0, 4).map((m, i) => (
            <div
              key={m.id}
              className="flex h-8 w-8 items-center justify-center rounded-pill border-2 border-surface-card text-xs font-medium text-on-brand"
              style={{
                backgroundColor: ['#4C6FFF', '#16A34A', '#F97316', '#8B5CF6'][
                  i
                ],
              }}
            >
              {m.displayName.charAt(0)}
            </div>
          ))}
        </div>
        <Link
          href={`/trip/${tripId}/members`}
          className="text-sm text-ink-3 hover:text-brand transition-colors"
        >
          멤버 {members.length}명 · {members[0]?.displayName} 외{' '}
          {members.length - 1}명
        </Link>
      </div>

      {/* 메인 그리드: 좌(Day 타임라인) + 우(예산) */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] items-start">
        {/* 좌: Day 타임라인 + 오늘 세부 일정 */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-2">Day 타임라인</h2>

          {/* Day 리스트 (단일 카드) */}
          <Card padding="sm" shadow="sm">
            <div className="divide-y divide-surface-line">
              {mockDaySummary.map((day, i) => (
                <Link
                  key={day.dayId}
                  href={`/trip/${tripId}/plan/${i}`}
                  className={`flex items-center gap-3 py-3 px-2 transition-colors hover:bg-surface-bg-alt rounded-xs ${
                    day.isToday ? 'bg-brand-tint' : ''
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-lg">
                    {day.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink truncate">
                        {day.title}
                      </p>
                      {day.isToday && <Badge variant="brand">오늘</Badge>}
                    </div>
                    <p className="text-xs text-ink-3">
                      {day.date} · 항목 {day.items}개 · {day.desc}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-ink">
                      {formatKRW(day.cost)}
                    </p>
                    <p className="text-xs text-ink-3">예상 비용</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* 오늘 Day 세부 일정 */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">
                  Day 3 세부 일정
                </h3>
                <Badge variant="brand">오늘</Badge>
              </div>
              <Link
                href={`/trip/${tripId}/plan/2`}
                className="text-xs text-brand hover:underline"
              >
                편집
              </Link>
            </div>
            <div className="divide-y divide-surface-line">
              {mockTodayPlanItems.map((item) => (
                <div key={item.time} className="flex items-center gap-3 py-2.5">
                  <span className="w-11 shrink-0 text-sm font-bold text-ink-2">
                    {item.time}
                  </span>
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-ink-3">
                      <Badge
                        variant="category"
                        category={
                          item.cat as
                            'stay' | 'move' | 'food' | 'tour' | 'shop' | 'etc'
                        }
                        className="mr-1"
                      >
                        {CATEGORIES.find((c) => c.id === item.cat)?.label}
                      </Badge>
                      · {item.place}
                      {item.duration && ` · ${item.duration}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm ${item.cost ? 'text-ink' : 'text-ink-3'}`}
                  >
                    {item.cost ? formatKRW(item.cost) : '예정'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 우: 예산 요약 */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-2">예산 요약</h2>

          {/* 도넛 게이지 */}
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
                    계획 {formatKRW(totalPlanned)}
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
                  <p className="text-xs text-ink-3">계획 여유</p>
                  <p className="text-sm font-semibold text-ok-text">
                    {formatKRW(remaining)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* 경고 배너 */}
          {warnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-sm bg-danger-soft px-4 py-3">
              <span>🔴</span>
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

          {/* 카테고리별 사용률 */}
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
                const spent = mockExpenseByCategory[bc.categoryId] || 0;
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

          <span className="inline-block rounded-xs border border-dashed border-surface-line-strong px-2 py-1 text-xs text-ink-3">
            ＄ 다중통화 [TODO]
          </span>
        </div>
      </div>
    </div>
  );
}
