'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { useCreateTrip } from '@/hooks/use-trips';
import { useMe } from '@/hooks/use-auth-user';
import { useMyProfile } from '@/hooks/use-my-profile';
import { useAppStore } from '@/stores/app-store';
import { toast } from '@/stores/toast-store';
import { inviteByEmail } from '@/lib/api/members';
import { lookupUser } from '@/lib/api/auth';
import {
  useAreaBasedPlaces,
  useSearchPlaces,
  GWANGJU_AREA_CODE,
} from '@/hooks/use-places';
import { formatKRW } from '@/lib/utils';
import { Search, ChevronDown, MapPin, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
  /** 실제 가입한 사용자인지 (이메일 조회 결과). owner(나)는 항상 true */
  registered?: boolean;
  /** 가입자면 서버의 아바타 색 */
  avatarColor?: string | null;
}

const MEMBER_COLORS = ['bg-brand', 'bg-ok', 'bg-warn', 'bg-member-purple'];

export function TripCreateModal({ open, onClose }: TripCreateModalProps) {
  const router = useRouter();
  const createTrip = useCreateTrip();
  const { data: me } = useMe();
  const { avatarColor: myColor } = useMyProfile();
  const { setTripInfo, setTripDates } = useAppStore();

  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    headcount: 1,
    totalBudget: 0,
  });

  const [members, setMembers] = useState<MemberItem[]>([
    {
      id: 'me',
      name: '나',
      email: 'owner',
      role: 'owner',
      color: MEMBER_COLORS[0],
    },
  ]);

  // 로그인 사용자 이름을 소유자 멤버 표시에 반영
  const ownerName = me?.displayName ? `${me.displayName} (나)` : '나';

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteChecking, setInviteChecking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 수동으로 더 잡는 인원(아직 계정 없는 동행 등). 초대 멤버 수에 더해진다.
  // 총 인원 = 멤버 수 + extraHeadcount. 멤버를 추가/제거해도 이 값은 유지된다.
  const [extraHeadcount, setExtraHeadcount] = useState(0);
  const totalHeadcount = members.length + extraHeadcount;

  /** 인원 입력을 직접 바꿀 때: 멤버 수 미만이면 0으로, 그 이상은 초과분을 extra로. */
  function handleHeadcountChange(value: number) {
    const next = Number.isNaN(value) ? members.length : value;
    setExtraHeadcount(Math.max(0, next - members.length));
  }

  // 목적지 검색어(입력) + 디바운스된 검색어(질의)
  const [placeQuery, setPlaceQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(placeQuery), 250);
    return () => clearTimeout(t);
  }, [placeQuery]);

  // 광주 대표 관광지(기본 추천) + 키워드 검색 결과
  const { data: gwangjuPlaces } = useAreaBasedPlaces(GWANGJU_AREA_CODE, {
    contentTypeId: '12', // 관광지
    numRows: 12,
  });
  const { data: searchResults, isFetching: isSearching } =
    useSearchPlaces(debouncedQuery);

  const isSearchMode = debouncedQuery.trim().length >= 2;
  // 검색 모드면 검색 결과, 아니면 광주 대표 추천(최대 8개)
  const suggestions = useMemo(() => {
    const list = isSearchMode ? (searchResults ?? []) : (gwangjuPlaces ?? []);
    // 이름 중복 제거 후 상위 8개
    const seen = new Set<string>();
    const unique = list.filter((p) => {
      if (!p.name || seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
    return unique.slice(0, 8);
  }, [isSearchMode, searchResults, gwangjuPlaces]);

  /**
   * 목적지 입력창에서 엔터 처리.
   * 엔터로 폼이 통째로 submit(=여행 생성)되는 것을 막고, "검색"만 한다.
   * - 디바운스를 기다리지 않고 현재 입력값으로 즉시 검색을 질의한다.
   * - 자동 선택은 하지 않는다(엔터 시점엔 결과가 아직 없어 오선택되던 문제 방지).
   *   결과는 아래 칩에서 사용자가 직접 고른다.
   */
  function handleDestinationKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault(); // 폼 submit 차단(엔터로 바로 생성되는 문제 방지)
    // 입력값으로 즉시 검색 질의(디바운스 건너뜀)
    setDebouncedQuery(form.destination.trim());
  }

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

  async function handleInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    // 형식 검사
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('올바른 이메일 형식이 아니에요');
      return;
    }
    // 중복(이미 추가했거나 나 자신) 검사
    if (members.some((m) => m.email.toLowerCase() === email)) {
      toast.info('이미 추가된 멤버예요');
      return;
    }
    if (me?.email && me.email.toLowerCase() === email) {
      toast.info('본인은 이미 소유자로 포함돼 있어요');
      return;
    }

    // 실제 가입한 사용자인지 백엔드로 확인
    setInviteChecking(true);
    try {
      const result = await lookupUser(email);
      if (!result.exists) {
        toast.error(
          '가입하지 않은 이메일이에요. 멤버 화면에서 링크·코드로 초대해 주세요.',
        );
        return;
      }
      const newMember: MemberItem = {
        id: `member-${Date.now()}`,
        // 실제 가입자의 표시 이름을 사용 (없으면 이메일 앞부분)
        name: result.displayName || email.split('@')[0],
        email,
        role: 'editor',
        color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
        registered: true,
        avatarColor: result.avatarColor ?? null,
      };
      setMembers((prev) => [...prev, newMember]);
      setInviteEmail('');
      toast.success(`${newMember.name}님을 초대 목록에 추가했어요`);
    } catch {
      toast.error('이메일 확인에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setInviteChecking(false);
    }
  }

  function handleRoleChange(memberId: string, role: 'editor' | 'viewer') {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
    );
  }

  /** 초대 목록에서 멤버 제거(소유자는 제거 불가). */
  function handleRemoveMember(memberId: string) {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
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
        headcount: totalHeadcount,
        totalBudget: form.totalBudget,
        currencyCode: 'KRW',
        tripTimeZone: 'Asia/Seoul',
        status: 'planning',
      },
      {
        onSuccess: async (trip) => {
          // Store에 여행 정보 동기화
          setTripInfo({
            title: form.title || form.destination,
            destination: form.destination,
            headcount: totalHeadcount,
          });
          setTripDates(form.startDate, form.endDate);

          // 소유자(me)를 제외한, 이메일로 추가된 멤버들에게 초대 발송
          const invitees = members.filter(
            (m) => m.role !== 'owner' && m.email.includes('@'),
          );
          if (invitees.length > 0) {
            const results = await Promise.allSettled(
              invitees.map((m) =>
                inviteByEmail(trip.id, {
                  email: m.email,
                  role: m.role === 'viewer' ? 'viewer' : 'editor',
                }),
              ),
            );
            const invited = results.filter(
              (r) => r.status === 'fulfilled' && r.value.status === 'invited',
            ).length;
            const notReg = results.filter(
              (r) =>
                r.status === 'fulfilled' && r.value.status === 'not_registered',
            ).length;
            if (invited > 0) toast.success(`${invited}명에게 초대를 보냈어요`);
            if (notReg > 0)
              toast.info(
                `미가입자 ${notReg}명은 멤버 화면에서 링크·코드로 초대해 주세요`,
              );
          }

          onClose();
          toast.success('여행이 생성되었어요');
          router.push(`/trip/${trip.id}`);
        },
        onError: () => toast.error('여행 생성에 실패했어요'),
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
    `${totalHeadcount}명`,
    form.totalBudget ? formatKRW(form.totalBudget) : '',
  ].filter(Boolean);

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-lg"
      dismissible={false}
    >
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
            {/* 여행 이름 */}
            <Input
              label="여행 이름"
              placeholder="광주 우정여행"
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
                  placeholder="관광지·도시 검색 (예: 무등산)"
                  value={form.destination}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({ ...f, destination: v }));
                    setPlaceQuery(v);
                    setErrors((prev) => ({ ...prev, destination: '' }));
                  }}
                  onKeyDown={handleDestinationKeyDown}
                  className="h-10 w-full rounded-xs border border-surface-line bg-surface-card pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              {errors.destination && (
                <p className="mt-1 text-xs text-danger-text">
                  {errors.destination}
                </p>
              )}

              {/* 추천/검색 칩 (한국관광공사 TourAPI) */}
              <div className="mt-2">
                <p className="mb-1.5 text-xs text-ink-3">
                  {isSearchMode
                    ? isSearching
                      ? '검색 중…'
                      : suggestions.length > 0
                        ? '검색 결과'
                        : '검색 결과가 없어요'
                    : '광주 추천 관광지'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((place) => (
                    <button
                      key={place.externalId || place.name}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, destination: place.name }));
                        setPlaceQuery('');
                        setDebouncedQuery('');
                        setErrors((prev) => ({ ...prev, destination: '' }));
                      }}
                      className={`flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition-colors ${
                        form.destination === place.name
                          ? 'border-brand bg-brand-soft text-brand-dark font-medium'
                          : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt'
                      }`}
                      title={place.address ?? undefined}
                    >
                      <MapPin size={13} className="shrink-0" />
                      {place.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 시작일 / 종료일 / 인원 */}
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="시작일"
                type="date"
                value={form.startDate}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    startDate: e.target.value,
                    endDate:
                      f.endDate && e.target.value > f.endDate ? '' : f.endDate,
                  }));
                  setErrors((prev) => ({ ...prev, startDate: '' }));
                }}
                error={errors.startDate}
              />
              <Input
                label="종료일"
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) => {
                  setForm((f) => ({ ...f, endDate: e.target.value }));
                  setErrors((prev) => ({ ...prev, endDate: '' }));
                }}
                error={errors.endDate}
              />
              <Input
                label="인원"
                type="number"
                min={members.length}
                value={totalHeadcount.toString()}
                onChange={(e) =>
                  handleHeadcountChange(parseInt(e.target.value, 10))
                }
                hint="멤버 초대 시 자동 반영 · 직접 조절 가능"
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
                    <Avatar
                      name={member.id === 'me' ? ownerName : member.name}
                      colorSeed={member.email || member.id}
                      color={
                        member.id === 'me'
                          ? myColor
                          : (member.avatarColor ?? undefined)
                      }
                      size={36}
                    />
                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {member.id === 'me' ? ownerName : member.name}
                      </p>
                      <p className="text-xs text-ink-3 truncate">
                        {member.email}
                      </p>
                    </div>
                    {/* 역할 */}
                    {member.role === 'owner' ? (
                      <span className="shrink-0 rounded-xs border border-surface-line px-2 py-1 text-xs text-ink-3">
                        owner
                      </span>
                    ) : (
                      <>
                        <Select
                          aria-label="멤버 역할"
                          value={member.role}
                          onChange={(v) =>
                            handleRoleChange(
                              member.id,
                              v as 'editor' | 'viewer',
                            )
                          }
                          className="w-24 shrink-0"
                          triggerClassName="h-7 px-2 text-xs"
                          options={[
                            { value: 'editor', label: 'editor' },
                            { value: 'viewer', label: 'viewer' },
                          ]}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-surface-line text-ink-3 transition-colors hover:border-danger hover:text-danger"
                          aria-label={`${member.name} 초대 목록에서 제거`}
                          title="초대 목록에서 제거"
                        >
                          <X size={13} />
                        </button>
                      </>
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
                    disabled={inviteChecking}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleInvite();
                      }
                    }}
                    className="h-10 flex-1 rounded-xs border border-surface-line bg-surface-card px-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleInvite}
                    disabled={inviteChecking || !inviteEmail.trim()}
                  >
                    {inviteChecking ? '확인 중...' : '초대'}
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-3">
                  가입한 사용자만 추가돼요. 미가입자는 여행 생성 후 멤버
                  화면에서 링크·코드로 초대해 주세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 푸터 (고정) */}
        <div className="shrink-0 flex items-center justify-between border-t border-surface-line px-6 py-4">
          <p className="text-sm text-ink-3">{summaryParts.join(' · ')}</p>
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
