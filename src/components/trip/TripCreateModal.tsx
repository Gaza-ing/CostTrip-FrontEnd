'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useCreateTrip } from '@/hooks/use-trips';
import { formatKRW } from '@/lib/utils';
import { MapPin, Search, ChevronDown, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface TripCreateModalProps {
  open: boolean;
  onClose: () => void;
}

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  color: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  editor: '편집',
  viewer: '보기',
};

const MEMBER_COLORS = ['bg-brand', 'bg-ok', 'bg-warn', 'bg-member-purple'];

export function TripCreateModal({ open, onClose }: TripCreateModalProps) {
  const router = useRouter();
  const createTrip = useCreateTrip();

  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    headcount: 4,
    totalBudget: 2400000,
  });

  const [members, setMembers] = useState<MemberItem[]>([
    {
      id: 'me',
      name: '김지원 (나)',
      email: 'owner',
      role: 'owner',
      color: MEMBER_COLORS[0],
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!form.destination) newErrors.destination = '목적지를 입력해주세요';
    if (!form.startDate) newErrors.startDate = '시작일을 선택해주세요';
    if (!form.endDate) newErrors.endDate = '종료일을 선택해주세요';
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      newErrors.endDate = '종료일이 시작일보다 빠를 수 없습니다';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    const newMember: MemberItem = {
      id: `member-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: 'editor',
      color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
    };
    setMembers((prev) => [...prev, newMember]);
    setInviteEmail('');
  }

  function handleRoleChange(memberId: string, role: 'editor' | 'viewer') {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const title = form.title || form.destination;

    createTrip.mutate(
      {
        title,
        destination: form.destination,
        startDate: form.startDate,
        endDate: form.endDate,
        headcount: members.length,
        totalBudget: form.totalBudget,
        currencyCode: 'KRW',
        tripTimeZone: 'Asia/Seoul',
        status: 'planning',
      },
      {
        onSuccess: (trip) => {
          onClose();
          router.push(`/trip/${trip.id}`);
        },
      },
    );
  }

  const dayCount =
    form.startDate && form.endDate
      ? Math.ceil(
          (new Date(form.endDate).getTime() -
            new Date(form.startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : null;

  const summaryParts = [
    form.destination || '목적지',
    dayCount ? `${dayCount - 1}박${dayCount}일` : '',
    `${members.length}명`,
    form.totalBudget ? formatKRW(form.totalBudget) : '',
  ].filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        {/* 헤더 (고정) */}
        <div className="shrink-0 border-b border-surface-line px-6 pb-4 pt-6">
          <h2 className="text-xl font-bold text-ink">새 여행 만들기</h2>
          <p className="mt-1 text-sm text-ink-3">
            여행 기본 정보를 입력하고 멤버를 초대하세요
          </p>
        </div>

        {/* 스크롤 영역 */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          <div className="space-y-5">
            {/* 예산 추천 배너 */}
            <div className="rounded-sm bg-brand-tint p-4">
              <p className="text-sm text-ink">
                💡 일정 일수에 맞춰 카테고리별 예산을 자동 추천해 드려요.{' '}
                <span className="inline-flex items-center rounded-pill bg-surface-bg-alt px-2 py-0.5 text-xs text-ink-3">
                  예정
                </span>
              </p>
              <p className="mt-1 text-xs text-ink-3">
                추천 실행은 아직 제공하지 않아요. 누르면 예산 설정 화면으로만
                이동해요.
              </p>
            </div>

            {/* 여행 이름 */}
            <Input
              label="여행 이름"
              placeholder="오사카 우정여행"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />

            {/* 목적지 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">
                목적지
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                />
                <input
                  type="text"
                  placeholder="오사카, 일본"
                  value={form.destination}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, destination: e.target.value }))
                  }
                  className="h-10 w-full rounded-xs border border-surface-line bg-surface-card pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              {errors.destination && (
                <p className="mt-1 text-xs text-danger-text">
                  {errors.destination}
                </p>
              )}
              {/* 프리셋 칩 */}
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { name: '오사카', icon: '✈️' },
                  { name: '도쿄', icon: '🗼' },
                  { name: '강릉', icon: '🌊' },
                  { name: '제주', icon: '🌴' },
                ].map((place) => (
                  <button
                    key={place.name}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, destination: place.name }))
                    }
                    className={`flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition-colors ${
                      form.destination === place.name
                        ? 'border-brand bg-brand-soft text-brand-dark font-medium'
                        : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt'
                    }`}
                  >
                    <span>{place.icon}</span>
                    {place.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 시작일 / 종료일 / 인원 */}
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="시작일"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    startDate: e.target.value,
                    // 시작일이 종료일보다 뒤면 종료일 초기화
                    endDate:
                      f.endDate && e.target.value > f.endDate ? '' : f.endDate,
                  }))
                }
                error={errors.startDate}
              />
              <Input
                label="종료일"
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                error={errors.endDate}
              />
              <Input
                label="인원"
                type="number"
                min={1}
                max={50}
                value={members.length.toString()}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    headcount: parseInt(e.target.value) || 1,
                  }))
                }
                hint={dayCount ? `${dayCount - 1}박${dayCount}일` : undefined}
              />
            </div>

            {/* 전체 예산 + 통화 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">
                전체 예산 (KRW)
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">
                    ₩
                  </span>
                  <input
                    type="text"
                    value={form.totalBudget.toLocaleString()}
                    onChange={(e) => {
                      const num =
                        parseInt(e.target.value.replace(/,/g, '')) || 0;
                      setForm((f) => ({ ...f, totalBudget: num }));
                    }}
                    className="h-10 w-full rounded-xs border border-surface-line bg-surface-card pl-7 pr-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 items-center rounded-xs border border-surface-line px-3 text-sm text-ink-2">
                    원 (KRW) <ChevronDown size={12} className="ml-1" />
                  </span>
                  <span className="flex h-10 items-center rounded-xs border border-dashed border-surface-line-strong px-3 text-xs text-ink-3">
                    $ 다중통화 [TODO]
                  </span>
                </div>
              </div>
            </div>

            {/* 멤버 초대 */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-ink-2">
                  멤버 초대
                </label>
                <span className="text-sm font-medium text-brand">
                  {members.length}명 그룹
                </span>
              </div>

              <div className="mt-3 rounded-sm border border-surface-line">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 border-b border-surface-line px-4 py-3 last:border-b-0"
                  >
                    {/* 아바타 */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-sm font-medium text-on-brand ${member.color}`}
                    >
                      {member.name.charAt(0)}
                    </div>
                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-ink-3 truncate">
                        {member.email}
                      </p>
                    </div>
                    {/* 역할 */}
                    {member.role === 'owner' ? (
                      <span className="shrink-0 rounded-xs border border-surface-line px-2 py-1 text-xs text-ink-3">
                        소유자
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(
                            member.id,
                            e.target.value as 'editor' | 'viewer',
                          )
                        }
                        className="shrink-0 rounded-xs border border-surface-line bg-surface-card px-2 py-1 text-xs text-ink-2 focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value="editor">편집</option>
                        <option value="viewer">보기</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>

              {/* 이메일로 초대 */}
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-ink-2">
                  이메일로 초대
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleInvite();
                      }
                    }}
                    className="h-10 flex-1 rounded-xs border border-surface-line bg-surface-card px-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleInvite}
                  >
                    초대
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 푸터 (고정) */}
        <div className="shrink-0 flex items-center justify-between border-t border-surface-line px-6 py-4">
          <p className="text-sm text-ink-3">✏️ {summaryParts.join(' · ')}</p>
          <div className="flex gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={createTrip.isPending}>
              {createTrip.isPending ? '생성 중...' : '여행 만들기'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
