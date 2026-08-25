'use client';

import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

type HeaderActionVariant = 'primary' | 'ghost';

interface HeaderActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: HeaderActionVariant;
}

const variantStyles: Record<HeaderActionVariant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-dark',
  ghost:
    'border border-surface-line bg-surface-card text-ink-2 hover:bg-surface-bg-alt',
};

/**
 * Topbar 우측에 노출되는 페이지별 헤더 액션 버튼.
 * mockup의 `.btn.btn-primary.btn-pill` / `.btn.btn-ghost.btn-pill` 스타일을 따른다.
 */
export const HeaderActionButton = forwardRef<
  HTMLButtonElement,
  HeaderActionButtonProps
>(({ variant = 'primary', className, disabled, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'flex h-9 items-center gap-1.5 rounded-pill px-4 text-sm font-medium transition-colors',
        variantStyles[variant],
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

HeaderActionButton.displayName = 'HeaderActionButton';
