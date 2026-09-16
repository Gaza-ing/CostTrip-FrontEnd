'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /**
   * 백드롭(바깥) 클릭으로 닫히게 할지. 기본 true.
   * 입력이 많은 폼 모달은 false로 두어 X/취소 버튼(및 ESC)으로만 닫게 한다.
   * (ESC는 dismissible과 무관하게 항상 닫힌다)
   */
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  children,
  className,
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={dismissible ? onClose : undefined}
    >
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-ink/40" aria-hidden />

      {/* 모달 본체 */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative z-10 flex w-full flex-col rounded-md bg-surface-card shadow-md',
          'max-w-lg max-h-[calc(100vh-2rem)]',
          className,
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-xs border border-surface-line text-ink-3 hover:bg-surface-bg-alt hover:text-ink-2 transition-colors"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}
