'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { formatKRW, cn } from '@/lib/utils';
import { useMembers } from '@/hooks/use-members';
import { useSettlement, useToggleTransfer } from '@/hooks/use-settlement';
import { toast } from '@/stores/toast-store';
import { Check, Share2, User, Wallet, CircleDollarSign } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// 멤버 아바타 색상
const MEMBER_COLORS = ['#6366F1', '#10B981', '#F97316', '#EC4899'];

export default function SettlementPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const { data: members = [] } = useMembers(tripId);
  const { data: settlement, isLoading } = useSettlement(tripId);
  const toggleTransferMut = useToggleTransfer(tripId);

  const balances = settlement?.balances ?? [];
  const transfers = settlement?.transfers ?? [];
  const totalSettlementAmount = settlement?.totalSettlementAmount ?? 0;
  const perPerson = settlement?.perPersonAverage ?? 0;

  // 멤버 이름/색상 조회용 맵
  const memberIndex = new Map(members.map((m, i) => [m.id, i]));
  function nameOf(memberId: string): string {
    return (
      balances.find((b) => b.memberId === memberId)?.displayName ??
      members.find((m) => m.id === memberId)?.displayName ??
      '알 수 없음'
    );
  }
  function colorOf(memberId: string): string {
    const idx = memberIndex.get(memberId) ?? 0;
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  }

  // 합계 (표시용)
  const totalPaid = balances.reduce((s, b) => s + b.paid, 0);
  const totalShare = balances.reduce((s, b) => s + b.owed, 0);
  const totalReceivable = balances
    .filter((b) => b.net > 0)
    .reduce((s, b) => s + b.net, 0);
  const totalPayable = balances
    .filter((b) => b.net < 0)
    .reduce((s, b) => s + Math.abs(b.net), 0);

  function copyToClipboard() {
    const text = transfers
      .map(
        (t) =>
          `${nameOf(t.fromMemberId)} → ${nameOf(t.toMemberId)}: ${formatKRW(t.amount)}${t.isSettled ? ' ✓' : ''}`,
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('송금 내역이 복사되었습니다');
  }

  function toggleSettled(transferId: string | null) {
    if (!transferId) {
      toast.info('정산안을 먼저 생성해야 송금 완료를 체크할 수 있어요.');
      return;
    }
    toggleTransferMut.mutate(transferId);
  }

  const allSettled =
    transfers.length > 0 && transfers.every((t) => t.isSettled);

  useHeaderAction(
    <div className="flex items-center gap-2">
      <HeaderActionButton variant="ghost" onClick={copyToClipboard}>
        <Share2 size={16} />
        공유
      </HeaderActionButton>
      <HeaderActionButton disabled={!allSettled}>
        <Check size={16} />
        정산 완료
      </HeaderActionButton>
    </div>,
    [transfers],
  );

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-ink-3">
        정산 불러오는 중...
      </div>
    );
  }

  // 빈 상태: 단독 여행
  if (members.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand">
          <User size={24} />
        </span>
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

  // 빈 상태: 정산할 내역 없음
  if (totalSettlementAmount === 0 && transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand">
          <Wallet size={24} />
        </span>
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

          <div className="grid grid-cols-[1fr_80px_80px_90px] gap-2 border-b border-surface-line pb-2 mb-3">
            <span className="text-[11px] font-semibold text-ink-3">멤버</span>
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

          <div className="space-y-3">
            {balances.map((b) => (
              <div
                key={b.memberId}
                className="grid grid-cols-[1fr_80px_80px_90px] gap-2 items-center"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: colorOf(b.memberId) }}
                  >
                    {b.displayName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {b.displayName}
                  </span>
                </div>
                <span className="text-sm font-medium text-ink text-right">
                  {formatKRW(b.paid)}
                </span>
                <span className="text-sm font-medium text-ink text-right">
                  {formatKRW(b.owed)}
                </span>
                <span
                  className={cn(
                    'text-sm font-bold text-right',
                    b.net > 0
                      ? 'text-brand'
                      : b.net < 0
                        ? 'text-danger-text'
                        : 'text-ink-3',
                  )}
                >
                  {b.net > 0
                    ? `+${formatKRW(b.net)}`
                    : b.net < 0
                      ? `-${formatKRW(Math.abs(b.net))}`
                      : '₩0'}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_80px_80px_90px] gap-2 items-center mt-4 pt-3 border-t border-surface-line">
            <span className="text-sm font-bold text-ink">합계</span>
            <span className="text-sm font-bold text-ink text-right">
              {formatKRW(totalPaid)}
            </span>
            <span className="text-sm font-bold text-ink text-right">
              {formatKRW(totalShare)}
            </span>
            <span className="text-sm font-bold text-ink-3 text-right">₩0</span>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-sm bg-ok-soft px-4 py-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-ok-text text-white">
              <Check size={13} />
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

        {/* 우: 추천 송금 내역 */}
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-ink">추천 송금 내역</h3>
              <Badge variant="brand">{transfers.length}건</Badge>
            </div>
            <p className="text-xs text-ink-3 mb-4">
              추천 송금 알고리즘으로 정리했어요.
            </p>

            {transfers.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-3">
                정산할 송금이 없어요.
              </p>
            ) : (
              <div className="space-y-4">
                {transfers.map((t, idx) => {
                  const fromName = nameOf(t.fromMemberId);
                  const toName = nameOf(t.toMemberId);
                  return (
                    <div
                      key={t.id ?? `${t.fromMemberId}-${t.toMemberId}-${idx}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: colorOf(t.fromMemberId) }}
                        >
                          {fromName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-ink">
                          {fromName}
                        </span>
                      </div>

                      <span className="text-xs text-ink-3">보냄 →</span>

                      <div className="flex items-center gap-1.5">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: colorOf(t.toMemberId) }}
                        >
                          {toName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-ink">
                          {toName}
                        </span>
                      </div>

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
                          {t.isSettled ? (
                            <span className="inline-flex items-center gap-1">
                              <Check size={12} />
                              완료
                            </span>
                          ) : (
                            '보냄 체크'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={copyToClipboard}
              className="mt-5 w-full h-10 rounded-pill bg-brand-soft text-sm font-medium text-brand-dark hover:bg-brand hover:text-on-brand transition-colors"
            >
              송금 내역 복사
            </button>
          </Card>

          <Card>
            <h3 className="text-sm font-bold text-ink mb-3">정산 마무리</h3>
            <div className="flex items-center gap-2 rounded-sm bg-ok-soft px-4 py-3 mb-4">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-ok-text text-white">
                <Check size={13} />
              </span>
              <span className="text-sm text-ink">
                송금이 모두 완료되면{' '}
                <span className="font-semibold">정산 완료</span> 처리하세요.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-pill border border-dashed border-surface-line-strong px-3 py-1.5 text-[11px] text-ink-3">
                <CircleDollarSign size={13} />
                다중통화 [TODO]
              </span>
              <Button size="sm" className="ml-auto" disabled={!allSettled}>
                정산 완료하기
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
