'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CalendarDays, X } from 'lucide-react';
import { useState } from 'react';

interface TripDateEditorProps {
  startDate: string;
  endDate: string;
  onSave: (startDate: string, endDate: string) => void;
}

/** ISO date 두 개로 일수 계산(포함). 잘못된 값이면 null. */
function daySpan(start: string, end: string): number | null {
  if (!start || !end) return null;
  return (
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1
  );
}

export function TripDateEditor({
  startDate,
  endDate,
  onSave,
}: TripDateEditorProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ startDate, endDate });

  function handleOpen() {
    setForm({ startDate, endDate });
    setOpen(true);
  }

  const originalDayCount = daySpan(startDate, endDate);
  const dayCount = daySpan(form.startDate, form.endDate);

  // 기간이 줄어드는지 (줄어들면 잘려나가는 날짜의 일정이 삭제될 수 있음)
  const isShrinking =
    originalDayCount != null && dayCount != null && dayCount < originalDayCount;
  const removedDays = isShrinking ? originalDayCount - dayCount : 0;

  function handleSave() {
    if (form.startDate && form.endDate && form.startDate <= form.endDate) {
      // 기간 단축 시 마지막 날들의 일정이 삭제되므로 한 번 더 확인
      if (isShrinking) {
        const ok = window.confirm(
          `여행 기간이 ${removedDays}일 줄어들어요.\n` +
            `마지막 ${removedDays}일에 등록된 일정은 삭제됩니다. ` +
            `(지출 기록은 '날짜 미지정'으로 보존돼요)\n\n계속할까요?`,
        );
        if (!ok) return;
      }
      onSave(form.startDate, form.endDate);
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block">
      {/* 트리거: 날짜 텍스트 클릭 */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs text-ink-3 hover:text-brand transition-colors cursor-pointer"
        aria-label="여행 기간 수정"
      >
        <CalendarDays size={12} />
        <span className="underline decoration-dashed underline-offset-2">
          {startDate.replace(/-/g, '.')}~{endDate.replace(/-/g, '.')}
        </span>
      </button>

      {/* 팝오버 */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute left-0 top-full z-50 mt-2 w-72 rounded-md border border-surface-line bg-surface-card p-4 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink">여행 기간 수정</h3>
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-xs text-ink-3 hover:bg-surface-bg-alt"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <Input
                label="시작일"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    startDate: e.target.value,
                    endDate:
                      f.endDate && e.target.value > f.endDate ? '' : f.endDate,
                  }))
                }
              />
              <Input
                label="종료일"
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
              />

              {dayCount && (
                <p className="text-xs text-ink-3">
                  {dayCount - 1}박 {dayCount}일
                </p>
              )}

              {isShrinking && (
                <p className="rounded-xs bg-warn-soft px-2 py-1.5 text-xs text-warn-text">
                  기간이 {removedDays}일 줄어들어요. 마지막 {removedDays}일의
                  일정은 삭제됩니다. (지출은 날짜 미지정으로 보존)
                </p>
              )}

              {form.startDate > form.endDate && form.endDate && (
                <p className="text-xs text-danger-text">
                  종료일이 시작일보다 빠를 수 없습니다
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setOpen(false)}
                >
                  취소
                </Button>
                <Button size="sm" fullWidth onClick={handleSave}>
                  저장
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
