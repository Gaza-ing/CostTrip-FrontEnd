'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

interface TripOption {
  id: string;
  name: string;
  icon: string;
  meta: string;
  checked: boolean;
}

export default function DataExportPage() {
  const [trips, setTrips] = useState<TripOption[]>([
    {
      id: 'trip-001',
      name: '오사카 우정여행',
      icon: '🗾',
      meta: '진행중 · ₩1,560,000 · 4명',
      checked: true,
    },
    {
      id: 'trip-002',
      name: '강릉 워케이션',
      icon: '🌊',
      meta: '예정 · ₩0 · 3명',
      checked: true,
    },
    {
      id: 'trip-003',
      name: '제주 봄 나들이',
      icon: '🌴',
      meta: '완료 · ₩1,692,000 · 4명',
      checked: true,
    },
  ]);
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');

  const allChecked = trips.every((t) => t.checked);

  function toggleTrip(id: string) {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)),
    );
  }

  function toggleAll() {
    const newVal = !allChecked;
    setTrips((prev) => prev.map((t) => ({ ...t, checked: newVal })));
  }

  function handleExport() {
    const selected = trips.filter((t) => t.checked);
    alert(
      `${selected.length}개 여행을 ${format.toUpperCase()} 형식으로 내보냅니다.`,
    );
  }

  return (
    <div className="space-y-5">
      {/* 안내 배너 */}
      <div className="flex items-center gap-3 rounded-sm bg-brand-tint px-4 py-3">
        <span className="text-base">💾</span>
        <p className="text-sm text-ink">
          내 여행 데이터를 <strong>CSV·PDF</strong>로 내려받아 보관할 수 있어요.
          내보낸 파일에는 지출·정산·멤버 정보가 포함됩니다.
        </p>
      </div>

      {/* 내보내기 범위 */}
      <section>
        <h2 className="text-[13px] font-bold text-ink-2 mb-3">내보내기 범위</h2>
        <Card>
          {/* 전체 선택 */}
          <label className="flex items-center gap-3 py-3 cursor-pointer border-b border-surface-line">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-dark text-sm font-bold">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">전체 여행</p>
              <p className="text-xs text-ink-3">
                {trips.length}개 여행 · 지출 전체 포함
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
          {trips.map((trip) => (
            <label
              key={trip.id}
              className="flex items-center gap-3 py-3 cursor-pointer border-b border-surface-line last:border-b-0"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-bg-alt text-base">
                {trip.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">{trip.name}</p>
                <p className="text-xs text-ink-3">{trip.meta}</p>
              </div>
              <input
                type="checkbox"
                checked={trip.checked}
                onChange={() => toggleTrip(trip.id)}
                className="h-5 w-5 rounded accent-brand"
              />
            </label>
          ))}
        </Card>
      </section>

      {/* 파일 형식 */}
      <section>
        <h2 className="text-[13px] font-bold text-ink-2 mb-3">파일 형식</h2>
        <Card>
          <label className="flex items-center gap-3 py-3 cursor-pointer border-b border-surface-line">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cat-etc-soft text-base">
              📄
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cat-etc-soft text-base">
              🧾
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cat-etc-soft text-base">
              🧾
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
            <span className="rounded-pill border border-dashed border-surface-line-strong px-3 py-1.5 text-[11px] text-ink-3">
              ＄ 다중통화 내보내기 [TODO]
            </span>
          </div>
        </Card>
      </section>

      {/* CTA */}
      <Button
        fullWidth
        size="lg"
        onClick={handleExport}
        disabled={!trips.some((t) => t.checked)}
      >
        📥 선택 항목 내보내기
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

          {/* 차단 배너 (mock: 미정산 잔액) */}
          <div className="flex items-center gap-2 rounded-sm bg-danger-soft px-4 py-3 mb-4">
            <span className="text-sm">🔴</span>
            <p className="text-sm text-ink">
              <strong>미정산 잔액</strong>이 있어 지금은 삭제할 수 없어요.
              최유나→김지원 ₩140,000, 박서준→김지원 ₩40,000 정산을 먼저 완료해
              주세요.
            </p>
          </div>

          <Button variant="danger" fullWidth disabled>
            계정 영구 삭제
          </Button>
          <p className="mt-2 text-center text-xs text-ink-3">
            미정산 정산 완료 후 활성화됩니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
