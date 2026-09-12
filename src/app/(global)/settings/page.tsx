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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useMe } from '@/hooks/use-auth-user';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  const { data: me } = useMe();
  const { signOut } = useAuth();
  const [budgetAlert, setBudgetAlert] = useState(true);
  const [memberAlert, setMemberAlert] = useState(true);
  const [settlementAlert, setSettlementAlert] = useState(false);

  const displayName = me?.displayName || '사용자';
  const email = me?.email || '';

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
            <button className="w-full flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-brand bg-brand-tint">
              <User size={16} />
              계정
            </button>
            <button className="w-full flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-bg-alt transition-colors">
              <RefreshCw size={16} />
              동기화
            </button>
            <button className="w-full flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-bg-alt transition-colors">
              <Bell size={16} />
              알림
            </button>
            <button className="w-full flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-bg-alt transition-colors">
              <CircleDollarSign size={16} />
              통화
            </button>
            <button className="w-full flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-bg-alt transition-colors">
              <Upload size={16} />
              데이터
            </button>
          </nav>
        </Card>

        {/* 우: 설정 폼 */}
        <div className="space-y-6 min-w-0">
          {/* 계정 */}
          <section>
            <h2 className="text-[13px] font-bold text-ink-2 mb-3">계정</h2>
            <Card>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-lg font-bold text-on-brand">
                  {displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-ink">{displayName}</p>
                  <p className="text-sm text-ink-3 truncate">{email}</p>
                </div>
                <Button variant="ghost" size="sm">
                  프로필 수정
                </Button>
              </div>
            </Card>
          </section>

          {/* 동기화 */}
          <section>
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
                <Button variant="ghost" size="sm">
                  지금 강제 동기화
                </Button>
              </div>
            </Card>
          </section>

          {/* 알림 */}
          <section>
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
          <section>
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
          <section>
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
                      <Button variant="ghost" size="sm">
                        CSV
                      </Button>
                    </Link>
                    <Link href="/settings/export">
                      <Button variant="ghost" size="sm">
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
    </div>
  );
}
