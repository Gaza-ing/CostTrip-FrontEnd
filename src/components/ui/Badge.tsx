import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'default' | 'brand' | 'ok' | 'warn' | 'danger' | 'category';
type CategoryColor = 'stay' | 'move' | 'food' | 'tour' | 'shop' | 'etc';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  category?: CategoryColor;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-bg-alt text-ink-2',
  brand: 'bg-brand-soft text-brand-dark',
  ok: 'bg-ok-soft text-ok-text',
  warn: 'bg-warn-soft text-warn-text',
  danger: 'bg-danger-soft text-danger-text',
  category: '', // handled by category prop
};

const categoryStyles: Record<CategoryColor, string> = {
  stay: 'bg-cat-stay-soft text-cat-stay',
  move: 'bg-cat-move-soft text-cat-move',
  food: 'bg-cat-food-soft text-cat-food',
  tour: 'bg-cat-tour-soft text-cat-tour',
  shop: 'bg-cat-shop-soft text-cat-shop',
  etc: 'bg-cat-etc-soft text-cat-etc',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', category, className, children, ...props }, ref) => {
    const colorStyle =
      variant === 'category' && category
        ? categoryStyles[category]
        : variantStyles[variant];

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium',
          colorStyle,
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
