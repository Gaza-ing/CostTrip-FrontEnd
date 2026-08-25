'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW, cn } from '@/lib/utils';
import {
  useExpenseStore,
  useMemberStore,
  selectExpensesByTrip,
  selectMembersByTrip,
  selectMemberName,
  selectTotalSpent,
} from '@/stores';
import { useAppStore } from '@/stores/app-store';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

type SortKey = 'date' | 'amount';
type SortDir = 'asc' | 'desc';

// 멤버 아바타 색상
const MEMBER_COLORS = ['#6366F1', '#10B981', '#F97316', '#EC4899'];

export default function ExpenseListPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = params.tripId as string;

  // 헤더 우측 액션: 지출 내역 전용 "+ 지출 추가" 버튼
  useHeaderAction(
    <HeaderActionButton
      onClick={() => router.push(`/trip/${tripId}/expense/add`)}
    >
      <Plus size={16} />
      지출 추가
    </HeaderActionButton>,
    [tripId],
  );

  const initialCategory = searchParams.get('category');

  // Stores
  const expenses = useExpenseStore((s) => s.expenses);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const allMembers = useMemberStore((s) => s.members);
  const members = selectMembersByTrip(allMembers, tripId);
  const tripExpenses = selectExpensesByTrip(expenses, tripId);
  const totalSpent = selectTotalSpent(expenses, tripId);

  // App store (예산)
  const storeTotalBudget = useAppStore((s) => s.totalBudget);
  const budgetTotal = tripId === 'trip-001' ? 2400000 : storeTotalBudget;
  const remaining = budgetTotal - totalSpent;

  // 필터 상태
  const [filterCategory, setFilterCategory] = useState<string | null>(
    initialCategory,
  );
  const [filterMember, setFilterMember] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null);

  // Day 필터 옵션
  const tripStartDate = useAppStore((s) => s.tripStartDate);
  const tripEndDate = useAppStore((s) => s.tripEndDate);
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

  // 필터 + 정렬
  const filteredExpenses = useMemo(() => {
    let result = [...tripExpenses];

    if (filterCategory) {
      result = result.filter((e) => e.categoryId === filterCategory);
    }
    if (filterMember) {
      result = result.filter((e) => e.paidByMemberId === filterMember);
    }
    if (filterDay) {
      result = result.filter((e) => e.dayId === filterDay);
    }

    result.sort((a, b) => {
      if (sortKey === 'date') {
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortDir === 'desc' ? -diff : diff;
      }
      const diff = a.amount - b.amount;
      return sortDir === 'desc' ? -diff : diff;
    });

    return result;
  }, [tripExpenses, filterCategory, filterMember, filterDay, sortKey, sortDir]);

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 선택된 지출 상세
  const selectedExp = selectedExpense
    ? tripExpenses.find((e) => e.id === selectedExpense)
    : null;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function handleDelete(id: string) {
    if (confirm('이 지출을 삭제할까요?')) {
      deleteExpense(id);
      if (selectedExpense === id) setSelectedExpense(null);
    }
  }

  // 빈 상태
  if (tripExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">🧾</span>
        <h2 className="text-lg font-semibold text-ink">
          아직 기록된 지출이 없어요
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          여행 중 지출을 기록하면 여기서 확인할 수 있습니다
        </p>
        <Link href={`/trip/${tripId}/expense/add`}>
          <Button size="sm">+ 지출 추가</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 상단 지표 3개 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">누적 실지출</p>
          <p className="mt-1.5 text-2xl font-bold text-brand">
            {formatKRW(totalSpent)}
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">기록된 지출</p>
          <p className="mt-1.5 text-2xl font-bold text-ink">
            {tripExpenses.length}건
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">남은 예산</p>
          <p
            className={cn(
              'mt-1.5 text-2xl font-bold',
              remaining >= 0 ? 'text-ok-text' : 'text-danger-text',
            )}
          >
            {formatKRW(remaining)}
          </p>
        </div>
      </div>

      {/* 카테고리 필터 칩 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterCategory(null)}
          className={cn(
            'rounded-pill px-4 py-1.5 text-xs font-semibold transition-colors',
            !filterCategory
              ? 'bg-brand text-on-brand'
              : 'bg-surface-bg-alt text-ink-2 hover:bg-surface-line',
          )}
        >
          전체
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              setFilterCategory(filterCategory === cat.id ? null : cat.id)
            }
            className={cn(
              'rounded-pill px-3 py-1.5 text-xs font-medium transition-colors',
              filterCategory === cat.id
                ? 'bg-brand text-on-brand'
                : 'bg-surface-bg-alt text-ink-2 hover:bg-surface-line',
            )}
          >
            {cat.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink-3">
          전체 {tripExpenses.length}건 · {formatKRW(totalSpent)}
        </span>
      </div>

      {/* Day 필터 + 기간 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterDay(null)}
          className={cn(
            'rounded-pill px-4 py-1.5 text-xs font-semibold transition-colors',
            !filterDay
              ? 'bg-brand text-on-brand'
              : 'bg-surface-bg-alt text-ink-2 hover:bg-surface-line',
          )}
        >
          기간 전체
        </button>
        {Array.from({ length: totalDays }, (_, i) => {
          const dayId =
            tripId === 'trip-001' ? `day-00${i + 1}` : `day-new-${i}`;
          return (
            <button
              key={dayId}
              onClick={() => setFilterDay(filterDay === dayId ? null : dayId)}
              className={cn(
                'rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors',
                filterDay === dayId
                  ? 'border-brand bg-brand-tint text-brand'
                  : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt',
              )}
            >
              Day {i + 1}
            </button>
          );
        })}
      </div>

      {/* 결제자 필터 */}
      {members.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMember(null)}
            className={cn(
              'rounded-pill px-4 py-1.5 text-xs font-semibold transition-colors',
              !filterMember
                ? 'bg-brand text-on-brand'
                : 'bg-surface-bg-alt text-ink-2 hover:bg-surface-line',
            )}
          >
            결제자 전체
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() =>
                setFilterMember(filterMember === m.id ? null : m.id)
              }
              className={cn(
                'rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors',
                filterMember === m.id
                  ? 'border-brand bg-brand-tint text-brand'
                  : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt',
              )}
            >
              {m.displayName}
            </button>
          ))}
        </div>
      )}

      {/* 메인 그리드: 좌(테이블) + 우(상세) */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start">
        {/* 좌: 지출 목록 테이블 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink">지출 목록</h3>
            <span className="text-xs text-ink-3">
              전체 {tripExpenses.length}건 중 최근 {filteredExpenses.length}건 ·
              합 {formatKRW(filteredTotal)}
            </span>
          </div>

          {/* 테이블 헤더 */}
          <div className="grid grid-cols-[70px_1fr_80px_60px_60px_70px] gap-2 border-b border-surface-line pb-2 mb-2">
            <button
              onClick={() => handleSort('date')}
              className={cn(
                'flex items-center gap-0.5 text-[11px] font-semibold',
                sortKey === 'date' ? 'text-brand' : 'text-ink-3',
              )}
            >
              날짜{sortKey === 'date' && (sortDir === 'desc' ? ' ↓' : ' ↑')}
            </button>
            <span className="text-[11px] font-semibold text-ink-3">내역</span>
            <span className="text-[11px] font-semibold text-ink-3">
              카테고리
            </span>
            <span className="text-[11px] font-semibold text-ink-3">결제자</span>
            <span className="text-[11px] font-semibold text-ink-3">#분담</span>
            <button
              onClick={() => handleSort('amount')}
              className={cn(
                'flex items-center gap-0.5 text-[11px] font-semibold text-right justify-end',
                sortKey === 'amount' ? 'text-brand' : 'text-ink-3',
              )}
            >
              금액{sortKey === 'amount' && (sortDir === 'desc' ? ' ↓' : ' ↑')}
            </button>
          </div>

          {/* 테이블 본문 */}
          {filteredExpenses.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-3">
              조건에 맞는 지출 없음
            </div>
          ) : (
            <div className="divide-y divide-surface-line">
              {filteredExpenses.map((exp) => {
                const cat = CATEGORIES.find((c) => c.id === exp.categoryId);
                const paidByName = selectMemberName(
                  allMembers,
                  exp.paidByMemberId,
                );
                const memberIdx = members.findIndex(
                  (m) => m.id === exp.paidByMemberId,
                );
                const avatarColor =
                  MEMBER_COLORS[memberIdx % MEMBER_COLORS.length] || '#6366F1';
                const isRefund = exp.amount < 0;
                const isSelected = selectedExpense === exp.id;
                const dateStr = new Date(exp.createdAt).toLocaleDateString(
                  'ko-KR',
                  {
                    month: '2-digit',
                    day: '2-digit',
                  },
                );
                const timeStr = new Date(exp.createdAt).toLocaleTimeString(
                  'ko-KR',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  },
                );

                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedExpense(exp.id)}
                    className={cn(
                      'grid grid-cols-[70px_1fr_80px_60px_60px_70px] gap-2 items-center py-3 cursor-pointer transition-colors',
                      isSelected ? 'bg-brand-tint' : 'hover:bg-surface-bg-alt',
                    )}
                  >
                    {/* 날짜 */}
                    <div className="text-xs text-ink-2">
                      <div>{dateStr}</div>
                      <div className="text-ink-3">{timeStr}</div>
                    </div>

                    {/* 내역 */}
                    <p className="text-sm font-medium text-ink truncate">
                      {exp.description}
                    </p>

                    {/* 카테고리 */}
                    <Badge
                      variant="category"
                      category={
                        exp.categoryId as
                          'stay' | 'move' | 'food' | 'tour' | 'shop' | 'etc'
                      }
                    >
                      {cat?.label}
                    </Badge>

                    {/* 결제자 아바타 */}
                    <div className="flex justify-center">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: avatarColor }}
                        title={paidByName}
                      >
                        {paidByName.charAt(0)}
                      </div>
                    </div>

                    {/* 분담 */}
                    <span className="text-xs text-ink-2 text-center">
                      {exp.splitMethod === 'none'
                        ? '개인'
                        : `${members.length}명 ${exp.splitMethod === 'equal' ? '균등' : exp.splitMethod}`}
                    </span>

                    {/* 금액 */}
                    <span
                      className={cn(
                        'text-sm font-bold text-right',
                        isRefund ? 'text-danger-text' : 'text-brand',
                      )}
                    >
                      {isRefund
                        ? `-${formatKRW(Math.abs(exp.amount))}`
                        : formatKRW(exp.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 우: 지출 상세 패널 */}
        <div className="lg:sticky lg:top-20">
          {selectedExp ? (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-ink">지출 상세</h3>
                <Badge
                  variant="category"
                  category={
                    selectedExp.categoryId as
                      'stay' | 'move' | 'food' | 'tour' | 'shop' | 'etc'
                  }
                >
                  {
                    CATEGORIES.find((c) => c.id === selectedExp.categoryId)
                      ?.label
                  }
                </Badge>
              </div>

              {/* 영수증 영역 (placeholder) */}
              <div className="h-32 rounded-sm border border-dashed border-surface-line-strong bg-surface-bg-alt flex items-center justify-center mb-5">
                <span className="text-2xl text-ink-3">🧾</span>
              </div>

              {/* 지출 정보 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-ink">
                    {selectedExp.description}
                  </h4>
                  <span className="text-lg font-bold text-brand">
                    {formatKRW(selectedExp.amount)}
                  </span>
                </div>
                <p className="text-xs text-ink-3">
                  {new Date(selectedExp.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}{' '}
                  (
                  {new Date(selectedExp.createdAt).toLocaleDateString('ko-KR', {
                    weekday: 'short',
                  })}
                  ){' '}
                  {new Date(selectedExp.createdAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </p>

                <div className="space-y-2.5 pt-3 border-t border-surface-line">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-3">결제자</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{
                          backgroundColor:
                            MEMBER_COLORS[
                              members.findIndex(
                                (m) => m.id === selectedExp.paidByMemberId,
                              ) % MEMBER_COLORS.length
                            ] || '#6366F1',
                        }}
                      >
                        {selectMemberName(
                          allMembers,
                          selectedExp.paidByMemberId,
                        ).charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-ink">
                        {selectMemberName(
                          allMembers,
                          selectedExp.paidByMemberId,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-3">분담 방식</span>
                    <span className="text-sm font-medium text-ink">
                      {selectedExp.splitMethod === 'equal'
                        ? `${members.length}명 균등`
                        : selectedExp.splitMethod === 'none'
                          ? '개인'
                          : selectedExp.splitMethod}
                    </span>
                  </div>
                  {selectedExp.splitMethod === 'equal' &&
                    members.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-ink-3">1인당</span>
                        <span className="text-sm font-medium text-ink">
                          {formatKRW(
                            Math.floor(selectedExp.amount / members.length),
                          )}
                        </span>
                      </div>
                    )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-3">통화</span>
                    <span className="inline-block rounded-pill border border-dashed border-surface-line-strong px-2 py-0.5 text-[11px] text-ink-3">
                      ＄ 다중통화 [TODO]
                    </span>
                  </div>
                </div>

                {/* 분담 멤버 */}
                {selectedExp.splitMethod !== 'none' && members.length > 0 && (
                  <div className="pt-3 border-t border-surface-line">
                    <p className="text-xs text-ink-3 mb-2">분담 멤버</p>
                    <div className="flex gap-1.5">
                      {members.map((m, i) => (
                        <div
                          key={m.id}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{
                            backgroundColor:
                              MEMBER_COLORS[i % MEMBER_COLORS.length],
                          }}
                          title={m.displayName}
                        >
                          {m.displayName.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 수정/삭제 버튼 */}
                <div className="flex gap-3 pt-4 border-t border-surface-line">
                  <Button variant="secondary" fullWidth size="sm">
                    수정
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    size="sm"
                    onClick={() => handleDelete(selectedExp.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-3xl mb-3">👈</span>
              <p className="text-sm text-ink-3">
                지출을 선택하면 상세 정보를 볼 수 있어요
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
