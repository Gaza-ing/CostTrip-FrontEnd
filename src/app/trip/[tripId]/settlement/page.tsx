'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatKRW, cn } from '@/lib/utils';
import {
  useExpenseStore,
  useMemberStore,
  selectExpensesByTrip,
  selectMembersByTrip,
  selectMemberName,
} from '@/stores';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import type { Expense, Member } from '@/types';

// 멤버 아바타 색상
const MEMBER_COLORS = ['#6366F1', '#10B981', '#F97316', '#EC4899'];

interface Transfer {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  isSettled: boolean;
}

/**
 * 순잔액 계산: net_m = 결제한 총액 - 부담해야 할 총액
 */
function calculateNetBalances(
  expenses: Expense[],
  members: Member[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  members.forEach((m) => (balances[m.id] = 0));

  const settlementExpenses = expenses.filter((e) => e.isSettlementTarget);

  for (const exp of settlementExpenses) {
    if (balances[exp.paidByMemberId] !== undefined) {
      balances[exp.paidByMemberId] += exp.amount;
    }

    if (exp.splitMethod === 'equal') {
      const sharePerPerson = Math.floor(exp.amount / members.length);
      const remainder = exp.amount - sharePerPerson * members.length;
      members.forEach((m, i) => {
        balances[m.id] -= sharePerPerson + (i < remainder ? 1 : 0);
      });
    } else if (exp.splitMethod === 'none') {
      if (balances[exp.paidByMemberId] !== undefined) {
        balances[exp.paidByMemberId] -= exp.amount;
      }
    } else {
      const sharePerPerson = Math.floor(exp.amount / members.length);
      const remainder = exp.amount - sharePerPerson * members.length;
      members.forEach((m, i) => {
        balances[m.id] -= sharePerPerson + (i < remainder ? 1 : 0);
      });
    }
  }

  return balances;
}

/**
 * 멤버별 결제 총액 (지불)
 */
function calculatePaidByMember(
  expenses: Expense[],
  members: Member[],
): Record<string, number> {
  const paid: Record<string, number> = {};
  members.forEach((m) => (paid[m.id] = 0));
  const settlementExpenses = expenses.filter((e) => e.isSettlementTarget);
  for (const exp of settlementExpenses) {
    if (paid[exp.paidByMemberId] !== undefined) {
      paid[exp.paidByMemberId] += exp.amount;
    }
  }
  return paid;
}

/**
 * 멤버별 부담 총액
 */
function calculateShareByMember(
  expenses: Expense[],
  members: Member[],
): Record<string, number> {
  const shares: Record<string, number> = {};
  members.forEach((m) => (shares[m.id] = 0));
  const settlementExpenses = expenses.filter((e) => e.isSettlementTarget);
  for (const exp of settlementExpenses) {
    if (exp.splitMethod === 'none') {
      if (shares[exp.paidByMemberId] !== undefined) {
        shares[exp.paidByMemberId] += exp.amount;
      }
    } else {
      const sharePerPerson = Math.floor(exp.amount / members.length);
      const remainder = exp.amount - sharePerPerson * members.length;
      members.forEach((m, i) => {
        shares[m.id] += sharePerPerson + (i < remainder ? 1 : 0);
      });
    }
  }
  return shares;
}

/**
 * 그리디 근사 정산
 */
function calculateTransfers(balances: Record<string, number>): Transfer[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, balance] of Object.entries(balances)) {
    if (balance < 0) debtors.push({ id, amount: -balance });
    else if (balance > 0) creditors.push({ id, amount: balance });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const transfer = Math.min(debtors[di].amount, creditors[ci].amount);
    if (transfer > 0) {
      transfers.push({
        id: `transfer-${di}-${ci}`,
        fromMemberId: debtors[di].id,
        toMemberId: creditors[ci].id,
        amount: transfer,
        isSettled: false,
      });
    }
    debtors[di].amount -= transfer;
    creditors[ci].amount -= transfer;
    if (debtors[di].amount === 0) di++;
    if (creditors[ci].amount === 0) ci++;
  }

  return transfers;
}

export default function SettlementPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  // Stores
  const expenses = useExpenseStore((s) => s.expenses);
  const allMembers = useMemberStore((s) => s.members);
  const members = selectMembersByTrip(allMembers, tripId);
  const tripExpenses = selectExpensesByTrip(expenses, tripId);

  // 정산 대상 지출
  const settlementExpenses = tripExpenses.filter((e) => e.isSettlementTarget);
  const totalSettlementAmount = settlementExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  // 계산
  const netBalances = calculateNetBalances(tripExpenses, members);
  const paidByMember = calculatePaidByMember(tripExpenses, members);
  const shareByMember = calculateShareByMember(tripExpenses, members);

  const [transfers, setTransfers] = useState<Transfer[]>(() =>
    calculateTransfers(netBalances),
  );

  // 1인당 평균
  const perPerson =
    members.length > 0 ? Math.round(totalSettlementAmount / members.length) : 0;

  // 합계
  const totalPaid = Object.values(paidByMember).reduce((s, v) => s + v, 0);
  const totalShare = Object.values(shareByMember).reduce((s, v) => s + v, 0);

  // 받을/보낼 합계
  const totalReceivable = Object.values(netBalances)
    .filter((v) => v > 0)
    .reduce((s, v) => s + v, 0);
  const totalPayable = Object.values(netBalances)
    .filter((v) => v < 0)
    .reduce((s, v) => s + Math.abs(v), 0);

  // 정산 완료 토글
  function toggleSettled(transferId: string) {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId ? { ...t, isSettled: !t.isSettled } : t,
      ),
    );
  }

  // 복사
  function copyToClipboard() {
    const text = transfers
      .map(
        (t) =>
          `${selectMemberName(allMembers, t.fromMemberId)} → ${selectMemberName(allMembers, t.toMemberId)}: ${formatKRW(t.amount)}${t.isSettled ? ' ✓' : ''}`,
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('송금 내역이 복사되었습니다');
  }

  // 빈 상태
  if (members.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">👤</span>
        <h2 className="text-lg font-semibold text-ink">
          단독 여행에서는 정산이 필요 없어요
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          멤버를 초대하면 정산 기능을 사용할 수 있습니다
        </p>
        <Link href={`/trip/${tripId}/members`}>
          <Button className="mt-6" size="sm">
            멤버 초대하기
          </Button>
        </Link>
      </div>
    );
  }

  if (settlementExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">💸</span>
        <h2 className="text-lg font-semibold text-ink">
          정산할 내역이 없습니다
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          분담이 설정된 지출을 기록하면 정산할 수 있어요
        </p>
        <Link href={`/trip/${tripId}/expense/add`}>
          <Button className="mt-6" size="sm">
            지출 추가하기
          </Button>
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
          <p className="mt-1.5 text-2xl font-bold text-ink">
            {formatKRW(totalSettlementAmount)}
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">1인당 평균</p>
          <p className="mt-1.5 text-2xl font-bold text-ink">
            {formatKRW(perPerson)}
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">추천 송금</p>
          <p className="mt-1.5 text-2xl font-bold text-ink">
            {transfers.length}건
          </p>
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start">
        {/* 좌: 멤버별 정산 매트릭스 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink">멤버별 정산 매트릭스</h3>
            <span className="text-xs text-ink-3">지불 − 부담 = 정산</span>
          </div>

          {/* 테이블 헤더 */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_90px] gap-2 border-b border-surface-line pb-2 mb-3">
            <span className="text-[11px] font-semibold text-ink-3">멤버</span>
            <span className="text-[11px] font-semibold text-ink-3">역할</span>
            <span className="text-[11px] font-semibold text-ink-3 text-right">
              지불
            </span>
            <span className="text-[11px] font-semibold text-ink-3 text-right">
              부담
            </span>
            <span className="text-[11px] font-semibold text-ink-3 text-right">
              정산
            </span>
          </div>

          {/* 멤버 행 */}
          <div className="space-y-3">
            {members.map((m, i) => {
              const net = netBalances[m.id] || 0;
              const paid = paidByMember[m.id] || 0;
              const share = shareByMember[m.id] || 0;

              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_80px_80px_80px_90px] gap-2 items-center"
                >
                  {/* 멤버 */}
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                      style={{
                        backgroundColor:
                          MEMBER_COLORS[i % MEMBER_COLORS.length],
                      }}
                    >
                      {m.displayName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-ink">
                      {m.displayName}
                    </span>
                  </div>

                  {/* 역할 */}
                  <div>
                    <Badge
                      variant={
                        m.role === 'owner'
                          ? 'brand'
                          : m.role === 'editor'
                            ? 'default'
                            : 'default'
                      }
                    >
                      {m.role}
                    </Badge>
                  </div>

                  {/* 지불 */}
                  <span className="text-sm font-medium text-ink text-right">
                    {formatKRW(paid)}
                  </span>

                  {/* 부담 */}
                  <span className="text-sm font-medium text-ink text-right">
                    {formatKRW(share)}
                  </span>

                  {/* 정산 */}
                  <span
                    className={cn(
                      'text-sm font-bold text-right',
                      net > 0
                        ? 'text-brand'
                        : net < 0
                          ? 'text-danger-text'
                          : 'text-ink-3',
                    )}
                  >
                    {net > 0
                      ? `+${formatKRW(net)}`
                      : net < 0
                        ? `-${formatKRW(Math.abs(net))}`
                        : '₩0'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 합계 행 */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_90px] gap-2 items-center mt-4 pt-3 border-t border-surface-line">
            <span className="text-sm font-bold text-ink">합계</span>
            <span />
            <span className="text-sm font-bold text-ink text-right">
              {formatKRW(totalPaid)}
            </span>
            <span className="text-sm font-bold text-ink text-right">
              {formatKRW(totalShare)}
            </span>
            <span className="text-sm font-bold text-ink-3 text-right">₩0</span>
          </div>

          {/* 검증 배너 */}
          <div className="mt-4 flex items-center gap-2 rounded-sm bg-ok-soft px-4 py-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-ok-text text-white text-xs font-bold">
              ✓
            </span>
            <span className="text-sm text-ink">
              받을 금액{' '}
              <span className="font-bold text-brand">
                +{formatKRW(totalReceivable)}
              </span>{' '}
              과 보낼 금액{' '}
              <span className="font-bold text-danger-text">
                −{formatKRW(totalPayable)}
              </span>{' '}
              이 일치해요.
            </span>
          </div>
        </Card>

        {/* 우: 추천 송금 내역 + 정산 마무리 */}
        <div className="space-y-5">
          {/* 추천 송금 내역 */}
          <Card>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-ink">추천 송금 내역</h3>
              <Badge variant="brand">{transfers.length}건</Badge>
            </div>
            <p className="text-xs text-ink-3 mb-4">
              추천 송금 알고리즘으로 정리했어요.
            </p>

            <div className="space-y-4">
              {transfers.map((t) => {
                const fromName = selectMemberName(allMembers, t.fromMemberId);
                const toName = selectMemberName(allMembers, t.toMemberId);
                const fromIdx = members.findIndex(
                  (m) => m.id === t.fromMemberId,
                );
                const toIdx = members.findIndex((m) => m.id === t.toMemberId);

                return (
                  <div key={t.id} className="flex items-center gap-3">
                    {/* 보내는 사람 */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor:
                            MEMBER_COLORS[fromIdx % MEMBER_COLORS.length],
                        }}
                      >
                        {fromName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-ink">
                        {fromName}
                      </span>
                    </div>

                    {/* 보냄 → */}
                    <span className="text-xs text-ink-3">보냄 →</span>

                    {/* 받는 사람 */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor:
                            MEMBER_COLORS[toIdx % MEMBER_COLORS.length],
                        }}
                      >
                        {toName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-ink">
                        {toName}
                      </span>
                    </div>

                    {/* 금액 + 체크 */}
                    <div className="ml-auto text-right">
                      <p
                        className={cn(
                          'text-sm font-bold',
                          t.isSettled
                            ? 'text-ok-text line-through'
                            : 'text-brand',
                        )}
                      >
                        {formatKRW(t.amount)}
                      </p>
                      <button
                        onClick={() => toggleSettled(t.id)}
                        className={cn(
                          'mt-1 rounded-sm border px-2.5 py-1 text-[11px] font-medium transition-colors',
                          t.isSettled
                            ? 'border-ok-text bg-ok-soft text-ok-text'
                            : 'border-surface-line text-ink-2 hover:border-brand hover:text-brand',
                        )}
                      >
                        {t.isSettled ? '완료 ✓' : '보냄 체크'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 송금 내역 복사 */}
            <button
              onClick={copyToClipboard}
              className="mt-5 w-full h-10 rounded-pill bg-brand-soft text-sm font-medium text-brand-dark hover:bg-brand hover:text-on-brand transition-colors"
            >
              송금 내역 복사
            </button>
          </Card>

          {/* 정산 마무리 */}
          <Card>
            <h3 className="text-sm font-bold text-ink mb-3">정산 마무리</h3>
            <div className="flex items-center gap-2 rounded-sm bg-ok-soft px-4 py-3 mb-4">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-ok-text text-white text-xs font-bold">
                ✓
              </span>
              <span className="text-sm text-ink">
                송금이 모두 완료되면{' '}
                <span className="font-semibold">정산 완료</span> 처리하세요.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-pill border border-dashed border-surface-line-strong px-3 py-1.5 text-[11px] text-ink-3">
                ＄ 다중통화 [TODO]
              </span>
              <Button
                size="sm"
                className="ml-auto"
                disabled={!transfers.every((t) => t.isSettled)}
              >
                정산 완료하기
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
