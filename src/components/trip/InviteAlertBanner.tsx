'use client';

import Link from 'next/link';
import { Mail, ChevronRight } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';

/**
 * 받은 여행 초대(안읽은 invite 알림)가 있을 때만 홈 상단에 노출되는 유도 배너.
 * 클릭하면 알림 페이지로 이동해 수락/거절할 수 있다.
 * 초대가 없으면 아무것도 렌더링하지 않는다.
 */
export function InviteAlertBanner() {
  const { data: notifications } = useNotifications();

  const inviteCount =
    notifications?.filter((n) => n.type === 'invite' && !n.isRead).length ?? 0;

  if (inviteCount === 0) return null;

  return (
    <Link
      href="/notifications"
      className="flex items-center gap-3 rounded-md border border-brand-soft bg-brand-tint px-4 py-3 transition-colors hover:bg-brand-soft"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
        <Mail size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">
          받은 여행 초대 {inviteCount}건이 있어요
        </p>
        <p className="text-xs text-ink-3">
          수락하면 멤버로 합류해 일정과 지출을 함께 관리할 수 있어요
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-dark">
        확인하기
        <ChevronRight size={16} />
      </span>
    </Link>
  );
}
