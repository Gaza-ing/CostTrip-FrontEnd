'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { cn } from '@/lib/utils';
import { useMemberStore, selectMembersByTrip } from '@/stores';
import { Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import type { Member } from '@/types';

// 멤버 아바타 색상
const MEMBER_COLORS = ['#6366F1', '#10B981', '#F97316', '#8B5CF6'];

// Mock: 대기 중 초대
const PENDING_INVITES = [
  { id: 'invite-001', email: 'friend@kakao.com', createdAt: '2026-07-08' },
];

export default function MembersPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  // Stores
  const allMembers = useMemberStore((s) => s.members);
  const addMember = useMemberStore((s) => s.addMember);
  const removeMember = useMemberStore((s) => s.removeMember);
  const updateMember = useMemberStore((s) => s.updateMember);
  const members = selectMembersByTrip(allMembers, tripId);

  // UI 상태
  const [showAddVirtual, setShowAddVirtual] = useState(false);
  const [virtualName, setVirtualName] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<'link' | 'code'>('link');

  // 통계
  const totalMembers = members.length;
  const registeredMembers = members.filter((m) => m.userId !== null).length;
  const pendingInvites = PENDING_INVITES.length;

  // 초대 코드 (mock)
  const inviteCode = '7K9 2F4';
  const inviteLink = `costtrip.app/join/${inviteCode.replace(/\s/g, '')}`;

  // 헤더 우측 액션: 그룹·멤버 페이지 전용 "멤버 초대" 버튼
  useHeaderAction(
    <HeaderActionButton onClick={() => setInviteOpen(true)}>
      <Plus size={16} />
      멤버 초대
    </HeaderActionButton>,
  );

  function handleCopyCode() {
    navigator.clipboard.writeText(inviteCode.replace(/\s/g, ''));
    alert('초대 코드가 복사되었습니다');
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(inviteLink);
    alert('초대 링크가 복사되었습니다');
  }

  function handleRoleChange(memberId: string, newRole: 'editor' | 'viewer') {
    updateMember(memberId, { role: newRole });
  }

  function handleRemoveMember(memberId: string) {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    if (member.role === 'owner') return;
    if (confirm(`${member.displayName}님을 여행에서 제거할까요?`)) {
      removeMember(memberId);
    }
  }

  function handleAddVirtualMember() {
    if (!virtualName.trim()) return;
    const newMember: Member = {
      id: `member-virtual-${crypto.randomUUID()}`,
      tripId,
      userId: null,
      displayName: virtualName.trim(),
      role: 'viewer',
      inviteStatus: 'accepted',
    };
    addMember(newMember);
    setVirtualName('');
    setShowAddVirtual(false);
  }

  // 빈 상태
  if (members.length <= 1 && pendingInvites === 0) {
    return (
      <div className="space-y-5">
        <Card className="bg-brand-tint border-none">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">👥</span>
            <div>
              <h3 className="text-sm font-bold text-ink">
                동행 멤버를 초대해 보세요
              </h3>
              <p className="text-xs text-ink-3 mt-0.5">
                아래 코드를 공유하거나 초대 링크를 복사하세요.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl font-extrabold tracking-[6px] text-brand-dark">
              {inviteCode}
            </span>
            <Badge variant="brand">유효 7일</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              fullWidth
              size="sm"
              onClick={handleCopyCode}
            >
              📋 코드 복사
            </Button>
            <Button fullWidth size="sm" onClick={handleCopyLink}>
              🔗 링크 복사
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 상단 지표 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">전체 멤버</p>
          <p className="mt-1.5 text-2xl font-bold text-ink">{totalMembers}명</p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">정식 가입</p>
          <p className="mt-1.5 text-2xl font-bold text-ok-text">
            {registeredMembers}명
          </p>
        </div>
        <div className="rounded-md border border-surface-line bg-surface-card p-5">
          <p className="text-xs text-ink-3 font-medium">대기 중 초대</p>
          <p className="mt-1.5 text-2xl font-bold text-warn-text">
            {pendingInvites}건
          </p>
        </div>
      </div>

      {/* 메인 그리드: 좌(멤버 테이블) + 우(초대/권한) */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start">
        {/* 좌: 멤버 목록 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink">멤버 목록</h3>
            <span className="text-xs text-ink-3">
              권한은 owner만 변경할 수 있어요
            </span>
          </div>

          {/* 테이블 헤더 */}
          <div className="grid grid-cols-[1fr_80px_120px_100px] gap-2 border-b border-surface-line pb-2 mb-3">
            <span className="text-[11px] font-semibold text-ink-3">멤버</span>
            <span className="text-[11px] font-semibold text-ink-3">상태</span>
            <span className="text-[11px] font-semibold text-ink-3">권한</span>
            <span className="text-[11px] font-semibold text-ink-3 text-right">
              액션
            </span>
          </div>

          {/* 멤버 행 */}
          <div className="space-y-3">
            {members.map((m, i) => {
              const isOwner = m.role === 'owner';
              const isVirtual = m.userId === null;
              const isSelf = i === 0;

              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_80px_120px_100px] gap-2 items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                      style={{
                        backgroundColor:
                          MEMBER_COLORS[i % MEMBER_COLORS.length],
                      }}
                    >
                      {m.displayName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-ink truncate">
                          {m.displayName}
                        </span>
                        {isSelf && (
                          <span className="rounded-pill bg-surface-bg-alt px-2 py-0.5 text-[10px] font-medium text-ink-2">
                            나
                          </span>
                        )}
                        {isVirtual && <Badge variant="warn">가상</Badge>}
                      </div>
                      <p className="text-[11px] text-ink-3 mt-0.5">
                        {isVirtual
                          ? '미가입 · 정산 대상'
                          : isSelf
                            ? '정식 멤버 · 본인'
                            : '정식 멤버'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isVirtual ? (
                      <Badge variant="warn">가상 멤버</Badge>
                    ) : (
                      <span className="inline-flex items-center rounded-pill bg-ok-soft px-2.5 py-0.5 text-[11px] font-semibold text-ok-text">
                        가입됨
                      </span>
                    )}
                  </div>

                  <div>
                    {isOwner || isSelf ? (
                      <Badge variant={isOwner ? 'brand' : 'default'}>
                        {m.role}
                      </Badge>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          handleRoleChange(
                            m.id,
                            e.target.value as 'editor' | 'viewer',
                          )
                        }
                        className="h-8 rounded-sm border border-surface-line bg-surface-card px-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value="editor">editor</option>
                        <option value="viewer">viewer</option>
                      </select>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isOwner || isSelf}
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      제거
                    </Button>
                    <button
                      disabled={isOwner || isSelf}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-sm text-sm transition-colors',
                        isOwner || isSelf
                          ? 'text-ink-3 opacity-35 cursor-not-allowed'
                          : 'text-ink-2 hover:bg-surface-bg-alt',
                      )}
                    >
                      ⋯
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 대기 중 초대 */}
          {PENDING_INVITES.length > 0 && (
            <>
              <div className="my-4 border-t border-surface-line" />
              <h4 className="text-sm font-bold text-ink mb-3">대기 중 초대</h4>
              {PENDING_INVITES.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 py-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-bg-alt text-sm">
                    ✉️
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {invite.email}
                    </p>
                    <p className="text-[11px] text-ink-3">
                      초대 발송됨 · 응답 대기
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      재발송
                    </Button>
                    <Button variant="ghost" size="sm">
                      취소
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* 가상 멤버 추가 */}
          <div className="mt-4 pt-3 border-t border-surface-line">
            {showAddVirtual ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="가상 멤버 이름"
                  value={virtualName}
                  onChange={(e) => setVirtualName(e.target.value)}
                  className="h-9 flex-1 rounded-sm border border-surface-line bg-surface-card px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handleAddVirtualMember()
                  }
                />
                <Button size="sm" onClick={handleAddVirtualMember}>
                  추가
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddVirtual(false)}
                >
                  취소
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddVirtual(true)}
                className="w-full h-9 rounded-sm border border-dashed border-surface-line-strong text-sm font-medium text-ink-2 hover:border-brand hover:text-brand transition-colors"
              >
                + 가상 멤버 추가
              </button>
            )}
          </div>
        </Card>

        {/* 우: 초대 코드 + 권한 안내 */}
        <div className="space-y-5 lg:sticky lg:top-20">
          <Card className="bg-brand-tint border-none">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-ink">초대 코드</h3>
              <Badge variant="brand">7일</Badge>
            </div>
            <div className="py-4 text-center">
              <span className="text-[34px] font-extrabold tracking-[8px] text-brand-dark">
                {inviteCode}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                fullWidth
                size="sm"
                onClick={handleCopyCode}
              >
                📋 코드 복사
              </Button>
              <Button fullWidth size="sm" onClick={handleCopyLink}>
                🔗 링크 복사
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-ink-3">{inviteLink}</p>
          </Card>

          <Card>
            <h3 className="text-sm font-bold text-ink mb-3">권한 안내</h3>
            <div className="space-y-2.5 text-xs text-ink-2 leading-relaxed">
              <div className="flex items-center gap-2">
                <Badge variant="brand">owner</Badge>
                <span>모든 권한 · 멤버·예산 관리</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">editor</Badge>
                <span>지출 추가·수정·정산 참여</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">viewer</Badge>
                <span>조회·정산 대상만 (편집 불가)</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-surface-line">
              <p className="text-xs text-ink-3 leading-relaxed">
                가상 멤버는 앱 미설치 동행을 위한 정산 전용 계정이에요. 가입 시
                정식 멤버로 확인 후 병합돼요.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* 멤버 초대 슬라이드 패널 */}
      <SlidePanel
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="멤버 초대"
        width="w-[440px]"
      >
        <div className="space-y-5">
          {/* 초대 방법 탭 (segment toggle) */}
          <div>
            <p className="text-xs font-medium text-ink-3 mb-2">초대 방법</p>
            <div className="flex w-full items-center gap-0.5 rounded-pill bg-surface-bg-alt p-1">
              <button
                onClick={() => setInviteTab('link')}
                className={cn(
                  'flex-1 rounded-pill py-2 text-[13px] font-bold tracking-tight transition-all',
                  inviteTab === 'link'
                    ? 'bg-surface-card text-brand shadow-sm'
                    : 'text-ink-2',
                )}
              >
                링크
              </button>
              <button
                onClick={() => setInviteTab('code')}
                className={cn(
                  'flex-1 rounded-pill py-2 text-[13px] font-bold tracking-tight transition-all',
                  inviteTab === 'code'
                    ? 'bg-surface-card text-brand shadow-sm'
                    : 'text-ink-2',
                )}
              >
                코드
              </button>
              <button
                disabled
                className="flex-1 rounded-pill py-2 text-[13px] font-bold tracking-tight text-ink-2 opacity-45 cursor-not-allowed"
              >
                이메일
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-ink-3">
              이메일·QR 초대는{' '}
              <span className="rounded-pill border border-dashed border-surface-line-strong px-2 py-0.5 text-[10px]">
                예정
              </span>
            </p>
          </div>

          {/* 초대 링크 */}
          <div>
            <p className="text-xs font-medium text-ink-3 mb-2">초대 링크</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink}
                className="h-10 flex-1 min-w-0 rounded-sm border border-surface-line bg-surface-card px-3 text-sm text-ink"
              />
              <button
                onClick={handleCopyLink}
                className="h-10 shrink-0 rounded-sm border border-surface-line bg-surface-card px-4 text-sm font-medium text-ink hover:bg-surface-bg-alt transition-colors"
              >
                복사
              </button>
            </div>
          </div>

          {/* 초대 코드 카드 (연한 블루톤) */}
          <div className="rounded-sm border border-brand-soft bg-brand-tint p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ink-2">초대 코드</span>
              <span className="rounded-pill border border-brand bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                7일 후 만료
              </span>
            </div>
            <div className="py-3 text-center">
              <span className="text-[28px] font-extrabold tracking-[6px] text-brand-dark">
                {inviteCode}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-3">
                받은 사람이 앱에서 입력해 합류해요
              </span>
              <button
                onClick={handleCopyCode}
                className="rounded-sm border border-surface-line bg-surface-card px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-bg-alt transition-colors"
              >
                재발급
              </button>
            </div>
          </div>

          {/* 기본 권한 */}
          <div>
            <p className="text-xs font-medium text-ink-3 mb-2">기본 권한</p>
            <select className="h-10 w-full rounded-sm border border-surface-line bg-surface-card px-3 pr-8 text-sm text-ink appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23929AAC%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat focus:outline-none focus:ring-2 focus:ring-brand">
              <option>editor (지출 편집 가능)</option>
              <option>viewer (조회만)</option>
            </select>
          </div>

          <p className="text-[11px] text-ink-3 leading-relaxed">
            재발급 시 이전 링크·코드는 무효화되고, 코드 입력에는 시도 제한이
            적용돼요.
          </p>

          {/* CTA */}
          <Button fullWidth size="lg" onClick={handleCopyLink}>
            링크 공유
          </Button>
          <Button
            variant="secondary"
            fullWidth
            size="sm"
            onClick={() => setInviteOpen(false)}
          >
            취소
          </Button>
        </div>
      </SlidePanel>
    </div>
  );
}
