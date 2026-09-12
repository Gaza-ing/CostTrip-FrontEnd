'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { cn } from '@/lib/utils';
import {
  Wallet,
  PieChart,
  Timer,
  CreditCard,
  Receipt,
  Users,
  CalendarDays,
  Bell,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications';
import { useState } from 'react';
import type { Notification, NotificationType } from '@/types';

type FilterPreset = 'all' | 'unread' | 'budget' | 'settlement' | 'member';

const FILTER_PRESETS: { key: FilterPreset; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'unread', label: '안읽음' },
  { key: 'budget', label: '예산' },
  { key: 'settlement', label: '정산' },
  { key: 'member', label: '멤버' },
];

const BUDGET_TYPES: NotificationType[] = [
  'budget_warning',
  'budget_exceeded',
  'category_warning',
  'category_exceeded',
  'pace_warning',
];

/** type 기반 아이콘 (백엔드에 icon 필드가 없어 프론트에서 파생) */
function iconFor(type: NotificationType): LucideIcon {
  switch (type) {
    case 'budget_warning':
    case 'budget_exceeded':
      return Wallet;
    case 'category_warning':
    case 'category_exceeded':
      return PieChart;
    case 'pace_warning':
      return Timer;
    case 'settlement':
      return CreditCard;
    case 'member_expense':
      return Receipt;
    case 'invite':
      return Users;
    default:
      return CalendarDays;
  }
}

function filterNotifications(
  notifications: Notification[],
  filter: FilterPreset,
) {
  switch (filter) {
    case 'unread':
      return notifications.filter((n) => !n.isRead);
    case 'budget':
      return notifications.filter((n) => BUDGET_TYPES.includes(n.type));
    case 'settlement':
      return notifications.filter((n) => n.type === 'settlement');
    case 'member':
      return notifications.filter((n) =>
        ['member_expense', 'invite'].includes(n.type),
      );
    default:
      return notifications;
  }
}

function groupByDate(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const n of notifications) {
    const date = new Date(n.triggeredAt).toDateString();
    let label = '';
    if (date === today) label = '오늘';
    else if (date === yesterday) label = '어제';
    else {
      const d = new Date(n.triggeredAt);
      label = `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
    }

    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return groups;
}

function getLevelBorderColor(level: string) {
  switch (level) {
    case 'critical':
      return 'border-l-[3px] border-l-danger';
    case 'warning':
      return 'border-l-[3px] border-l-warn';
    default:
      return 'border-l-[3px] border-l-brand';
  }
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markReadMut = useMarkNotificationRead();
  const markAllReadMut = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<FilterPreset>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const budgetWarningCount = notifications.filter(
    (n) => BUDGET_TYPES.includes(n.type) && !n.isRead,
  ).length;
  const settlementCount = notifications.filter(
    (n) => n.type === 'settlement' && !n.isRead,
  ).length;

  function markAllRead() {
    markAllReadMut.mutate();
  }

  function markRead(id: string) {
    markReadMut.mutate(id);
  }

  useHeaderAction(
    <HeaderActionButton variant="ghost" onClick={markAllRead}>
      <CheckCheck size={16} />
      모두 읽음
    </HeaderActionButton>,
  );

  const filtered = filterNotifications(notifications, filter);
  const groups = groupByDate(filtered);

  return (
    <div className="space-y-5">
      {/* 상단 요약 stat */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">안읽은 알림</p>
          <p className="mt-1.5 text-2xl font-bold text-ink">{unreadCount}건</p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">예산 경고</p>
          <p className="mt-1.5 text-2xl font-bold text-danger-text">
            {budgetWarningCount}건
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">정산 요청</p>
          <p className="mt-1.5 text-2xl font-bold text-warn-text">
            {settlementCount}건
          </p>
        </div>
      </div>

      {/* 필터 + 카운트 */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-0.5 rounded-pill bg-surface-bg-alt p-1">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => setFilter(preset.key)}
              className={cn(
                'rounded-pill px-4 py-2 text-[13px] font-bold tracking-tight transition-all',
                filter === preset.key
                  ? 'bg-surface-card text-brand shadow-sm'
                  : 'text-ink-2',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-3">{filtered.length}개의 알림</span>
      </div>

      {/* 알림 리스트 */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-ink-3">
          알림 불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand">
            <Bell size={24} />
          </span>
          <h2 className="text-lg font-semibold text-ink">새 알림 없음</h2>
          <p className="mt-2 text-sm text-ink-3">
            {filter === 'unread'
              ? '안읽은 알림이 없어요'
              : filter === 'budget'
                ? '예산 알림이 없어요'
                : filter === 'settlement'
                  ? '정산 알림이 없어요'
                  : '알림이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-[13px] font-bold text-ink-2 mb-3">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.items.map((n) => (
                  <Card
                    key={n.id}
                    className={cn(
                      getLevelBorderColor(n.level),
                      n.isRead && 'opacity-75',
                      !n.isRead && 'bg-brand-tint',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* 아이콘 */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full shrink-0 bg-surface-bg-alt text-ink-2">
                        {(() => {
                          const Icon = iconFor(n.type);
                          return <Icon size={18} />;
                        })()}
                      </div>

                      {/* 본문 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-[15px] font-bold text-ink truncate">
                            {n.title}
                          </h3>
                          {n.level === 'critical' && (
                            <Badge variant="danger">초과</Badge>
                          )}
                          {n.level === 'warning' && (
                            <Badge variant="warn">임박</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-ink-2 leading-relaxed">
                          {n.body}
                        </p>

                        {/* 읽음 처리 버튼 (안읽은 것만) */}
                        {!n.isRead && (
                          <div className="mt-3">
                            <button
                              onClick={() => markRead(n.id)}
                              className="rounded-pill border border-surface-line px-4 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-bg-alt transition-colors"
                            >
                              읽음 처리
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 시각 + 읽음 배지 */}
                      <div className="shrink-0 text-right">
                        <span className="text-xs text-ink-3">
                          {new Date(n.triggeredAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </span>
                        <div className="mt-2">
                          {n.isRead ? (
                            <Badge>읽음</Badge>
                          ) : (
                            <Badge variant="brand">NEW</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
