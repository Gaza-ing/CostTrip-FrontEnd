'use client';

import { useAppStore } from '@/stores/app-store';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell, PanelLeftOpen, Plus, Search, X } from 'lucide-react';
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
  const { sidebarOpen, toggleSidebar, searchQuery, setSearchQuery } =
    useAppStore();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

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
        {/* 검색 (검색 대상이 있는 화면에서만 노출) */}
        {searchEnabled && (
          <div className="relative hidden sm:block">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-52 rounded-pill border border-surface-line bg-surface-bg pl-9 pr-9 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-ink-3 hover:bg-surface-bg-alt hover:text-ink-2 transition-colors"
                aria-label="검색어 지우기"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* 알림 */}
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-pill border border-surface-line text-warn hover:bg-surface-bg-alt transition-colors"
          aria-label={unreadCount > 0 ? `알림 ${unreadCount}건` : '알림'}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

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

        {/* 페이지별 동적 액션 (예: 그룹·멤버의 "멤버 초대", 알림의 "모두 읽음") */}
        {action}
      </div>
    </header>
  );
}
