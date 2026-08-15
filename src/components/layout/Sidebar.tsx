'use client';

import { cn } from '@/lib/utils';
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  Receipt,
  Settings,
  Home,
  Users,
  Wallet,
  PanelLeftClose,
  Calendar,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/stores/app-store';
import { useRef, useCallback } from 'react';
import type { ElementType } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: ElementType;
}

const globalNav: NavItem[] = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/notifications', label: '알림', icon: Bell },
  { href: '/settings', label: '설정', icon: Settings },
];

interface NavGroup {
  group: string;
  items: { href: string; label: string; icon: ElementType }[];
}

const tripNav: NavGroup[] = [
  {
    group: '계획',
    items: [
      { href: '', label: '여행 메인', icon: ClipboardList },
      { href: '/plan/0', label: '날짜별 계획', icon: Calendar },
      { href: '/budget', label: '예산 설정', icon: DollarSign },
      { href: '/members', label: '그룹 · 멤버', icon: Users },
    ],
  },
  {
    group: '진행',
    items: [
      { href: '/progress', label: '진행 대시보드', icon: LayoutDashboard },
      { href: '/expense', label: '지출 내역', icon: Receipt },
      { href: '/settlement', label: '정산', icon: Wallet },
    ],
  },
];

interface SidebarProps {
  tripId?: string;
  tripTitle?: string;
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

export function Sidebar({ tripId, tripTitle }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, sidebarWidth, toggleSidebar, setSidebarWidth } =
    useAppStore();
  const isResizing = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const startX = e.clientX;
      const startWidth = sidebarWidth;

      function onMouseMove(ev: MouseEvent) {
        if (!isResizing.current) return;
        const newWidth = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startWidth + ev.clientX - startX),
        );
        setSidebarWidth(newWidth);
      }

      function onMouseUp() {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [sidebarWidth, setSidebarWidth],
  );

  if (!sidebarOpen) {
    return null;
  }

  return (
    <aside
      className="fixed left-0 top-0 z-30 hidden h-full flex-col border-r border-surface-line bg-surface-card lg:flex"
      style={{ width: sidebarWidth }}
    >
      {/* 로고 + 토글 */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-surface-line">
        <Link href="/home" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-on-brand shadow-sm">
            C
          </span>
          <span className="text-base font-bold text-ink">
            Cost<span className="text-brand">Trip</span>
          </span>
        </Link>
        <button
          onClick={toggleSidebar}
          className="flex h-7 w-7 items-center justify-center rounded-xs text-ink-3 hover:bg-surface-bg-alt transition-colors"
          aria-label="사이드바 접기"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* 내비게이션 */}
      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        {/* 메뉴 라벨 */}
        <p className="mb-2 px-3 text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
          메뉴
        </p>
        <ul className="space-y-0.5">
          {globalNav.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xs px-3 py-2 text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-brand-soft text-brand-dark font-medium'
                      : 'text-ink-2 hover:bg-surface-bg-alt',
                  )}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 여행 서브 내비 */}
        {tripId && (
          <div className="mt-5 border-t border-surface-line pt-4">
            {/* 여행 정보 */}
            <div className="px-4 mb-3">
              <p className="text-sm font-bold text-ink">
                {tripTitle || '여행'}
              </p>
              <p className="text-[11px] text-ink-3 mt-0.5">
                간사이 · 4박5일 · 4명
              </p>
            </div>

            {/* 계획/진행 세그먼트 토글 */}
            <div className="mx-3 mb-4 inline-flex w-[calc(100%-24px)] items-center rounded-pill bg-surface-bg-alt p-1">
              <button className="flex-1 rounded-pill bg-surface-card px-3 py-1.5 text-xs font-medium text-brand shadow-sm">
                계획
              </button>
              <button className="flex-1 rounded-pill px-3 py-1.5 text-xs font-medium text-ink-3">
                진행
              </button>
            </div>

            {tripNav.map((group) => (
              <div key={group.group} className="mb-3">
                <p className="mb-1 px-3 text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
                  {group.group}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const fullHref = `/trip/${tripId}${item.href}`;
                    const Icon = item.icon;
                    const isActive =
                      item.href === ''
                        ? pathname === `/trip/${tripId}`
                        : pathname.startsWith(fullHref);
                    return (
                      <li key={item.href}>
                        <Link
                          href={fullHref}
                          className={cn(
                            'flex items-center gap-3 rounded-xs px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-brand-soft text-brand-dark font-medium'
                              : 'text-ink-2 hover:bg-surface-bg-alt',
                          )}
                        >
                          <Icon size={17} />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* 하단: 사용자 정보 */}
      <div className="border-t border-surface-line p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-brand text-sm font-medium text-on-brand">
            지
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">김지원</p>
            <p className="text-xs text-ink-3">owner</p>
          </div>
        </div>
      </div>

      {/* 리사이즈 핸들 */}
      <div
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand/30 active:bg-brand/40 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </aside>
  );
}
