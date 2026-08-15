'use client';

import { cn } from '@/lib/utils';
import {
  Bell,
  ClipboardList,
  HandCoins,
  Home,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ElementType } from 'react';

interface TabItem {
  href: string;
  label: string;
  icon: ElementType;
}

const globalTabs: TabItem[] = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/notifications', label: '알림', icon: Bell },
  { href: '/settings', label: '설정', icon: Settings },
];

interface MobileTabBarProps {
  tripId?: string;
}

export function MobileTabBar({ tripId }: MobileTabBarProps) {
  const pathname = usePathname();

  const tripTabs: TabItem[] = tripId
    ? [
        { href: '/home', label: '홈', icon: Home },
        { href: `/trip/${tripId}`, label: '계획', icon: ClipboardList },
        {
          href: `/trip/${tripId}/progress`,
          label: '진행',
          icon: LayoutDashboard,
        },
        { href: `/trip/${tripId}/settlement`, label: '정산', icon: HandCoins },
      ]
    : [];

  const tabs = tripId ? tripTabs : globalTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-line bg-surface-card shadow-up lg:hidden">
      <ul className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === `/trip/${tripId}`
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-4 py-1 text-xs transition-colors',
                  isActive
                    ? 'text-brand font-medium'
                    : 'text-ink-3 hover:text-ink-2',
                )}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
