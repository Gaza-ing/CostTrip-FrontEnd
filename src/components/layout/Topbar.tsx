'use client';

import { cn } from '@/lib/utils';
import { Bell, Search, User } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  searchEnabled?: boolean;
}

export function Topbar({ title, subtitle, searchEnabled = true }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-surface-line bg-surface-card px-6">
      {/* 좌: 타이틀 */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-ink">{title}</h1>
        {subtitle && <span className="text-sm text-ink-3">{subtitle}</span>}
      </div>

      {/* 우: 검색 + 알림 + 아바타 */}
      <div className="flex items-center gap-4">
        {/* 검색 */}
        <div
          className={cn(
            'relative hidden sm:block',
            !searchEnabled && 'opacity-50 pointer-events-none',
          )}
        >
          <input
            type="text"
            placeholder="검색..."
            disabled={!searchEnabled}
            className="h-8 w-48 rounded-xs border border-surface-line bg-surface-bg px-3 pr-8 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
          <Search
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3"
          />
        </div>

        {/* 알림 */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-xs text-ink-2 hover:bg-surface-bg-alt transition-colors"
          aria-label="알림"
        >
          <Bell size={18} />
        </button>

        {/* 아바타 */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-pill bg-brand-soft transition-colors hover:bg-brand-soft"
          aria-label="계정 메뉴"
        >
          <User size={16} className="text-brand-dark" />
        </button>
      </div>
    </header>
  );
}
