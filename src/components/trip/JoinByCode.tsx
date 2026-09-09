'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAcceptInvite } from '@/hooks/use-members';
import { toast } from '@/stores/toast-store';
import { ApiError } from '@/lib/api/client';

/**
 * 초대 코드를 입력해 여행에 합류하는 카드.
 * 홈 화면 등에 배치한다. 성공 시 해당 여행 상세로 이동.
 */
export function JoinByCode() {
  const router = useRouter();
  const acceptMut = useAcceptInvite();
  const [code, setCode] = useState('');

  function handleJoin() {
    const trimmed = code.trim().replace(/\s/g, '').toUpperCase();
    if (!trimmed) {
      toast.info('초대 코드를 입력하세요');
      return;
    }
    acceptMut.mutate(
      { code: trimmed },
      {
        onSuccess: (data) => {
          toast.success('여행에 합류했어요');
          setCode('');
          router.push(`/trip/${data.tripId}`);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError && typeof err.detail === 'string'
              ? err.detail
              : '초대 코드가 올바르지 않거나 만료되었어요';
          toast.error(msg);
        },
      },
    );
  }

  return (
    <div className="rounded-md border border-surface-line bg-surface-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🎟️</span>
        <h3 className="text-sm font-bold text-ink">초대 코드로 참여</h3>
      </div>
      <p className="text-xs text-ink-3 mb-3">
        친구에게 받은 초대 코드를 입력하면 그 여행에 합류합니다.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="예: A3F5K9"
          maxLength={12}
          className="h-10 flex-1 min-w-0 rounded-sm border border-surface-line bg-surface-card px-3 text-sm uppercase tracking-widest text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <Button
          size="sm"
          className="shrink-0 px-5"
          disabled={acceptMut.isPending}
          onClick={handleJoin}
        >
          {acceptMut.isPending ? '합류 중...' : '참여'}
        </Button>
      </div>
    </div>
  );
}
