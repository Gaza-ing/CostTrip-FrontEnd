'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

// Mock 초대 데이터
const MOCK_INVITE = {
  inviterName: '김지원',
  tripTitle: '오사카 우정여행',
  destination: '오사카',
  duration: '4박5일',
  headcount: 4,
  startDate: '2026.07.10',
  endDate: '07.14',
  dday: 'D-20',
  role: 'editor' as const,
  isExpired: false,
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  // params.code is used to identify the invite token (mock for now)
  void params.code;
  const [accepted, setAccepted] = useState(false);

  const invite = MOCK_INVITE;

  function handleAccept() {
    setAccepted(true);
    setTimeout(() => {
      router.push('/trip/trip-001');
    }, 1500);
  }

  function handleReject() {
    router.push('/home');
  }

  // 만료/무효 상태
  if (invite.isExpired) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">⏰</span>
        <h2 className="text-lg font-semibold text-ink">만료된 초대</h2>
        <p className="mt-2 text-sm text-ink-3">
          이 초대 링크는 만료되었어요. 초대자에게 새 링크를 요청해 주세요.
        </p>
        <Link href="/home">
          <Button className="mt-6" size="sm">
            홈으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  // 수락 완료 상태
  if (accepted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">🎉</span>
        <h2 className="text-lg font-semibold text-ink">합류 완료!</h2>
        <p className="mt-2 text-sm text-ink-3">
          {invite.tripTitle}에 {invite.role} 권한으로 합류했어요. 여행 화면으로
          이동합니다...
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-[460px] space-y-5">
        {/* 헤더 */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand text-[26px] font-bold text-on-brand">
            {invite.inviterName.charAt(0)}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            <span className="text-brand">{invite.inviterName}</span>님이 여행에
            초대했어요
          </h1>
          <p className="mt-2 text-sm text-ink-3">
            초대를 수락하면 멤버로 합류해 일정과 지출을 함께 관리할 수 있어요 🎉
          </p>
        </div>

        {/* 여행 카드 */}
        <Card>
          <div className="relative rounded-sm bg-gradient-to-r from-brand to-brand-dark p-5 text-on-brand mb-4">
            <Badge
              variant="brand"
              className="absolute top-3 right-3 bg-white/20 text-white"
            >
              {invite.dday}
            </Badge>
            <h3 className="text-lg font-bold">{invite.tripTitle}</h3>
            <p className="mt-1 text-sm opacity-90">
              🗾 {invite.destination} · {invite.duration} · {invite.headcount}명
            </p>
          </div>

          <div className="mb-4">
            <p className="text-sm text-ink-2">
              📅 {invite.startDate}~{invite.endDate}
            </p>
          </div>

          <div>
            <h4 className="text-[13px] font-bold text-ink-2 mb-2">참여 멤버</h4>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand text-xs font-bold text-white" />
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ok text-xs font-bold text-white" />
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-warn text-xs font-bold text-white" />
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-surface-bg-alt text-[11px] font-bold text-ink-2">
                  +1
                </div>
              </div>
              <div>
                <p className="text-[13px] font-medium text-ink">
                  {invite.headcount}명
                </p>
                <p className="text-xs text-ink-3">
                  수락하면 멤버 구성과 예산을 볼 수 있어요
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* 안내 배너 */}
        <div className="flex items-center gap-3 rounded-sm bg-surface-bg-alt px-4 py-3">
          <span className="text-base">💡</span>
          <p className="text-sm text-ink">
            수락하면 <strong>{invite.role}</strong> 권한으로 합류해 일정·지출을
            함께 기록할 수 있어요.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleReject}
            className="shrink-0 px-6"
          >
            거절
          </Button>
          <Button fullWidth size="lg" onClick={handleAccept}>
            초대 수락하고 합류
          </Button>
        </div>

        <p className="text-center text-xs text-ink-3 mt-4">
          CostTrip · 여행 비용을 함께 똑똑하게 관리하세요
        </p>
      </div>
    </div>
  );
}
