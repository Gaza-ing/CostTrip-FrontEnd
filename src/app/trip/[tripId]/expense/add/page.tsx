'use client';

import { Card } from '@/components/ui/Card';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW, cn } from '@/lib/utils';
import { useExpenseStore, useMemberStore, selectMembersByTrip } from '@/stores';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Expense } from '@/types';

export default function ExpenseAddPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const addExpense = useExpenseStore((s) => s.addExpense);
  const allMembers = useMemberStore((s) => s.members);

  const members = selectMembersByTrip(allMembers, tripId);
  // 새 여행인 경우 기본 멤버 1명(본인)
  const effectiveMembers =
    members.length > 0
      ? members
      : [
          {
            id: 'me',
            tripId,
            userId: 'user-001',
            displayName: '나',
            role: 'owner' as const,
            inviteStatus: 'accepted' as const,
          },
        ];

  const isGroupTrip = effectiveMembers.length > 1;

  // 폼 상태
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [paidByMemberId, setPaidByMemberId] = useState(
    effectiveMembers[0]?.id || 'me',
  );
  const [memo, setMemo] = useState('');
  const [splitMethod, setSplitMethod] = useState<
    'equal' | 'ratio' | 'shares' | 'exact' | 'none'
  >(isGroupTrip ? 'equal' : 'none');
  const [receipts, setReceipts] = useState<File[]>([]);

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
    const newErrors: { amount?: string; title?: string } = {};
    if (parsedAmount <= 0) newErrors.amount = '금액을 입력해주세요';
    if (!title.trim()) newErrors.title = '내용을 입력해주세요';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const now = new Date().toISOString();
    const expense: Expense = {
      id: `exp-${crypto.randomUUID()}`,
      tripId,
      dayId: null, // TODO: spentAt → tripTimeZone 변환으로 dayId 추정
      categoryId,
      amount: parsedAmount,
      currencyCode: 'KRW',
      description: title.trim(),
      paidByMemberId,
      splitMethod,
      isSettlementTarget: splitMethod !== 'none',
      createdAt: now,
      updatedAt: now,
    };

    addExpense(expense);
    router.push(`/trip/${tripId}/progress`);
  }

  function handleReceiptAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const allowed = ['image/jpeg', 'image/png', 'image/heic'];
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowed.includes(file.type) && !file.name.endsWith('.heic')) {
        alert('jpeg / png / heic만 첨부할 수 있습니다');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하만 가능합니다');
        continue;
      }
      newFiles.push(file);
    }
    setReceipts((prev) => [...prev, ...newFiles].slice(0, 5));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
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
        <span className="mt-2 inline-block rounded-pill border border-dashed border-surface-line-strong px-3 py-1 text-[11px] text-ink-3">
          ＄ 다중통화 [TODO]
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
              placeholder="예: 도톤보리 타코야키"
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
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 결제자 + 메모 */}
      <Card>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-ink-3">
              결제자
            </label>
            <select
              value={paidByMemberId}
              onChange={(e) => setPaidByMemberId(e.target.value)}
              className="h-11 w-full rounded-sm border border-surface-line bg-surface-card px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {effectiveMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
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
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {receipts.length < 5 && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-surface-line-strong text-ink-3 hover:border-brand hover:text-brand transition-colors">
              <span className="text-xl">+</span>
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
          <div className="grid grid-cols-5 gap-2 mb-4">
            {(
              [
                { id: 'equal', label: '균등' },
                { id: 'ratio', label: '비율' },
                { id: 'shares', label: '지분' },
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
                      {m.id === paidByMemberId && (
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

          {splitMethod !== 'equal' && splitMethod !== 'none' && (
            <div className="rounded-sm border border-dashed border-surface-line-strong bg-surface-bg p-4 text-center">
              <span className="text-xs text-ink-3">
                {splitMethod === 'ratio' && '비율 입력은 추후 지원 예정'}
                {splitMethod === 'shares' && '지분 입력은 추후 지원 예정'}
                {splitMethod === 'exact' && '금액 지정은 추후 지원 예정'}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* 저장 버튼 */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full h-12 rounded-sm bg-brand text-base font-semibold text-on-brand hover:bg-brand-dark transition-colors"
      >
        저장
      </button>
    </div>
  );
}
