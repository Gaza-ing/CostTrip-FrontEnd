'use client';

import {
  CheckCircle2,
  AlertCircle,
  Mail,
  Lightbulb,
  MapPin,
  CalendarDays,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAcceptInvite, useInvitePreview } from '@/hooks/use-members';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api/client';

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const acceptMut = useAcceptInvite();

  // URL의 값은 초대 링크 토큰(백엔드: /invite/{token})
  const tokenOrCode = decodeURIComponent((params.code as string) ?? '');

  // 어떤 여행 초대인지 미리보기 (인증 불필요)
  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
  } = useInvitePreview({ token: tokenOrCode });

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

  function formatDate(iso: string): string {
    // "2026-07-10" → "2026.07.10"
    return iso.replaceAll('-', '.');
  }

  const roleLabel =
    preview?.defaultRole === 'viewer'
      ? '보기 전용(viewer)'
      : '편집 가능(editor)';

  // 미리보기 로딩 중
  if (previewLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 size={32} className="animate-spin text-brand" />
        <p className="mt-3 text-sm text-ink-3">초대 정보를 불러오는 중...</p>
      </div>
    );
  }

  // 미리보기 실패(무효 초대) 또는 만료
  if (previewError || preview?.isExpired) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger-text">
          <AlertCircle size={26} />
        </span>
        <h2 className="text-lg font-semibold text-ink">
          초대를 사용할 수 없어요
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          {preview?.isExpired
            ? '초대가 만료되었어요. 초대한 분에게 새 링크를 요청해 주세요.'
            : '유효하지 않은 초대 링크예요.'}
        </p>
        <Link href="/home">
          <Button className="mt-6" size="sm">
            홈으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  // 수락 완료
  if (accepted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok-text">
          <CheckCircle2 size={26} />
        </span>
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
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger-text">
          <AlertCircle size={26} />
        </span>
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
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand text-on-brand">
          <Mail size={32} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          여행 초대를 받았어요
        </h1>
        <p className="mt-2 text-sm text-ink-3">
          {preview
            ? `${preview.inviterName}님이 초대했어요`
            : '초대를 수락하면 멤버로 합류해 일정과 지출을 함께 관리할 수 있어요'}
        </p>
      </div>

      <Card>
        <div className="rounded-sm bg-gradient-to-r from-brand to-brand-dark p-5 text-on-brand">
          <h3 className="text-lg font-bold">
            {preview?.tripTitle ?? 'CostTrip 여행 초대'}
          </h3>
          <p className="mt-1 text-sm opacity-90">
            수락하면 멤버로 합류해 일정과 예산을 함께 관리해요
          </p>
        </div>

        {preview && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={16} className="shrink-0 text-ink-3" />
              <span className="text-ink-2">목적지</span>
              <span className="ml-auto font-medium text-ink">
                {preview.destination}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays size={16} className="shrink-0 text-ink-3" />
              <span className="text-ink-2">기간</span>
              <span className="ml-auto font-medium text-ink">
                {formatDate(preview.startDate)} ~ {formatDate(preview.endDate)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users size={16} className="shrink-0 text-ink-3" />
              <span className="text-ink-2">현재 멤버</span>
              <span className="ml-auto font-medium text-ink">
                {preview.memberCount}명
              </span>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-3 rounded-sm bg-surface-bg-alt px-4 py-3">
        <Lightbulb size={16} className="shrink-0 text-brand" />
        <p className="text-sm text-ink">
          수락하면 <span className="font-semibold">{roleLabel}</span> 권한으로
          합류해 일정·지출을 함께 기록할 수 있어요.
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
  );
}
