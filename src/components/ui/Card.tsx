import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'base' | 'md';
}

const paddingStyles = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const shadowStyles = {
  none: '',
  sm: 'shadow-sm',
  base: 'shadow-base',
  md: 'shadow-md',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', shadow = 'base', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface-card rounded-md border border-surface-line',
          paddingStyles[padding],
          shadowStyles[shadow],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('mb-3 flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn('text-base font-semibold text-ink', className)}
      {...props}
    >
      {children}
    </h3>
  );
});

CardTitle.displayName = 'CardTitle';
