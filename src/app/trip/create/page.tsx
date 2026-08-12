'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CATEGORIES } from '@/lib/constants';
import { useCreateTrip } from '@/hooks/use-trips';
import { ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TripCreatePage() {
  const router = useRouter();
  const createTrip = useCreateTrip();

  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    headcount: 1,
    totalBudget: 0,
  });

  const [categoryBudgets, setCategoryBudgets] = useState<
    Record<string, number>
  >(Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])));

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const newErrors: Record<string, string> = {};

    if (!form.destination) newErrors.destination = '목적지를 입력해주세요';
    if (!form.startDate) newErrors.startDate = '시작일을 선택해주세요';
    if (!form.endDate) newErrors.endDate = '종료일을 선택해주세요';
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      newErrors.endDate = '종료일이 시작일보다 빠를 수 없습니다';
    }
    if (form.headcount < 1) newErrors.headcount = '1명 이상이어야 합니다';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        headcount: form.headcount,
        totalBudget: form.totalBudget,
        currencyCode: 'KRW',
        tripTimeZone: 'Asia/Seoul',
        status: 'planning',
      },
      {
        onSuccess: (trip) => {
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

  const categoryTotal = Object.values(categoryBudgets).reduce(
    (sum, v) => sum + v,
    0,
  );

  return (
    <div className="min-h-screen bg-surface-bg">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-surface-line bg-surface-card px-6">
        <Link
          href="/home"
          className="flex h-8 w-8 items-center justify-center rounded-xs text-ink-2 hover:bg-surface-bg-alt"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-semibold text-ink">새 여행 만들기</h1>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6 p-6">
        {/* 기본 정보 */}
        <Card>
          <div className="space-y-4">
            <Input
              label="여행 이름"
              placeholder="미입력 시 목적지명 사용"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              hint="미입력 시 목적지명이 사용됩니다"
            />

            <Input
              label="목적지"
              placeholder="여행지를 입력하세요"
              value={form.destination}
              onChange={(e) =>
                setForm((f) => ({ ...f, destination: e.target.value }))
              }
              error={errors.destination}
            />

            {/* 프리셋 칩 */}
            <div className="flex flex-wrap gap-2">
              {['오사카', '도쿄', '강릉', '제주'].map((place) => (
                <button
                  key={place}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, destination: place }))}
                  className="flex items-center gap-1 rounded-pill border border-surface-line px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-bg-alt transition-colors"
                >
                  <MapPin size={12} />
                  {place}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="시작일"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                error={errors.startDate}
              />
              <Input
                label="종료일"
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                error={errors.endDate}
              />
            </div>

            {dayCount && (
              <p className="text-sm text-ink-3">
                {dayCount - 1}박 {dayCount}일
              </p>
            )}

            <Input
              label="인원 수"
              type="number"
              min={1}
              max={50}
              value={form.headcount.toString()}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  headcount: parseInt(e.target.value) || 1,
                }))
              }
              error={errors.headcount}
            />

            <Input
              label="전체 예산 (₩)"
              type="number"
              min={0}
              placeholder="0"
              value={form.totalBudget.toString()}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  totalBudget: parseInt(e.target.value) || 0,
                }))
              }
              hint="KRW 단위"
            />
          </div>
        </Card>

        {/* 카테고리별 예산 (선택) */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-ink">
            카테고리별 예산 배분 (선택)
          </h2>
          <div className="space-y-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="w-16 text-sm text-ink-2">
                  {cat.icon} {cat.label}
                </span>
                <input
                  type="number"
                  min={0}
                  className="h-9 flex-1 rounded-xs border border-surface-line bg-surface-card px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  value={categoryBudgets[cat.id] || ''}
                  onChange={(e) =>
                    setCategoryBudgets((prev) => ({
                      ...prev,
                      [cat.id]: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
            ))}
            <div className="flex justify-between border-t border-surface-line pt-3 text-sm">
              <span className="text-ink-2">카테고리 합계</span>
              <span
                className={
                  form.totalBudget > 0 && categoryTotal > form.totalBudget
                    ? 'font-medium text-warn-text'
                    : 'text-ink'
                }
              >
                ₩{categoryTotal.toLocaleString()}
              </span>
            </div>
            {form.totalBudget > 0 && categoryTotal > form.totalBudget && (
              <p className="text-xs text-warn-text">
                카테고리 합계가 전체 예산을 초과합니다
              </p>
            )}
          </div>
        </Card>

        {/* 액션 */}
        <div className="flex gap-3">
          <Link href="/home" className="flex-1">
            <Button variant="secondary" fullWidth type="button">
              취소
            </Button>
          </Link>
          <Button
            fullWidth
            type="submit"
            disabled={createTrip.isPending}
            className="flex-1"
          >
            {createTrip.isPending ? '생성 중...' : '여행 생성'}
          </Button>
        </div>
      </form>
    </div>
  );
}
