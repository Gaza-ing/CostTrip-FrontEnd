'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW, cn } from '@/lib/utils';
import { mockDays } from '@/lib/api';
import { mockPlanItems } from '@/lib/api/plan-items';
import { useAppStore } from '@/stores/app-store';
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import type { PlanItem } from '@/types';

export default function DayPlanPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const dayIndex = parseInt(params.dayIndex as string);

  const days = mockDays.filter((d) => d.tripId === 'trip-001');
  const currentDay = days[dayIndex];
  const dayId = currentDay?.id || 'day-001';

  const [items, setItems] = useState<PlanItem[]>(
    mockPlanItems
      .filter((p) => p.dayId === dayId)
      .sort((a, b) => {
        if (a.startTime && b.startTime)
          return a.startTime.localeCompare(b.startTime);
        if (a.startTime) return -1;
        if (b.startTime) return 1;
        return a.sortOrder - b.sortOrder;
      }),
  );

  const totalCost = items.reduce((sum, item) => sum + item.estimatedCost, 0);
  const placeCount = items.filter((i) => i.latitude).length;

  // 슬라이드 패널 state
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const { setEditMode, clearEditMode } = useAppStore();
  const [panelForm, setPanelForm] = useState({
    title: '',
    categoryId: 'tour',
    startTime: '',
    endTime: '',
    estimatedCost: 0,
    place: '',
    memo: '',
  });

  function openAddPanel() {
    setEditingItem(null);
    setPanelForm({
      title: '',
      categoryId: 'tour',
      startTime: '',
      endTime: '',
      estimatedCost: 0,
      place: '',
      memo: '',
    });
    setPanelOpen(true);
    setEditMode({
      active: true,
      title: `일정 편집 · Day ${dayIndex + 1}`,
      subtitle: '오사카 우정여행 · 2026.07.10~07.14',
    });
  }

  function openEditPanel(item: PlanItem) {
    setEditingItem(item);
    setPanelForm({
      title: item.title,
      categoryId: item.categoryId,
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      estimatedCost: item.estimatedCost,
      place: '',
      memo: '',
    });
    setPanelOpen(true);
    setEditMode({
      active: true,
      title: `일정 편집 · Day ${dayIndex + 1}`,
      subtitle: '오사카 우정여행 · 2026.07.10~07.14',
    });
  }

  function closePanel() {
    setPanelOpen(false);
    clearEditMode();
  }

  function handlePanelSave() {
    if (editingItem) {
      // 편집: 기존 항목 업데이트
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                title: panelForm.title || item.title,
                categoryId: panelForm.categoryId,
                startTime: panelForm.startTime || item.startTime,
                endTime: panelForm.endTime || item.endTime,
                estimatedCost: panelForm.estimatedCost,
              }
            : item,
        ),
      );
    } else {
      // 추가: 새 항목 생성
      const newItem: PlanItem = {
        id: `pi-${Date.now()}`,
        dayId,
        categoryId: panelForm.categoryId,
        title: panelForm.title || '새 일정',
        estimatedCost: panelForm.estimatedCost,
        startTime: panelForm.startTime || undefined,
        endTime: panelForm.endTime || undefined,
        sortOrder: items.length,
      };
      setItems((prev) => [...prev, newItem]);
    }
    closePanel();
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [
      newItems[targetIndex],
      newItems[index],
    ];
    setItems(newItems);
  }

  function deleteItem(id: string) {
    if (confirm('이 일정을 삭제할까요?')) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

  return (
    <div className="space-y-5">
      {/* Day 선택 칩 + 날짜 정보 */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-pill bg-surface-bg-alt p-1">
          {days.map((day, i) => (
            <Link
              key={day.id}
              href={`/trip/${tripId}/plan/${i}`}
              className={cn(
                'shrink-0 rounded-pill px-4 py-1.5 text-sm font-medium transition-all',
                i === dayIndex
                  ? 'bg-surface-card text-brand shadow-sm'
                  : 'text-ink-3 hover:text-ink-2',
              )}
            >
              Day{i + 1}
            </Link>
          ))}
        </div>
        <span className="shrink-0 text-sm text-ink-3">
          7월 12일 (일) · 오사카성 · 도톤보리
        </span>
      </div>

      {/* 상단 stat 3개 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-sm border border-surface-line bg-surface-card p-4">
          <p className="text-xs text-ink-3">오늘 일정</p>
          <p className="mt-1 text-xl font-bold text-ink">{items.length}개</p>
        </div>
        <div className="rounded-sm border border-surface-line bg-surface-card p-4">
          <p className="text-xs text-ink-3">예상 지출</p>
          <p className="mt-1 text-xl font-bold text-brand">
            {totalCost > 0 ? formatKRW(totalCost) : '₩0'}
          </p>
        </div>
        <div className="rounded-sm border border-surface-line bg-surface-card p-4">
          <p className="text-xs text-ink-3">방문 장소</p>
          <p className="mt-1 text-xl font-bold text-ink">{placeCount}곳</p>
        </div>
      </div>

      {/* 메인 그리드: 좌(타임라인) + 우(지도) */}
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        {/* 좌: 타임라인 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">타임라인</h2>
            <Badge variant="brand">
              {getDayLabel(dayIndex)}
            </Badge>
          </div>

          {items.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-sm text-ink-3">아직 일정이 없습니다</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={openAddPanel}>
                <Plus size={14} className="mr-1" />
                첫 일정 추가하기
              </Button>
            </Card>
          ) : (
            <Card padding="sm" className="bg-brand-tint border-brand-soft">
              <div className="space-y-3">
                {items.map((item, index) => {
                  const cat = CATEGORIES.find(
                    (c) => c.id === item.categoryId,
                  );
                  const hasTime = !!item.startTime;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xs bg-surface-card px-3 py-2.5 shadow-sm cursor-pointer hover:ring-1 hover:ring-brand/30 transition-all"
                      onClick={() => openEditPanel(item)}
                    >
                      {/* 카테고리 아이콘 */}
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-surface-bg-alt text-lg">
                        {cat?.icon}
                      </span>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-ink-3">
                          <Badge
                            variant="category"
                            category={
                              item.categoryId as
                                | 'stay'
                                | 'move'
                                | 'food'
                                | 'tour'
                                | 'shop'
                                | 'etc'
                            }
                            className="mr-1"
                          >
                            {cat?.label}
                          </Badge>
                          · {item.latitude ? '오사카' : '장소 미정'}
                          {item.endTime &&
                            item.startTime &&
                            ` · 약 ${getTimeDiff(item.startTime, item.endTime)}`}
                        </p>
                      </div>

                      {/* 비용 + 시간 */}
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-ink">
                          {item.estimatedCost > 0
                            ? formatKRW(item.estimatedCost)
                            : '₩0'}
                        </p>
                        <p className="text-xs text-ink-3">
                          {item.startTime || '--:--'}
                          {item.endTime && `~${item.endTime}`}
                        </p>
                      </div>

                      {/* 액션: 위/아래/삭제 */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
                          disabled={index === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-xs border border-surface-line text-ink-3 hover:bg-surface-bg-alt disabled:opacity-30 transition-colors"
                          aria-label="위로 이동"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
                          disabled={index === items.length - 1}
                          className="flex h-7 w-7 items-center justify-center rounded-xs border border-surface-line text-ink-3 hover:bg-surface-bg-alt disabled:opacity-30 transition-colors"
                          aria-label="아래로 이동"
                        >
                          <ChevronDown size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                          className="flex h-7 w-7 items-center justify-center rounded-xs border border-surface-line text-ink-3 hover:text-danger hover:border-danger transition-colors"
                          aria-label="삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 예산 경고 (mock) */}
          {items.some((i) => i.categoryId === 'shop') && (
            <div className="flex items-start gap-2 rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger-text">
              <span>🔴</span>
              <span>
                쇼핑 예산이 이미 초과 상태(113%)예요. 신사이바시 일정의
                지출에 주의하세요.
              </span>
            </div>
          )}

          {/* 일정 추가 버튼 */}
          <Button variant="secondary" fullWidth className="border-dashed" onClick={openAddPanel}>
            <Plus size={14} className="mr-1.5" />
            Day {dayIndex + 1} 일정 추가
          </Button>
        </div>

        {/* 우: 지도 (placeholder) */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-ink">지도 · 동선</h2>

          {/* 지도 placeholder */}
          <div className="relative rounded-md border border-surface-line bg-surface-bg-alt overflow-hidden" style={{ height: 420 }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-3">
              <MapPin size={32} className="mb-2 text-brand opacity-50" />
              <p className="text-sm font-medium">지도 영역</p>
              <p className="text-xs mt-1">카카오맵 API 연동 예정</p>
            </div>

            {/* Mock 동선 표시 */}
            <div className="absolute inset-0 p-6">
              {/* 출발점 */}
              <div className="absolute left-[20%] bottom-[25%] flex items-center gap-1">
                <div className="h-3 w-3 rounded-pill bg-ok" />
                <span className="text-[10px] text-ink-2 font-medium">
                  09:30 오사카성
                </span>
              </div>
              {/* 중간점 */}
              <div className="absolute left-[40%] top-[55%] flex items-center gap-1">
                <div className="h-3 w-3 rounded-pill bg-warn" />
                <span className="text-[10px] text-ink-2 font-medium">
                  도톤보리
                </span>
              </div>
              {/* 쇼핑 */}
              <div className="absolute right-[20%] top-[40%] flex items-center gap-1">
                <div className="h-3 w-3 rounded-pill bg-cat-shop" />
                <span className="text-[10px] text-ink-2 font-medium">
                  15:00 신사이바시
                </span>
              </div>
              {/* 호텔 */}
              <div className="absolute right-[15%] top-[15%] flex items-center gap-1">
                <div className="h-3 w-3 rounded-pill bg-brand" />
                <span className="text-[10px] text-ink-2 font-medium">
                  19:00 호텔
                </span>
              </div>

              {/* 경로 표시 (점선) */}
              <div className="absolute top-[20%] left-[22%] text-xs text-brand opacity-50">
                <span className="text-[10px]">
                  오사카성 → 도톤보리 일대
                </span>
              </div>
            </div>
          </div>

          {/* 이동 요약 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-sm border border-surface-line bg-surface-card p-4 text-center">
              <p className="text-xs text-ink-3">총 이동 거리</p>
              <p className="mt-1 text-lg font-bold text-ink">약 3.2km</p>
            </div>
            <div className="rounded-sm border border-surface-line bg-surface-card p-4 text-center">
              <p className="text-xs text-ink-3">예상 이동 시간</p>
              <p className="mt-1 text-lg font-bold text-ink">약 48분</p>
            </div>
          </div>
        </div>
      </div>

      {/* 슬라이드 패널: 일정 항목 편집 */}
      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editingItem ? `일정 항목 편집` : '일정 항목 추가'}
      >
        <div className="space-y-5">
          {/* 항목 유형 (카테고리) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-2">
              항목 유형
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setPanelForm((f) => ({ ...f, categoryId: cat.id }))
                  }
                  className={cn(
                    'rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors',
                    panelForm.categoryId === cat.id
                      ? 'border-brand bg-brand text-on-brand'
                      : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <Input
            label="제목"
            placeholder="일정 이름"
            value={panelForm.title}
            onChange={(e) =>
              setPanelForm((f) => ({ ...f, title: e.target.value }))
            }
          />

          {/* 장소 */}
          <Input
            label="장소"
            placeholder="장소명 검색"
            value={panelForm.place}
            onChange={(e) =>
              setPanelForm((f) => ({ ...f, place: e.target.value }))
            }
            hint="카카오맵 연동 예정"
          />

          {/* 지도 placeholder */}
          <div className="h-32 rounded-sm border border-surface-line bg-surface-bg-alt flex items-center justify-center text-xs text-ink-3">
            <MapPin size={16} className="mr-1 text-brand opacity-50" />
            지도 미리보기 (연동 예정)
          </div>

          {/* 시간 */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="시작 시간"
              type="time"
              value={panelForm.startTime}
              onChange={(e) =>
                setPanelForm((f) => ({ ...f, startTime: e.target.value }))
              }
            />
            <Input
              label="종료 시간"
              type="time"
              value={panelForm.endTime}
              onChange={(e) =>
                setPanelForm((f) => ({ ...f, endTime: e.target.value }))
              }
            />
          </div>

          {/* 카테고리 */}
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
                    setPanelForm((f) => ({ ...f, categoryId: cat.id }))
                  }
                  className={cn(
                    'rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors',
                    panelForm.categoryId === cat.id
                      ? 'border-brand bg-brand text-on-brand'
                      : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt',
                  )}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 예상 비용 */}
          <div>
            <Input
              label="예상 비용"
              type="number"
              min={0}
              value={panelForm.estimatedCost.toString()}
              onChange={(e) =>
                setPanelForm((f) => ({
                  ...f,
                  estimatedCost: parseInt(e.target.value) || 0,
                }))
              }
            />
            <span className="mt-1 inline-block rounded-xs border border-dashed border-surface-line-strong px-2 py-0.5 text-xs text-ink-3">
              ＄ 다중통화 [TODO]
            </span>
          </div>

          {/* 메모 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-2">
              메모
            </label>
            <textarea
              className="h-24 w-full rounded-xs border border-surface-line bg-surface-card px-3 py-2 text-sm text-ink placeholder:text-ink-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="참고 사항, 준비물 등"
              value={panelForm.memo}
              onChange={(e) =>
                setPanelForm((f) => ({ ...f, memo: e.target.value }))
              }
            />
          </div>

          {/* 저장 */}
          <div className="flex gap-3 pt-3 border-t border-surface-line">
            <Button variant="secondary" fullWidth onClick={closePanel}>
              취소
            </Button>
            <Button fullWidth onClick={handlePanelSave}>
              {editingItem ? '저장' : '추가'}
            </Button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}

function getDayLabel(dayIdx: number): string {
  // 여행 시작일 기준
  const tripStart = new Date('2026-07-10');
  const dayDate = new Date(tripStart);
  dayDate.setDate(dayDate.getDate() + dayIdx);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dayDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (dayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '내일';
  if (diffDays === -1) return '어제';
  if (diffDays > 0) return `D-${diffDays}`;
  return `D+${Math.abs(diffDays)}`;
}

function getTimeDiff(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  if (diff >= 60) {
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${diff}분`;
}
