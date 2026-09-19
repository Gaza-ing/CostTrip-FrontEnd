'use client';

import { X, Plus, CircleDollarSign, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { CATEGORIES } from '@/lib/constants';
import { CategoryIcon } from '@/lib/category-icons';
import { formatKRW, cn } from '@/lib/utils';
import { useMembers } from '@/hooks/use-members';
import { useCreateExpense } from '@/hooks/use-expenses';
import { useTrip } from '@/hooks/use-trips';
import { useDays } from '@/hooks/use-plan';
import { toast } from '@/stores/toast-store';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

/** ISO date(YYYY-MM-DD) → "MM.DD" 표기. */
function formatDayLabel(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  return `${parts[1]}.${parts[2]}`;
}

/** 오늘 로컬 날짜 "YYYY-MM-DD". */
function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 현재 로컬 시각 "HH:mm". */
function nowLocalTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/** 로컬 날짜+시각 문자열을 ISO(UTC)로 결합. 잘못된 값이면 null. */
function toIsoDateTime(date: string, time: string): string | null {
  if (!date) return null;
  const [h, m] = (time || '00:00').split(':').map(Number);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString();
}

export default function ExpenseAddPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const { data: members = [] } = useMembers(tripId);
  const { data: trip } = useTrip(tripId);
  const { data: days = [] } = useDays(tripId, trip?.startDate);
  const createExpenseMut = useCreateExpense(tripId);

  const effectiveMembers = members;
  const isGroupTrip = effectiveMembers.length > 1;

  // 폼 상태
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  // 지출이 발생한 날짜(Day). ''=미지정. 일자별 지출 추이는 이 값으로 집계된다.
  const [dayId, setDayId] = useState('');
  // 실제 지출 시각(spent_at). 날짜+시각을 따로 받아 저장 시 ISO로 합친다.
  // 기본값: 오늘 날짜 + 현재 시각.
  const [spentDate, setSpentDate] = useState(() => todayLocalDate());
  const [spentTime, setSpentTime] = useState(() => nowLocalTime());
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const effectivePaidBy = paidByMemberId || effectiveMembers[0]?.id || '';
  const [memo, setMemo] = useState('');
  const [splitMethod, setSplitMethod] = useState<
    'equal' | 'ratio' | 'shares' | 'exact' | 'none'
  >(isGroupTrip ? 'equal' : 'none');
  // 멤버별 가중치(ratio/shares) / 금액(exact) 입력값. key=memberId, value=문자열 입력.
  const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});
  const [receipts, setReceipts] = useState<File[]>([]);

  function setSplitInput(memberId: string, value: string) {
    // 숫자만 허용(빈 문자열 허용)
    const clean = value.replace(/[^0-9]/g, '');
    setSplitInputs((prev) => ({ ...prev, [memberId]: clean }));
  }

  // 유효성
  const [errors, setErrors] = useState<{ amount?: string; title?: string }>({});

  const parsedAmount = parseInt(amount.replace(/,/g, '')) || 0;

  // 분담 미리보기 (equal 기준)
  const sharePerPerson =
    splitMethod === 'equal' && effectiveMembers.length > 0
      ? Math.floor(parsedAmount / effectiveMembers.length)
      : 0;
  const shareRemainder =
    splitMethod === 'equal' && effectiveMembers.length > 0
      ? parsedAmount - sharePerPerson * effectiveMembers.length
      : 0;

  function handleSave() {
    // 이미 저장 요청이 진행 중이면 중복 제출 방지
    if (createExpenseMut.isPending) return;

    const newErrors: { amount?: string; title?: string } = {};
    if (parsedAmount <= 0) newErrors.amount = '금액을 입력해주세요';
    if (!title.trim()) newErrors.title = '내용을 입력해주세요';
    if (!effectivePaidBy) newErrors.title = '결제자가 필요합니다';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // 분담 참여자: none이면 결제자만, 그 외엔 전체 멤버
    const participantIds =
      splitMethod === 'none'
        ? [effectivePaidBy]
        : effectiveMembers.map((m) => m.id);

    // 방식별 분담 페이로드 계산
    let weights: Record<string, number> | null = null;
    let exactAmounts: Record<string, number> | null = null;

    if (splitMethod === 'ratio') {
      weights = {};
      for (const m of effectiveMembers) {
        const w = parseInt(splitInputs[m.id] || '0', 10) || 0;
        if (w > 0) weights[m.id] = w;
      }
      if (Object.keys(weights).length === 0) {
        toast.error('비율을 1명 이상 입력해주세요');
        return;
      }
    } else if (splitMethod === 'exact') {
      exactAmounts = {};
      let sum = 0;
      for (const m of effectiveMembers) {
        const v = parseInt(splitInputs[m.id] || '0', 10) || 0;
        exactAmounts[m.id] = v;
        sum += v;
      }
      if (sum !== parsedAmount) {
        toast.error(
          `금액 합계(${sum.toLocaleString()}원)가 지출 금액과 달라요`,
        );
        return;
      }
    }

    createExpenseMut.mutate(
      {
        categoryId,
        title: title.trim(),
        amount: parsedAmount,
        paidByMemberId: effectivePaidBy,
        splitMethod,
        isSettlementTarget: splitMethod !== 'none',
        participantIds,
        dayId: dayId || null,
        spentAt: toIsoDateTime(spentDate, spentTime),
        memo: memo.trim() || null,
        weights,
        exactAmounts,
      },
      {
        onSuccess: () => router.push(`/trip/${tripId}/progress`),
        onError: () => toast.error('지출 저장에 실패했습니다'),
      },
    );
  }

  function handleReceiptAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const allowed = ['image/jpeg', 'image/png', 'image/heic'];
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowed.includes(file.type) && !file.name.endsWith('.heic')) {
        toast.error('jpeg / png / heic만 첨부할 수 있습니다');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('파일 크기는 10MB 이하만 가능합니다');
        continue;
      }
      newFiles.push(file);
    }
    setReceipts((prev) => [...prev, ...newFiles].slice(0, 5));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* 뒤로 가기 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/trip/${tripId}/expense`)}
          className="flex h-9 w-9 items-center justify-center rounded-sm border border-surface-line text-ink-3 transition-colors hover:bg-surface-bg-alt"
          aria-label="지출 내역으로 돌아가기"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-bold text-ink">지출 추가</h1>
      </div>

      {/* 금액 */}
      <Card>
        <label className="mb-2 block text-xs font-medium text-ink-3">
          금액 <span className="text-danger-text">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-ink-3">
            ₩
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '');
              setAmount(raw ? parseInt(raw).toLocaleString() : '');
            }}
            className={cn(
              'h-14 w-full rounded-sm border bg-surface-card pl-9 pr-4 text-2xl font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand',
              errors.amount ? 'border-danger-text' : 'border-surface-line',
            )}
          />
        </div>
        {errors.amount && (
          <p className="mt-1.5 text-xs text-danger-text">{errors.amount}</p>
        )}
        <span className="mt-2 inline-flex items-center gap-1 rounded-pill border border-dashed border-surface-line-strong px-3 py-1 text-[11px] text-ink-3">
          <CircleDollarSign size={13} />
          다중통화 [TODO]
        </span>
      </Card>

      {/* 내용 + 카테고리 */}
      <Card>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-ink-3">
              내용 <span className="text-danger-text">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 1913송정역시장 간식"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                'h-11 w-full rounded-sm border bg-surface-card px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand',
                errors.title ? 'border-danger-text' : 'border-surface-line',
              )}
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-danger-text">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-ink-3">
              카테고리
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-sm border px-3 py-2.5 text-sm font-medium transition-colors',
                    categoryId === cat.id
                      ? 'border-brand bg-brand-tint text-brand'
                      : 'border-surface-line bg-surface-card text-ink hover:bg-surface-bg-alt',
                  )}
                >
                  <CategoryIcon id={cat.id} size={16} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 날짜/시각 + Day + 결제자 + 메모 */}
      <Card>
        <div className="space-y-4">
          {/* 지출 일시 (실제 발생 시각) */}
          <div>
            <label className="mb-2 block text-xs font-medium text-ink-3">
              지출 일시
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={spentDate}
                onChange={(e) => setSpentDate(e.target.value)}
                className="h-11 flex-1 rounded-sm border border-surface-line bg-surface-card px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <input
                type="time"
                value={spentTime}
                onChange={(e) => setSpentTime(e.target.value)}
                className="h-11 w-32 rounded-sm border border-surface-line bg-surface-card px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          {days.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-medium text-ink-3">
                일정 날짜 (Day)
              </label>
              <Select
                aria-label="지출 날짜"
                value={dayId}
                onChange={setDayId}
                triggerClassName="h-11 px-4"
                options={[
                  { value: '', label: '날짜 미지정' },
                  ...days.map((d, i) => ({
                    value: d.id,
                    label: `Day ${i + 1}${d.date ? ` · ${formatDayLabel(d.date)}` : ''}`,
                  })),
                ]}
              />
              <p className="mt-1.5 text-[11px] text-ink-3">
                Day를 지정하면 진행 대시보드의 일자별 지출 추이에 반영돼요.
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-medium text-ink-3">
              결제자
            </label>
            <Select
              aria-label="결제자"
              value={effectivePaidBy}
              onChange={setPaidByMemberId}
              triggerClassName="h-11 px-4"
              options={effectiveMembers.map((m) => ({
                value: m.id,
                label: m.displayName,
              }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-ink-3">
              메모
            </label>
            <textarea
              placeholder="추가 메모 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full rounded-sm border border-surface-line bg-surface-card px-4 py-3 text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      </Card>

      {/* 영수증 첨부 */}
      <Card>
        <label className="mb-3 block text-xs font-medium text-ink-3">
          영수증 첨부
        </label>
        <div className="flex flex-wrap gap-3">
          {receipts.map((file, i) => (
            <div
              key={i}
              className="relative h-20 w-20 rounded-sm border border-surface-line overflow-hidden"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={`영수증 ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setReceipts((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {receipts.length < 5 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-surface-line-strong text-ink-3 hover:border-brand hover:text-brand transition-colors">
              <Plus size={20} />
              <span className="text-[10px]">사진</span>
              <input
                type="file"
                accept="image/jpeg,image/png,.heic"
                multiple
                onChange={handleReceiptAdd}
                className="hidden"
              />
            </label>
          )}
        </div>
        <p className="mt-2 text-[11px] text-ink-3">
          JPG, PNG, HEIC · 최대 10MB · 최대 5장
        </p>
      </Card>

      {/* 분담 설정 (그룹 여행만) */}
      {isGroupTrip && (
        <Card>
          <label className="mb-3 block text-xs font-medium text-ink-3">
            분담 설정
          </label>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(
              [
                { id: 'equal', label: '균등' },
                { id: 'ratio', label: '비율' },
                { id: 'exact', label: '금액지정' },
                { id: 'none', label: '개인' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSplitMethod(opt.id)}
                className={cn(
                  'rounded-sm border py-2 text-xs font-medium transition-colors',
                  splitMethod === opt.id
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 분담 미리보기 */}
          {splitMethod === 'equal' && parsedAmount > 0 && (
            <div className="rounded-sm border border-surface-line bg-surface-bg p-3">
              <p className="text-xs font-medium text-ink-3 mb-2">
                {effectiveMembers.length}명 균등
              </p>
              <div className="space-y-1.5">
                {effectiveMembers.map((m, i) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
                        {m.displayName.charAt(0)}
                      </div>
                      <span className="text-sm text-ink">{m.displayName}</span>
                      {m.id === effectivePaidBy && (
                        <span className="rounded-pill bg-brand-soft px-1.5 py-0.5 text-[10px] text-brand font-medium">
                          결제자
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-ink">
                      {formatKRW(sharePerPerson + (i < shareRemainder ? 1 : 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 비율: 멤버별 가중치 입력 → 비율대로 분배 미리보기 */}
          {splitMethod === 'ratio' && (
            <div className="rounded-sm border border-surface-line bg-surface-bg p-3">
              <p className="mb-2 text-xs font-medium text-ink-3">
                멤버별 비율을 입력하세요 (예: 6, 4)
              </p>
              <div className="space-y-2">
                {effectiveMembers.map((m) => {
                  const w = parseInt(splitInputs[m.id] || '0', 10) || 0;
                  const totalW = effectiveMembers.reduce(
                    (s, mm) =>
                      s + (parseInt(splitInputs[mm.id] || '0', 10) || 0),
                    0,
                  );
                  const share =
                    totalW > 0 ? Math.floor((parsedAmount * w) / totalW) : 0;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-ink">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
                          {m.displayName.charAt(0)}
                        </span>
                        {m.displayName}
                        {m.id === effectivePaidBy && (
                          <span className="rounded-pill bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand">
                            결제자
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={splitInputs[m.id] || ''}
                          onChange={(e) => setSplitInput(m.id, e.target.value)}
                          placeholder="0"
                          className="h-8 w-16 rounded-xs border border-surface-line bg-surface-card px-2 text-right text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                        <span className="w-20 text-right text-xs text-ink-3">
                          {parsedAmount > 0 ? formatKRW(share) : '₩0'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 금액지정: 멤버별 금액 입력 + 합계 검증 */}
          {splitMethod === 'exact' &&
            (() => {
              const sum = effectiveMembers.reduce(
                (s, m) => s + (parseInt(splitInputs[m.id] || '0', 10) || 0),
                0,
              );
              const diff = parsedAmount - sum;
              return (
                <div className="rounded-sm border border-surface-line bg-surface-bg p-3">
                  <p className="mb-2 text-xs font-medium text-ink-3">
                    멤버별 금액을 입력하세요. 합계가 지출 금액과 같아야 해요.
                  </p>
                  <div className="space-y-2">
                    {effectiveMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-2 text-sm text-ink">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
                            {m.displayName.charAt(0)}
                          </span>
                          {m.displayName}
                        </span>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-3">
                            ₩
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              splitInputs[m.id]
                                ? parseInt(
                                    splitInputs[m.id],
                                    10,
                                  ).toLocaleString()
                                : ''
                            }
                            onChange={(e) =>
                              setSplitInput(m.id, e.target.value)
                            }
                            placeholder="0"
                            className="h-8 w-28 rounded-xs border border-surface-line bg-surface-card pl-5 pr-2 text-right text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    className={cn(
                      'mt-3 flex items-center justify-between border-t border-surface-line pt-2 text-xs',
                      diff === 0 ? 'text-ok-text' : 'text-danger-text',
                    )}
                  >
                    <span>합계 {formatKRW(sum)}</span>
                    <span>
                      {diff === 0
                        ? '금액이 일치해요'
                        : diff > 0
                          ? `${formatKRW(diff)} 부족`
                          : `${formatKRW(Math.abs(diff))} 초과`}
                    </span>
                  </div>
                </div>
              );
            })()}
        </Card>
      )}

      {/* 저장 버튼 */}
      <button
        type="button"
        onClick={handleSave}
        disabled={createExpenseMut.isPending}
        className="w-full h-12 rounded-sm bg-brand text-base font-semibold text-on-brand hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-brand"
      >
        {createExpenseMut.isPending ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}
