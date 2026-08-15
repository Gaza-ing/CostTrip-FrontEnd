'use client';

import { cn } from '@/lib/utils';
import {
  Bell,
  ClipboardList,
  HandCoins,
  LayoutDashboard,
  Receipt,
  Settings,
  Home,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
      { href: '/budget', label: '예산 설정', icon: Wallet },
      { href: '/members', label: '멤버 관리', icon: Users },
    ],
  },
  {
    group: '진행',
    items: [
      { href: '/progress', label: '진행 대시보드', icon: LayoutDashboard },
      { href: '/expense', label: '지출 내역', icon: Receipt },
      { href: '/settlement', label: '정산', icon: HandCoins },
    ],
  },
];

interface SidebarProps {
  tripId?: string;
  tripTitle?: string;
}

export function Sidebar({ tripId, tripTitle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-full w-60 flex-col border-r border-surface-line bg-surface-card lg:flex">
      {/* 로고 */}
      <div className="flex h-16 items-center px-5 border-b border-surface-line">
        <Link href="/home" className="text-lg font-bold text-brand">
          CostTrip
        </Link>
      </div>

      {/* 글로벌 내비 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
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
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 여행 서브 내비 */}
        {tripId && (
          <div className="mt-6 border-t border-surface-line pt-4">
            <p className="mb-3 px-3 text-xs font-medium text-ink-3 uppercase tracking-wider">
              {tripTitle || '여행'}
            </p>
            {tripNav.map((group) => (
              <div key={group.group} className="mb-4">
                <p className="mb-1 px-3 text-xs font-medium text-ink-3">
                  {group.group}
                </p>
                <ul className="space-y-1">
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
                          <Icon size={18} />
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

      {/* 새 여행 생성 → 사용자 정보 */}
      <div className="border-t border-surface-line p-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-brand text-xs font-medium text-on-brand">
            지
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">김지원</p>
            <p className="text-xs text-ink-3">owner</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
