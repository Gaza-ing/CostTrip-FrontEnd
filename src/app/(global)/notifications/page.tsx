'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'category_warning'
  | 'category_exceeded'
  | 'settlement'
  | 'member_expense'
  | 'invite'
  | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  level: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  isRead: boolean;
  triggeredAt: string;
  icon: string;
  iconBg?: string;
  iconColor?: string;
  progress?: number;
  action?: { label: string; href: string };
}

// Mock data
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'category_exceeded',
    level: 'critical',
    title: '쇼핑 예산 초과 🔴',
    body: '쇼핑 예산을 초과했어요 ₩340,000 / 300,000 (113%). 추가 지출 시 정산에 반영돼요.',
    isRead: false,
    triggeredAt: '2026-08-27T15:12:00',
    icon: '🛍',
    progress: 100,
  },
  {
    id: 'n2',
    type: 'category_warning',
    level: 'warning',
    title: '식비 예산 임박 ⚠️',
    body: '식비 예산의 87%를 사용했어요 (₩520,000 / 600,000). 남은 예산 ₩80,000.',
    isRead: false,
    triggeredAt: '2026-08-27T13:04:00',
    icon: '🍢',
    progress: 87,
  },
  {
    id: 'n3',
    type: 'info',
    level: 'info',
    title: 'Day 3 시작 안내',
    body: '오늘은 오사카성 · 도톤보리 일정이에요. 누적 65% 사용 중입니다.',
    isRead: false,
    triggeredAt: '2026-08-27T09:00:00',
    icon: '📅',
    iconBg: 'var(--color-brand-soft)',
    iconColor: 'var(--color-brand-dark)',
  },
  {
    id: 'n4',
    type: 'settlement',
    level: 'info',
    title: '최유나님이 정산을 요청했어요',
    body: '최유나님이 정산 확인을 요청했어요. 보낼 금액 ₩140,000.',
    isRead: true,
    triggeredAt: '2026-08-26T21:40:00',
    icon: '💳',
    iconBg: 'var(--color-m-purple-soft, #F3EAFF)',
    iconColor: 'var(--color-m-purple, #8B5CF6)',
    action: { label: '정산 보기', href: '/trip/trip-001/settlement' },
  },
  {
    id: 'n5',
    type: 'invite',
    level: 'info',
    title: '박서준님이 여행에 합류했어요',
    body: '박서준님이 오사카 우정여행에 editor로 참여했어요.',
    isRead: true,
    triggeredAt: '2026-08-26T18:22:00',
    icon: '서',
    iconBg: '#10B981',
  },
  {
    id: 'n6',
    type: 'member_expense',
    level: 'info',
    title: '유니버설 입장권이 등록됐어요',
    body: '관광 · 김지원 결제 · 4명 균등 · ₩96,000',
    isRead: true,
    triggeredAt: '2026-08-26T10:05:00',
    icon: '🎢',
  },
];

type FilterPreset = 'all' | 'unread' | 'budget' | 'settlement' | 'member';

const FILTER_PRESETS: { key: FilterPreset; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'unread', label: '안읽음' },
  { key: 'budget', label: '예산' },
  { key: 'settlement', label: '정산' },
  { key: 'member', label: '멤버' },
];

function filterNotifications(
  notifications: Notification[],
  filter: FilterPreset,
) {
  switch (filter) {
    case 'unread':
      return notifications.filter((n) => !n.isRead);
    case 'budget':
      return notifications.filter((n) =>
        [
          'budget_warning',
          'budget_exceeded',
          'category_warning',
          'category_exceeded',
        ].includes(n.type),
      );
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
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<FilterPreset>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const budgetWarningCount = notifications.filter(
    (n) =>
      [
        'budget_warning',
        'budget_exceeded',
        'category_warning',
        'category_exceeded',
      ].includes(n.type) && !n.isRead,
  ).length;
  const settlementCount = notifications.filter(
    (n) => n.type === 'settlement' && !n.isRead,
  ).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }

  // 헤더 액션: "모두 읽음" 버튼
  useHeaderAction(
    <HeaderActionButton variant="ghost" onClick={markAllRead}>
      ✓ 모두 읽음
    </HeaderActionButton>,
  );

  const filtered = filterNotifications(notifications, filter);
  const groups = groupByDate(filtered);

  return (
    <div className="space-y-5">
      {/* 상단 요약 stat (Web) */}
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
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">🔔</span>
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
                      {n.icon.length === 1 ? (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
                          style={{ backgroundColor: n.iconBg || '#6366F1' }}
                        >
                          {n.icon}
                        </div>
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-base shrink-0"
                          style={{
                            backgroundColor: n.iconBg || undefined,
                            color: n.iconColor || undefined,
                          }}
                        >
                          {n.icon}
                        </div>
                      )}

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

                        {/* 진행률 바 */}
                        {n.progress !== undefined && (
                          <div className="mt-2.5 h-2 w-full max-w-[280px] rounded-pill bg-surface-bg-alt overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-pill',
                                n.level === 'critical'
                                  ? 'bg-danger'
                                  : n.level === 'warning'
                                    ? 'bg-warn'
                                    : 'bg-brand',
                              )}
                              style={{
                                width: `${Math.min(n.progress, 100)}%`,
                              }}
                            />
                          </div>
                        )}

                        {/* 인라인 액션 */}
                        {n.action && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => markRead(n.id)}
                              className="rounded-pill bg-brand px-4 py-1.5 text-xs font-medium text-on-brand hover:bg-brand-dark transition-colors"
                            >
                              {n.action.label}
                            </button>
                            <button
                              onClick={() => markRead(n.id)}
                              className="rounded-pill border border-surface-line px-4 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-bg-alt transition-colors"
                            >
                              나중에
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
