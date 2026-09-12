'use client';

import {
  HardDriveDownload,
  Check,
  MapPin,
  FileSpreadsheet,
  FileText,
  Receipt,
  Download,
  CircleDollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatKRW } from '@/lib/utils';
import { useTrips } from '@/hooks/use-trips';
import { toast } from '@/stores/toast-store';
import type { Trip } from '@/types';
import { useState } from 'react';

const STATUS_LABEL: Record<Trip['status'], string> = {
  planning: '예정',
  in_progress: '진행중',
  completed: '완료',
};

export default function DataExportPage() {
  const { data: allTrips = [], isLoading } = useTrips();
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');

  const isChecked = (id: string) => !unchecked.has(id);
  const allChecked = allTrips.every((t) => isChecked(t.id));

  function toggleTrip(id: string) {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allChecked) {
      setUnchecked(new Set(allTrips.map((t) => t.id)));
    } else {
      setUnchecked(new Set());
    }
  }

  function handleExport() {
    const selected = allTrips.filter((t) => isChecked(t.id));
    toast.info(
      `${selected.length}개 여행을 ${format.toUpperCase()} 형식으로 내보냅니다.`,
    );
  }

  const selectedCount = allTrips.filter((t) => isChecked(t.id)).length;

  return (
    <div className="space-y-5">
      {/* 안내 배너 */}
      <div className="flex items-center gap-3 rounded-sm bg-brand-tint px-4 py-3">
        <HardDriveDownload size={18} className="shrink-0 text-brand" />
        <p className="text-sm text-ink">
          내 여행 데이터를 <strong>CSV·PDF</strong>로 내려받아 보관할 수 있어요.
          내보낸 파일에는 지출·정산·멤버 정보가 포함됩니다.
        </p>
      </div>

      {/* 내보내기 범위 */}
      <section>
        <h2 className="text-[13px] font-bold text-ink-2 mb-3">내보내기 범위</h2>
        <Card>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-ink-3">
              여행 불러오는 중...
            </p>
          ) : allTrips.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">
              내보낼 여행이 없어요
            </p>
          ) : (
            <>
              {/* 전체 선택 */}
              <label className="flex items-center gap-3 py-3 cursor-pointer border-b border-surface-line">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
                  <Check size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink">전체 여행</p>
                  <p className="text-xs text-ink-3">
                    {allTrips.length}개 여행 · 지출 전체 포함
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-5 w-5 rounded accent-brand"
                />
              </label>

              {/* 개별 여행 */}
              {allTrips.map((trip) => (
                <label
                  key={trip.id}
                  className="flex items-center gap-3 py-3 cursor-pointer border-b border-surface-line last:border-b-0"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-bg-alt text-ink-2">
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{trip.title}</p>
                    <p className="text-xs text-ink-3">
                      {STATUS_LABEL[trip.status]} ·{' '}
                      {formatKRW(trip.totalBudget)} · {trip.headcount}명
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked(trip.id)}
                    onChange={() => toggleTrip(trip.id)}
                    className="h-5 w-5 rounded accent-brand"
                  />
                </label>
              ))}
            </>
          )}
        </Card>
      </section>

      {/* 파일 형식 */}
      <section>
        <h2 className="text-[13px] font-bold text-ink-2 mb-3">파일 형식</h2>
        <Card>
          <label className="flex items-center gap-3 py-3 cursor-pointer border-b border-surface-line">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cat-etc-soft text-cat-etc">
              <FileSpreadsheet size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">CSV</p>
              <p className="text-xs text-ink-3">엑셀·시트에서 열기 좋아요</p>
            </div>
            <input
              type="radio"
              name="format"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
              className="h-5 w-5 accent-brand"
            />
          </label>
          <label className="flex items-center gap-3 py-3 cursor-pointer border-b border-surface-line">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cat-etc-soft text-cat-etc">
              <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">PDF</p>
              <p className="text-xs text-ink-3">보고서·인쇄용 정리본</p>
            </div>
            <input
              type="radio"
              name="format"
              checked={format === 'pdf'}
              onChange={() => setFormat('pdf')}
              className="h-5 w-5 accent-brand"
            />
          </label>
          <label className="flex items-center gap-3 py-3 cursor-pointer opacity-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cat-etc-soft text-cat-etc">
              <Receipt size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">
                영수증 첨부 포함{' '}
                <span className="rounded-pill border border-dashed border-surface-line-strong px-2 py-0.5 text-[10px] text-ink-3">
                  TODO
                </span>
              </p>
              <p className="text-xs text-ink-3">
                포함 방식(파일 동봉 / 링크 목록)이 정해지지 않았어요
              </p>
            </div>
            <input type="checkbox" disabled className="h-5 w-5" />
          </label>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1 rounded-pill border border-dashed border-surface-line-strong px-3 py-1.5 text-[11px] text-ink-3">
              <CircleDollarSign size={13} />
              다중통화 내보내기 [TODO]
            </span>
          </div>
        </Card>
      </section>

      {/* CTA */}
      <Button
        fullWidth
        size="lg"
        onClick={handleExport}
        disabled={selectedCount === 0}
      >
        <Download size={18} />
        선택 항목 내보내기
      </Button>
      <p className="text-center text-xs text-ink-3">
        내보내기 기록은 30일간 보관됩니다.
      </p>

      {/* 위험 영역 */}
      <div className="border-t border-surface-line pt-6 mt-6">
        <h2 className="text-[13px] font-bold text-danger-text mb-3">
          위험 영역
        </h2>
        <Card className="border-danger-soft">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-danger-text">계정 삭제</h3>
            <Badge variant="danger">되돌릴 수 없음</Badge>
          </div>
          <p className="text-sm text-ink-3 mb-4">
            계정과 모든 여행·지출·정산 데이터가 영구 삭제됩니다. 삭제 전에
            데이터를 내보내는 것을 권장해요.
          </p>

          <Button variant="danger" fullWidth disabled>
            계정 영구 삭제
          </Button>
          <p className="mt-2 text-center text-xs text-ink-3">
            계정 삭제 기능은 준비 중입니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
