'use client';

import {
  User,
  RefreshCw,
  Bell,
  CircleDollarSign,
  Upload,
  Users,
  CreditCard,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ProfileEditModal } from '@/components/settings/ProfileEditModal';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useMyProfile } from '@/hooks/use-my-profile';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';

type SectionId = 'account' | 'sync' | 'notification' | 'currency' | 'data';

const NAV_ITEMS: {
  id: SectionId;
  label: string;
  icon: ComponentType<{ size?: number }>;
}[] = [
  { id: 'account', label: '계정', icon: User },
  { id: 'sync', label: '동기화', icon: RefreshCw },
  { id: 'notification', label: '알림', icon: Bell },
  { id: 'currency', label: '통화', icon: CircleDollarSign },
  { id: 'data', label: '데이터', icon: Upload },
];

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-[46px] shrink-0 items-center rounded-pill transition-colors',
        checked ? 'bg-brand' : 'bg-surface-bg-alt',
      )}
    >
      <span
        className={cn(
          'absolute h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-all',
          checked ? 'right-[3px]' : 'left-[3px]',
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { displayName, email, avatarColor } = useMyProfile();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [budgetAlert, setBudgetAlert] = useState(true);
  const [memberAlert, setMemberAlert] = useState(true);
  const [settlementAlert, setSettlementAlert] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('account');

  // nav 클릭 → 해당 섹션으로 스크롤
  function scrollToSection(id: SectionId) {
    setActiveSection(id);
    document
      .getElementById(`settings-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 스크롤 위치에 따라 활성 섹션 하이라이트
  useEffect(() => {
    const sections = NAV_ITEMS.map((n) =>
      document.getElementById(`settings-${n.id}`),
    ).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 화면 상단에 가장 가깝게 보이는 섹션을 활성으로
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.id.replace('settings-', '') as SectionId;
          setActiveSection(id);
        }
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: 0 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr] items-start">
        {/* 좌: 하위 탭 내비 */}
        <Card className="sticky top-20 hidden lg:block">
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                aria-current={activeSection === id ? 'true' : undefined}
                className={cn(
                  'w-full flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors',
                  activeSection === id
                    ? 'text-brand bg-brand-tint'
                    : 'text-ink-2 hover:bg-surface-bg-alt',
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </Card>

        {/* 우: 설정 폼 */}
        <div className="space-y-6 min-w-0">
          {/* 계정 */}
          <section id="settings-account" className="scroll-mt-24">
            <h2 className="text-[13px] font-bold text-ink-2 mb-3">계정</h2>
            <Card>
              <div className="flex items-center gap-4">
                <Avatar name={displayName} color={avatarColor} size={56} />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-ink">{displayName}</p>
                  <p className="text-sm text-ink-3 truncate">{email}</p>
                </div>
                <Button size="sm" onClick={() => setProfileOpen(true)}>
                  프로필 수정
                </Button>
              </div>
            </Card>
          </section>

          {/* 동기화 */}
          <section id="settings-sync" className="scroll-mt-24">
            <h2 className="text-[13px] font-bold text-ink-2 mb-3">동기화</h2>
            <Card>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-cat-stay-soft text-cat-stay">
                  <RefreshCw size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink">동기화 상태</p>
                  <p className="text-xs text-ink-3">
                    마지막 동기화 · 2026.08.27 14:32{' '}
                    <Badge variant="ok" className="ml-1">
                      최신
                    </Badge>
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="border-brand-soft text-brand-dark hover:bg-brand-soft"
                >
                  지금 강제 동기화
                </Button>
              </div>
            </Card>
          </section>

          {/* 알림 */}
          <section id="settings-notification" className="scroll-mt-24">
            <h2 className="text-[13px] font-bold text-ink-2 mb-3">알림</h2>
            <Card>
              <div className="divide-y divide-surface-line">
                <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-cat-shop-soft text-cat-shop">
                    <Bell size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">예산 경고</p>
                    <p className="text-xs text-ink-3">
                      카테고리 예산 임박(80%)·초과 시 알림
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={budgetAlert}
                    onChange={setBudgetAlert}
                  />
                </div>
                <div className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-cat-move-soft text-cat-move">
                    <Users size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">멤버 활동</p>
                    <p className="text-xs text-ink-3">
                      멤버의 지출 추가·초대 수락 알림
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={memberAlert}
                    onChange={setMemberAlert}
                  />
                </div>
                <div className="flex items-center gap-3 py-3 last:pb-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-cat-tour-soft text-cat-tour">
                    <CreditCard size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">정산 알림</p>
                    <p className="text-xs text-ink-3">송금 요청·완료 시 알림</p>
                  </div>
                  <ToggleSwitch
                    checked={settlementAlert}
                    onChange={setSettlementAlert}
                  />
                </div>
              </div>
            </Card>
          </section>

          {/* 통화 */}
          <section id="settings-currency" className="scroll-mt-24">
            <h2 className="text-[13px] font-bold text-ink-2 mb-3">통화</h2>
            <Card>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <p className="text-xs font-medium text-ink-3 mb-1.5">
                    기본 통화
                  </p>
                  <select
                    disabled
                    className="h-10 w-full rounded-sm border border-surface-line bg-surface-card px-3 text-sm text-ink opacity-70 cursor-not-allowed"
                  >
                    <option>대한민국 원 (KRW) ₩</option>
                  </select>
                </div>
                <span className="mb-1 inline-flex items-center gap-1 rounded-pill border border-dashed border-surface-line-strong px-3 py-1.5 text-[11px] text-ink-3">
                  <CircleDollarSign size={13} />
                  다중통화 [TODO]
                </span>
              </div>
              <p className="mt-3 text-xs text-ink-3">
                현재 모든 금액은 원화(KRW)로 표기됩니다. 다중통화 지원은 준비
                중입니다.
              </p>
            </Card>
          </section>

          {/* 데이터 */}
          <section id="settings-data" className="scroll-mt-24">
            <h2 className="text-[13px] font-bold text-ink-2 mb-3">데이터</h2>
            <Card>
              <div className="divide-y divide-surface-line">
                <div className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-cat-food-soft text-cat-food">
                    <Upload size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">
                      데이터 내보내기
                    </p>
                    <p className="text-xs text-ink-3">
                      여행 지출·정산 내역 내보내기
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/settings/export">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="border-transparent text-white hover:opacity-90"
                        style={{ backgroundColor: '#1D6F42' }}
                      >
                        <FileSpreadsheet size={15} />
                        CSV
                      </Button>
                    </Link>
                    <Link href="/settings/export">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="border-transparent text-white hover:opacity-90"
                        style={{ backgroundColor: '#D93831' }}
                      >
                        <FileText size={15} />
                        PDF
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 last:pb-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-cat-etc-soft text-cat-etc">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">약관 및 정책</p>
                    <p className="text-xs text-ink-3">
                      서비스 이용약관 · 개인정보처리방침
                    </p>
                  </div>
                  <span className="text-xl text-ink-3">›</span>
                </div>
              </div>
            </Card>
          </section>

          {/* 하단: 버전 + 로그아웃 */}
          <div className="flex items-center justify-between border-t border-surface-line pt-4">
            <span className="text-xs text-ink-3">CostTrip v1.0.0</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger-text border border-danger-soft"
              onClick={handleSignOut}
            >
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      {/* 프로필 수정 모달 */}
      <ProfileEditModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        initialName={displayName}
        initialColor={avatarColor}
        email={email}
        onSaved={() => {
          // 세션 metadata 갱신 반영 + me 캐시 무효화
          void supabase.auth.refreshSession();
          queryClient.invalidateQueries({ queryKey: ['me'] });
        }}
      />
    </div>
  );
}
