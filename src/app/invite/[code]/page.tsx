'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAcceptInvite } from '@/hooks/use-members';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api/client';

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const acceptMut = useAcceptInvite();

  // URL의 값은 초대 링크 토큰(백엔드: /invite/{token})
  const tokenOrCode = decodeURIComponent((params.code as string) ?? '');

  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    // 비로그인 시 로그인 후 이 초대 페이지로 복귀
    if (!authLoading && !isAuthenticated) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/invite/${tokenOrCode}`)}`,
      );
      return;
    }

    setError(null);
    acceptMut.mutate(
      { token: tokenOrCode },
      {
        onSuccess: (data) => {
          setAccepted(true);
          setTimeout(() => router.push(`/trip/${data.tripId}`), 1200);
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            setError(
              typeof err.detail === 'string'
                ? err.detail
                : '초대를 수락할 수 없습니다.',
            );
          } else {
            setError('초대를 수락할 수 없습니다.');
          }
        },
      },
    );
  }

  function handleReject() {
    router.push('/home');
  }

  // 수락 완료
  if (accepted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">🎉</span>
        <h2 className="text-lg font-semibold text-ink">합류 완료!</h2>
        <p className="mt-2 text-sm text-ink-3">
          여행에 합류했어요. 여행 화면으로 이동합니다...
        </p>
      </div>
    );
  }

  // 에러(만료/무효 등)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">⏰</span>
        <h2 className="text-lg font-semibold text-ink">
          초대를 사용할 수 없어요
        </h2>
        <p className="mt-2 text-sm text-ink-3">{error}</p>
        <Link href="/home">
          <Button className="mt-6" size="sm">
            홈으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-[460px] space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand text-[26px] font-bold text-on-brand">
            ✉️
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            여행 초대를 받았어요
          </h1>
          <p className="mt-2 text-sm text-ink-3">
            초대를 수락하면 멤버로 합류해 일정과 지출을 함께 관리할 수 있어요 🎉
          </p>
        </div>

        <Card>
          <div className="rounded-sm bg-gradient-to-r from-brand to-brand-dark p-5 text-on-brand">
            <h3 className="text-lg font-bold">CostTrip 여행 초대</h3>
            <p className="mt-1 text-sm opacity-90">
              수락하면 멤버 구성과 예산을 볼 수 있어요
            </p>
          </div>
        </Card>

        <div className="flex items-center gap-3 rounded-sm bg-surface-bg-alt px-4 py-3">
          <span className="text-base">💡</span>
          <p className="text-sm text-ink">
            수락하면 초대에 지정된 권한으로 합류해 일정·지출을 함께 기록할 수
            있어요.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleReject}
            className="shrink-0 px-6"
            disabled={acceptMut.isPending}
          >
            거절
          </Button>
          <Button
            fullWidth
            size="lg"
            onClick={handleAccept}
            disabled={acceptMut.isPending}
          >
            {acceptMut.isPending ? '합류 중...' : '초대 수락하고 합류'}
          </Button>
        </div>

        <p className="text-center text-xs text-ink-3 mt-4">
          CostTrip · 여행 비용을 함께 똑똑하게 관리하세요
        </p>
      </div>
    </div>
  );
}
