import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** 0~100 */
  value: number;
  /** 임계 단계에 따라 색 변경 */
  status?: 'normal' | 'warn' | 'danger';
  /** 높이 */
  size?: 'sm' | 'md';
  /** 라벨 (접근성) */
  label?: string;
}

const statusColors = {
  normal: 'bg-brand',
  warn: 'bg-warn',
  danger: 'bg-danger',
};

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    { value, status = 'normal', size = 'md', label, className, ...props },
    ref,
  ) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'w-full rounded-pill bg-surface-bg-alt overflow-hidden',
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-pill transition-all duration-300',
            statusColors[status],
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );
  },
);

ProgressBar.displayName = 'ProgressBar';
