'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { cn } from '@/lib/utils';
import {
  useMembers,
  useAddVirtualMember,
  useUpdateMemberRole,
  useRemoveMember,
  useCreateInvite,
  useInviteByEmail,
} from '@/hooks/use-members';
import { toast } from '@/stores/toast-store';
import { ApiError } from '@/lib/api/client';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { useMyProfile } from '@/hooks/use-my-profile';
import {
  Plus,
  Copy,
  Link2,
  MoreHorizontal,
  Info,
  UserMinus,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Invite } from '@/types';

export default function MembersPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  // 서버 데이터
  const { data: members = [], isLoading } = useMembers(tripId);
  const { userId: myUserId, avatarColor: myColor } = useMyProfile();
  // 현재 로그인 사용자가 이 여행의 소유자인지 (내보내기는 소유자만 가능)
  const iAmOwner = !!myUserId
    ? members.some((m) => m.userId === myUserId && m.role === 'owner')
    : false;
  const addVirtual = useAddVirtualMember(tripId);
  const updateRole = useUpdateMemberRole(tripId);
  const removeMemberMut = useRemoveMember(tripId);
  const createInviteMut = useCreateInvite(tripId);

  // UI 상태
  const [showAddVirtual, setShowAddVirtual] = useState(false);
  const [virtualName, setVirtualName] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<'link' | 'code' | 'email'>('link');
  const [invite, setInvite] = useState<Invite | null>(null);
  // 이메일 초대 폼
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  // 초대 링크 기본 권한(표시용). 서버 연동 전까지 로컬 상태로 유지.
  const [linkDefaultRole, setLinkDefaultRole] = useState('editor');
  const inviteByEmailMut = useInviteByEmail(tripId);

  // 멤버 행 액션 드롭다운 / 정보 보기 / 내보내기 확인 모달
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [infoMemberId, setInfoMemberId] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (!openMenuId) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openMenuId]);

  // 통계
  const totalMembers = members.length;
  const registeredMembers = members.filter((m) => m.userId !== null).length;
  const pendingInvites = members.filter(
    (m) => m.inviteStatus === 'invited',
  ).length;

  // 초대 코드/링크 (서버 생성 결과. 아직 없으면 안내)
  const inviteCode = invite?.inviteCode ?? '- - -';
  const inviteLink = invite?.inviteLink ?? '';

  // 초대 패널 열 때 코드가 없으면 생성 (소유자만 생성 가능)
  function openInvite() {
    setInviteOpen(true);
    if (!invite && iAmOwner) {
      createInviteMut.mutate(
        { defaultRole: 'editor' },
        {
          onSuccess: (data) => setInvite(data),
          onError: () => toast.error('초대 코드 생성에 실패했어요'),
        },
      );
    }
  }

  // 헤더 우측 액션: 그룹·멤버 페이지 전용 "멤버 초대" 버튼.
  // 초대(코드/링크/이메일)는 소유자만 가능하므로 소유자에게만 노출한다.
  useHeaderAction(
    iAmOwner ? (
      <HeaderActionButton onClick={openInvite}>
        <Plus size={16} />
        멤버 초대
      </HeaderActionButton>
    ) : null,
    [iAmOwner],
  );

  function handleCopyCode() {
    if (!invite) return;
    navigator.clipboard.writeText(invite.inviteCode.replace(/\s/g, ''));
    toast.success('초대 코드가 복사되었습니다');
  }

  function handleCopyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success('초대 링크가 복사되었습니다');
  }

  function handleEmailInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error('이메일을 입력해 주세요');
      return;
    }
    inviteByEmailMut.mutate(
      { email, role: inviteRole },
      {
        onSuccess: (res) => {
          if (res.status === 'invited') {
            toast.success(res.message);
            setInviteEmail('');
          } else if (res.status === 'already_member') {
            toast.info(res.message);
          } else {
            // not_registered → 링크/코드 공유 안내
            toast.info(res.message);
            setInviteTab('link');
          }
        },
        onError: () => toast.error('초대에 실패했습니다'),
      },
    );
  }

  function handleRoleChange(memberId: string, newRole: 'editor' | 'viewer') {
    updateRole.mutate({ memberId, role: newRole });
  }

  // 내보내기 클릭 → 확인 모달 열기 (실제 삭제는 confirmRemoveMember)
  function handleRemoveMember(memberId: string) {
    const member = members.find((m) => m.id === memberId);
    if (!member || member.role === 'owner') return;
    setRemoveMemberId(memberId);
  }

  function confirmRemoveMember() {
    if (!removeMemberId) return;
    const target = members.find((m) => m.id === removeMemberId);
    removeMemberMut.mutate(removeMemberId, {
      onSuccess: () => {
        toast.success(
          target ? `${target.displayName}님을 내보냈어요` : '멤버를 내보냈어요',
        );
        setRemoveMemberId(null);
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && typeof err.detail === 'string'
            ? err.detail
            : '멤버를 내보내지 못했어요';
        toast.error(msg);
        setRemoveMemberId(null);
      },
    });
  }

  function handleAddVirtualMember() {
    if (!virtualName.trim()) return;
    addVirtual.mutate(
      { displayName: virtualName.trim(), role: 'viewer' },
      {
        onSuccess: () => {
          setVirtualName('');
          setShowAddVirtual(false);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-ink-3">
        멤버 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 상단 지표 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="min-w-0 rounded-md border border-surface-line bg-surface-card p-4 sm:p-5">
          <p className="text-xs text-ink-3 font-medium">전체 멤버</p>
          <p className="mt-1.5 truncate text-lg font-bold text-ink tabular-nums sm:text-2xl">
            {totalMembers}명
          </p>
        </div>
        <div className="min-w-0 rounded-md border border-surface-line bg-surface-card p-4 sm:p-5">
          <p className="text-xs text-ink-3 font-medium">정식 가입</p>
          <p className="mt-1.5 truncate text-lg font-bold text-ok-text tabular-nums sm:text-2xl">
            {registeredMembers}명
          </p>
        </div>
        <div className="min-w-0 rounded-md border border-surface-line bg-surface-card p-4 sm:p-5">
          <p className="text-xs text-ink-3 font-medium">대기 중 초대</p>
          <p className="mt-1.5 truncate text-lg font-bold text-warn-text tabular-nums sm:text-2xl">
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
            {members.map((m) => {
              const isOwner = m.role === 'owner';
              const isVirtual = m.userId === null;
              // 실제 로그인 사용자 본인인지 (목록 순서가 아니라 userId로 판정)
              const isSelf = !!myUserId && m.userId === myUserId;

              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_80px_120px_100px] gap-2 items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={m.displayName}
                      colorSeed={m.id}
                      color={
                        m.avatarColor ??
                        (myUserId && m.userId === myUserId
                          ? myColor
                          : undefined)
                      }
                      size={36}
                    />
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
                      <Select
                        aria-label="멤버 역할"
                        value={m.role}
                        onChange={(v) =>
                          handleRoleChange(m.id, v as 'editor' | 'viewer')
                        }
                        className="w-28"
                        triggerClassName="h-8 px-2 text-xs"
                        options={[
                          { value: 'editor', label: 'editor' },
                          { value: 'viewer', label: 'viewer' },
                        ]}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-end">
                    <div
                      className="relative"
                      ref={openMenuId === m.id ? menuRef : undefined}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((cur) => (cur === m.id ? null : m.id))
                        }
                        aria-label="멤버 액션"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === m.id}
                        className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-2 transition-colors hover:bg-surface-bg-alt"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {openMenuId === m.id && (
                        <div
                          role="menu"
                          className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-sm border border-surface-line bg-surface-card py-1 shadow-md"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setInfoMemberId(m.id);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-surface-bg-alt"
                          >
                            <Info size={15} />
                            멤버 정보 보기
                          </button>
                          {iAmOwner && !(isOwner || isSelf) && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleRemoveMember(m.id);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-text transition-colors hover:bg-danger-soft"
                            >
                              <UserMinus size={15} />
                              내보내기
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 대기 중 초대 */}

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
            {invite ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    fullWidth
                    size="sm"
                    onClick={handleCopyCode}
                  >
                    <Copy size={15} />
                    코드 복사
                  </Button>
                  <Button fullWidth size="sm" onClick={handleCopyLink}>
                    <Link2 size={15} />
                    링크 복사
                  </Button>
                </div>
                <p className="mt-3 text-center text-xs text-ink-3">
                  {inviteLink}
                </p>
              </>
            ) : iAmOwner ? (
              <Button
                fullWidth
                size="sm"
                disabled={createInviteMut.isPending}
                onClick={() =>
                  createInviteMut.mutate(
                    { defaultRole: 'editor' },
                    {
                      onSuccess: (data) => setInvite(data),
                      onError: () => toast.error('초대 코드 생성에 실패했어요'),
                    },
                  )
                }
              >
                {createInviteMut.isPending ? '생성 중...' : '초대 코드 생성'}
              </Button>
            ) : (
              <p className="text-center text-xs text-ink-3">
                초대 코드는 여행 소유자만 생성할 수 있어요.
              </p>
            )}
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
              {(['link', 'code', 'email'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setInviteTab(tab)}
                  className={cn(
                    'flex-1 rounded-pill py-2 text-[13px] font-bold tracking-tight transition-all',
                    inviteTab === tab
                      ? 'bg-surface-card text-brand shadow-sm'
                      : 'text-ink-2',
                  )}
                >
                  {tab === 'link' ? '링크' : tab === 'code' ? '코드' : '이메일'}
                </button>
              ))}
            </div>
          </div>

          {/* 초대 링크 */}
          {inviteTab === 'link' && (
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
          )}

          {/* 이메일 초대 폼 */}
          {inviteTab === 'email' && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-ink-3 mb-2">
                  초대할 이메일
                </p>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEmailInvite();
                  }}
                  placeholder="member@example.com"
                  className="h-10 w-full rounded-sm border border-surface-line bg-surface-card px-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <p className="mt-1.5 text-[11px] text-ink-3">
                  이미 가입한 사용자면 앱 내 알림으로 초대가 전달돼요.
                  미가입자는 링크·코드를 공유해 주세요.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-3 mb-2">기본 권한</p>
                <Select
                  aria-label="기본 권한"
                  value={inviteRole}
                  onChange={(v) => setInviteRole(v as 'editor' | 'viewer')}
                  options={[
                    { value: 'editor', label: 'editor (지출 편집 가능)' },
                    { value: 'viewer', label: 'viewer (조회만)' },
                  ]}
                />
              </div>
              <Button
                fullWidth
                size="lg"
                onClick={handleEmailInvite}
                disabled={inviteByEmailMut.isPending}
              >
                {inviteByEmailMut.isPending ? '초대 중...' : '초대 보내기'}
              </Button>
            </div>
          )}

          {/* 초대 코드 카드 (연한 블루톤) */}
          {inviteTab === 'code' && (
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
          )}

          {/* 링크/코드 공용: 기본 권한 + 안내 + CTA */}
          {inviteTab !== 'email' && (
            <>
              <div>
                <p className="text-xs font-medium text-ink-3 mb-2">기본 권한</p>
                <Select
                  aria-label="기본 권한"
                  value={linkDefaultRole}
                  onChange={setLinkDefaultRole}
                  options={[
                    { value: 'editor', label: 'editor (지출 편집 가능)' },
                    { value: 'viewer', label: 'viewer (조회만)' },
                  ]}
                />
              </div>

              <p className="text-[11px] text-ink-3 leading-relaxed">
                재발급 시 이전 링크·코드는 무효화되고, 코드 입력에는 시도 제한이
                적용돼요.
              </p>

              {/* CTA */}
              <Button fullWidth size="lg" onClick={handleCopyLink}>
                링크 공유
              </Button>
            </>
          )}
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

      {/* 멤버 정보 보기 모달 */}
      {(() => {
        const info = infoMemberId
          ? members.find((m) => m.id === infoMemberId)
          : null;
        if (!info) return null;
        const isVirtual = info.userId === null;
        return (
          <Modal open={!!info} onClose={() => setInfoMemberId(null)}>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <Avatar
                  name={info.displayName}
                  colorSeed={info.id}
                  color={info.avatarColor ?? undefined}
                  size={56}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-ink truncate">
                      {info.displayName}
                    </p>
                    {isVirtual && <Badge variant="warn">가상</Badge>}
                  </div>
                  <p className="text-sm text-ink-3">
                    {isVirtual ? '미가입 · 정산 대상' : '정식 멤버'}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-surface-line pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">권한</span>
                  <Badge variant={info.role === 'owner' ? 'brand' : 'default'}>
                    {info.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">상태</span>
                  <span className="font-medium text-ink">
                    {isVirtual ? '가상 멤버' : '가입됨'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-3">합류일</span>
                  <span className="font-medium text-ink">
                    {info.joinedAt
                      ? new Date(info.joinedAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setInfoMemberId(null)}>확인</Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* 멤버 내보내기 확인 모달 (앱 공통 확인 모달 UI 재사용) */}
      {(() => {
        const target = removeMemberId
          ? members.find((m) => m.id === removeMemberId)
          : null;
        if (!target) return null;
        return (
          <Modal
            open={!!target}
            onClose={() =>
              !removeMemberMut.isPending && setRemoveMemberId(null)
            }
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-ink">멤버를 내보낼까요?</h3>
              <p className="mt-2 text-sm text-ink-2 leading-relaxed">
                <b className="text-ink">{target.displayName}</b>님을 이 여행에서
                내보냅니다. 지출·정산 이력은 보존되지만, 더 이상 이 여행에
                접근할 수 없어요.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setRemoveMemberId(null)}
                  disabled={removeMemberMut.isPending}
                >
                  취소
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmRemoveMember}
                  disabled={removeMemberMut.isPending}
                >
                  {removeMemberMut.isPending ? '내보내는 중...' : '내보내기'}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
