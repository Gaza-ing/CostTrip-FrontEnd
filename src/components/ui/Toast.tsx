'use client';

import { cn } from '@/lib/utils';
import { useToastStore, type ToastType } from '@/stores/toast-store';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: 'border-l-ok text-ok-text',
  error: 'border-l-danger text-danger-text',
  info: 'border-l-brand text-brand-dark',
};

/**
 * 전역 토스트 뷰포트. 화면 우하단(모바일은 하단 중앙)에 토스트를 쌓아 보여준다.
 * Providers 최상단에 한 번만 마운트한다.
 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end"
      role="region"
      aria-label="알림"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-surface-line border-l-4 bg-surface-card px-4 py-3 shadow-base',
              STYLES[t.type],
            )}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-sm text-ink">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 text-ink-3 transition-colors hover:text-ink"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
