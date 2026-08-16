'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PlanItemEditPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const dayIndex = params.dayIndex as string;
  const itemId = params.itemId as string;

  const isNew = itemId === 'new';

  const [form, setForm] = useState({
    title: '',
    categoryId: 'tour',
    startTime: '',
    endTime: '',
    estimatedCost: 0,
    place: '',
    memo: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: 실제 저장 로직
    router.push(`/trip/${tripId}/plan/${dayIndex}`);
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href={`/trip/${tripId}/plan/${dayIndex}`}
          className="flex h-8 w-8 items-center justify-center rounded-xs text-ink-2 hover:bg-surface-bg-alt"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-base font-semibold text-ink">
          {isNew ? '일정 항목 추가' : '일정 항목 편집'}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-lg space-y-5"
      >
        <Card>
          <div className="space-y-4">
            <Input
              label="제목"
              placeholder="일정 이름을 입력하세요"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />

            {/* 카테고리 선택 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-2">
                카테고리
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, categoryId: cat.id }))
                    }
                    className={cn(
                      'flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition-colors',
                      form.categoryId === cat.id
                        ? 'border-brand bg-brand-soft text-brand-dark font-medium'
                        : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt',
                    )}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="시작 시간"
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
              />
              <Input
                label="종료 시간"
                type="time"
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
              />
            </div>

            <Input
              label="예상 비용 (₩)"
              type="number"
              min={0}
              placeholder="0"
              value={form.estimatedCost.toString()}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  estimatedCost: parseInt(e.target.value) || 0,
                }))
              }
              hint="미입력 시 '비용 미정'으로 표시"
            />

            <Input
              label="장소"
              placeholder="장소명 또는 주소"
              value={form.place}
              onChange={(e) =>
                setForm((f) => ({ ...f, place: e.target.value }))
              }
              hint="지도 검색은 추후 지원 예정"
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">
                메모
              </label>
              <textarea
                className="h-20 w-full rounded-xs border border-surface-line bg-surface-card px-3 py-2 text-sm text-ink placeholder:text-ink-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="참고 사항, 준비물 등"
                value={form.memo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, memo: e.target.value }))
                }
              />
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Link href={`/trip/${tripId}/plan/${dayIndex}`} className="flex-1">
            <Button variant="secondary" fullWidth type="button">
              취소
            </Button>
          </Link>
          <Button fullWidth type="submit" className="flex-1">
            {isNew ? '추가' : '저장'}
          </Button>
        </div>
      </form>
    </div>
  );
}
