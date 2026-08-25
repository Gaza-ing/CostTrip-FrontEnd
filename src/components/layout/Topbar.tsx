'use client';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { Bell, PanelLeftOpen, Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface TopbarProps {
  title: string;
  subtitle?: string | React.ReactNode;
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  onCreateTrip?: () => void;
  /** 페이지별로 달라지는 우측 액션 (예: 그룹·멤버 페이지의 "멤버 초대" 버튼) */
  action?: React.ReactNode;
}

export function Topbar({
  title,
  subtitle,
  searchEnabled = true,
  searchPlaceholder = '여행 검색',
  onCreateTrip,
  action,
}: TopbarProps) {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-line bg-surface-card px-6">
      {/* 좌: (로고 = 홈) + (토글 버튼) + 타이틀 */}
      <div className="flex items-center gap-3">
        {/* 사이드바 접힌 상태에서 로고 표시 (홈 링크) */}
        {!sidebarOpen && (
          <Link
            href="/home"
            className="flex items-center gap-2 mr-1"
            aria-label="홈으로"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-on-brand shadow-sm">
              C
            </span>
          </Link>
        )}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-xs text-ink-3 hover:bg-surface-bg-alt transition-colors"
            aria-label="사이드바 열기"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-ink">{title}</h1>
          {subtitle &&
            (typeof subtitle === 'string' ? (
              <span className="text-xs text-ink-3">{subtitle}</span>
            ) : (
              subtitle
            ))}
        </div>
      </div>

      {/* 우: 검색 + 알림 + 여행 생성 */}
      <div className="flex items-center gap-3">
        {/* 검색 */}
        <div
          className={cn(
            'relative hidden sm:block',
            !searchEnabled && 'opacity-50 pointer-events-none',
          )}
        >
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            disabled={!searchEnabled}
            className="h-9 w-52 rounded-pill border border-surface-line bg-surface-bg pl-9 pr-4 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
        </div>

        {/* 알림 */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-pill border border-surface-line text-ink-2 hover:bg-surface-bg-alt transition-colors"
          aria-label="알림"
        >
          <Bell size={16} />
        </button>

        {/* 여행 생성 */}
        {onCreateTrip && (
          <button
            onClick={onCreateTrip}
            className="flex h-9 items-center gap-1.5 rounded-pill bg-brand px-4 text-sm font-medium text-on-brand transition-colors hover:bg-brand-dark"
          >
            <Plus size={16} />
            <span>여행 생성</span>
          </button>
        )}

        {/* 페이지별 동적 액션 */}
        {action}
      </div>
    </header>
  );
}
