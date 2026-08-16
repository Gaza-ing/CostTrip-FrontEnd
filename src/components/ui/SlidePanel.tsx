'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export function SlidePanel({
  open,
  onClose,
  title,
  children,
  width = 'w-[400px]',
}: SlidePanelProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* 백드롭 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/20"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* 패널 */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full border-l border-surface-line bg-surface-card shadow-md transition-transform duration-300',
          width,
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* 헤더 */}
        <div className="flex h-14 items-center justify-between border-b border-surface-line px-5">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xs border border-surface-line text-ink-3 hover:bg-surface-bg-alt transition-colors"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div className="h-[calc(100%-56px)] overflow-y-auto overscroll-contain p-5">
          {children}
        </div>
      </div>
    </>
  );
}
