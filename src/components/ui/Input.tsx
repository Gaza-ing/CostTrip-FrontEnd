'use client';

import { cn } from '@/lib/utils';
import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xs border bg-surface-card px-3 text-sm text-ink placeholder:text-ink-3 transition-colors',
            // 마우스 클릭 후엔 포커스 테두리가 남지 않도록 focus-visible 사용
            // (키보드 탐색 시에만 링/테두리 표시 → 접근성 유지)
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand',
            error
              ? 'border-danger focus-visible:ring-danger'
              : 'border-surface-line hover:border-surface-line-strong',
            props.disabled && 'opacity-50 cursor-not-allowed bg-surface-bg',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-danger-text">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-ink-3">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
