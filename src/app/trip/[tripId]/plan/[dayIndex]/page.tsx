'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { HeaderActionButton } from '@/components/layout';
import { useHeaderAction } from '@/hooks/use-header-action';
import { CATEGORIES } from '@/lib/constants';
import { CategoryIcon } from '@/lib/category-icons';
import { KakaoMap } from '@/components/map/KakaoMap';
import { PlaceSearch, type SelectedPlace } from '@/components/map/PlaceSearch';
import { formatKRW, cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { useTrip } from '@/hooks/use-trips';
import {
  useDays,
  usePlanItems,
  useCreatePlanItem,
  useUpdatePlanItem,
  useDeletePlanItem,
} from '@/hooks/use-plan';
import { createPlanItem } from '@/lib/api/plan-items';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/toast-store';
import { useMemo } from 'react';
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  MapPin,
  GripVertical,
  AlertCircle,
  CircleDollarSign,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import type { PlanItem } from '@/types';

interface PlanForm {
  title: string;
  categoryId: string;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  place: string;
  memo: string;
  lat: number | null;
  lng: number | null;
  // 숙소(stay)일 때 연속 숙박 일수(이 날 포함). 기본 1.
  nights: number;
}

const EMPTY_FORM: PlanForm = {
  title: '',
  categoryId: 'tour',
  // 현재 시각이 아니라 00:00을 기본값으로 (브라우저 time input이 빈 값이면
  // 현재 시각을 placeholder로 보여줘 헷갈리므로 명시적으로 자정 지정)
  startTime: '00:00',
  endTime: '',
  estimatedCost: 0,
  place: '',
  memo: '',
  lat: null,
  lng: null,
  nights: 1,
};

export default function DayPlanPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const dayIndex = parseInt(params.dayIndex as string);

  // 여행 정보(기간)
  const { data: trip } = useTrip(tripId);
  const tripStartDate = trip?.startDate ?? '';
  // 편집 패널 헤더 subtitle (실제 여행 정보)
  const editSubtitle = trip
    ? `${trip.title} · ${trip.startDate.replace(/-/g, '.')}~${trip.endDate.replace(/-/g, '.')}`
    : '';

  // 서버 일자 목록
  const { data: days = [] } = useDays(tripId, tripStartDate || undefined);
  const currentDay = days[dayIndex];
  const dayId = currentDay?.id;
  const dayDate = currentDay?.date || undefined;

  const queryClient = useQueryClient();
  // 서버 일정 항목
  const { data: serverItems = [] } = usePlanItems(tripId, dayId);
  const createItemMut = useCreatePlanItem(tripId, dayId ?? '');
  const updateItemMut = useUpdatePlanItem(tripId, dayId ?? '');
  const deleteItemMut = useDeletePlanItem(tripId, dayId ?? '');

  // 서버 데이터를 시간순 정렬한 파생값
  const serverSorted = useMemo(
    () =>
      [...serverItems].sort((a, b) => {
        if (a.startTime && b.startTime)
          return a.startTime.localeCompare(b.startTime);
        if (a.startTime) return -1;
        if (b.startTime) return 1;
        return a.sortOrder - b.sortOrder;
      }),
    [serverItems],
  );

  // dnd 로컬 순서 오버라이드(id 배열). 없으면 서버 정렬을 그대로 사용.
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const items = useMemo(() => {
    if (!orderOverride) return serverSorted;
    const byId = new Map(serverSorted.map((i) => [i.id, i]));
    const ordered = orderOverride
      .map((id) => byId.get(id))
      .filter((i): i is PlanItem => !!i);
    // 오버라이드에 없는 신규 항목은 뒤에 붙임
    const extras = serverSorted.filter((i) => !orderOverride.includes(i.id));
    return [...ordered, ...extras];
  }, [serverSorted, orderOverride]);

  const totalCost = items.reduce((sum, item) => sum + item.estimatedCost, 0);
  const placeCount = items.filter((i) => i.latitude).length;

  // 좌표가 있는 항목만 순서대로 지도 마커로 변환
  const mapMarkers = useMemo(
    () =>
      items
        .filter(
          (i): i is PlanItem & { latitude: number; longitude: number } =>
            i.latitude != null && i.longitude != null,
        )
        .map((i, idx) => ({
          lat: i.latitude,
          lng: i.longitude,
          label: i.placeName || i.title,
          order: idx + 1,
        })),
    [items],
  );

  // itemId → 동선 순번(1부터). 좌표가 있는 항목만 번호를 갖는다.
  const routeOrderById = useMemo(() => {
    const map: Record<string, number> = {};
    let n = 0;
    for (const i of items) {
      if (i.latitude != null && i.longitude != null) {
        n += 1;
        map[i.id] = n;
      }
    }
    return map;
  }, [items]);

  // 마커들을 순서대로 이은 직선 이동거리 합(km). 실제 도로거리는 아님(근사).
  const routeDistanceKm = useMemo(() => {
    let sum = 0;
    for (let i = 1; i < mapMarkers.length; i++) {
      sum += haversineKm(mapMarkers[i - 1], mapMarkers[i]);
    }
    return sum;
  }, [mapMarkers]);

  // 슬라이드 패널 state
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const { setEditMode, clearEditMode } = useAppStore();

  // D-day 라벨: 클라이언트에서만 정확한 값 (suppressHydrationWarning으로 처리)
  const dayLabel = getDayLabelFromStart(dayIndex, tripStartDate);
  const [panelForm, setPanelForm] = useState<PlanForm>(EMPTY_FORM);

  function openAddPanel() {
    setEditingItem(null);
    setPanelForm(EMPTY_FORM);
    setPanelOpen(true);
    setEditMode({
      active: true,
      title: `일정 편집 · Day ${dayIndex + 1}`,
      subtitle: editSubtitle,
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
      place: item.placeName ?? '',
      memo: '',
      lat: item.latitude ?? null,
      lng: item.longitude ?? null,
      nights: 1,
    });
    setPanelOpen(true);
    setEditMode({
      active: true,
      title: `일정 편집 · Day ${dayIndex + 1}`,
      subtitle: editSubtitle,
    });
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingItem(null);
    setPanelForm(EMPTY_FORM);
    clearEditMode();
  }

  /** 검색 결과에서 장소를 선택하면 폼에 좌표를 채운다. */
  function handlePlaceSelect(place: SelectedPlace) {
    setPanelForm((f) => ({
      ...f,
      place: place.name,
      lat: place.lat,
      lng: place.lng,
      // 제목이 비어 있으면 장소명을 기본 제목으로 채워준다
      title: f.title || place.name,
    }));
  }

  function handlePanelSave() {
    if (!dayId) return;
    // 이미 저장 중이면 중복 제출 방지
    if (createItemMut.isPending || updateItemMut.isPending) return;
    // 좌표: 지정됐으면 값, 아니면 null(명시적으로 지움)
    const lat = panelForm.lat;
    const lng = panelForm.lng;
    const placeName =
      lat != null && lng != null ? panelForm.place || null : null;

    if (editingItem) {
      updateItemMut.mutate(
        {
          itemId: editingItem.id,
          patch: {
            title: panelForm.title || editingItem.title,
            categoryId: panelForm.categoryId,
            startTime: panelForm.startTime || undefined,
            endTime: panelForm.endTime || undefined,
            estimatedCost: panelForm.estimatedCost,
            latitude: lat,
            longitude: lng,
            placeName,
            memo: panelForm.memo || undefined,
          },
          dayDate,
        },
        { onSuccess: closePanel },
      );
    } else {
      const input = {
        title: panelForm.title || '새 일정',
        categoryId: panelForm.categoryId,
        estimatedCost: panelForm.estimatedCost,
        startTime: panelForm.startTime || undefined,
        endTime: panelForm.endTime || undefined,
        latitude: lat,
        longitude: lng,
        placeName,
        memo: panelForm.memo || undefined,
        sortOrder: items.length,
      };

      // 숙소(stay)는 선택한 숙박 일수만큼 여러 Day에 동시 추가
      const isStay = panelForm.categoryId === 'stay';
      const maxNights = Math.max(1, days.length - dayIndex); // 남은 일수 한도
      const nights = isStay
        ? Math.min(Math.max(1, panelForm.nights), maxNights)
        : 1;

      if (nights <= 1) {
        createItemMut.mutate({ input, dayDate }, { onSuccess: closePanel });
        return;
      }

      // 여러 Day에 생성: dayIndex ~ dayIndex+nights-1
      const targetDays = days.slice(dayIndex, dayIndex + nights);
      void Promise.all(
        targetDays.map((d) =>
          createPlanItem(tripId, d.id, input, d.date || undefined),
        ),
      )
        .then(() => {
          // 관련 Day들의 일정 목록 캐시 무효화
          targetDays.forEach((d) =>
            queryClient.invalidateQueries({
              queryKey: ['plan-items', tripId, d.id],
            }),
          );
          toast.success(`${nights}일간 숙소 일정을 추가했어요`);
          closePanel();
        })
        .catch(() => toast.error('숙소 일정 추가에 실패했어요'));
    }
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[targetIndex]] = [
      newItems[targetIndex],
      newItems[index],
    ];
    setOrderOverride(newItems.map((i) => i.id));
  }

  // dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    setOrderOverride(arrayMove(items, oldIndex, newIndex).map((i) => i.id));
  }

  function deleteItem(id: string) {
    if (confirm('이 일정을 삭제할까요?')) {
      deleteItemMut.mutate(id);
    }
  }

  // 헤더 우측 액션: 날짜별 계획 전용 "+ 항목 추가" 버튼
  useHeaderAction(
    <HeaderActionButton onClick={openAddPanel}>
      <Plus size={16} />
      항목 추가
    </HeaderActionButton>,
    [dayIndex],
  );

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
          {formatDayDate(dayDate)}
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
            <Badge variant="brand" suppressHydrationWarning>
              {dayLabel}
            </Badge>
          </div>

          {items.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-sm text-ink-3">아직 일정이 없습니다</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={openAddPanel}
              >
                <Plus size={14} className="mr-1" />첫 일정 추가하기
              </Button>
            </Card>
          ) : (
            <Card padding="sm" className="bg-brand-tint border-brand-soft">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <SortableTimelineItem
                        key={item.id}
                        item={item}
                        index={index}
                        total={items.length}
                        placeName={item.placeName}
                        routeOrder={routeOrderById[item.id]}
                        onEdit={() => openEditPanel(item)}
                        onMoveUp={() => moveItem(index, 'up')}
                        onMoveDown={() => moveItem(index, 'down')}
                        onDelete={() => deleteItem(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </Card>
          )}

          {/* 예산 경고 (mock) */}
          {items.some((i) => i.categoryId === 'shop') && (
            <div className="flex items-start gap-2 rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger-text">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>
                쇼핑 예산이 이미 초과 상태(113%)예요. 신사이바시 일정의 지출에
                주의하세요.
              </span>
            </div>
          )}

          {/* 일정 추가 버튼 */}
          <Button
            variant="secondary"
            fullWidth
            className="border-dashed"
            onClick={openAddPanel}
          >
            <Plus size={14} className="mr-1.5" />
            Day {dayIndex + 1} 일정 추가
          </Button>
        </div>

        {/* 우: 지도 · 동선 (카카오맵) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">지도 · 동선</h2>
            {mapMarkers.length > 0 && (
              <span className="text-xs text-ink-3">
                위치 지정 {mapMarkers.length}곳
              </span>
            )}
          </div>

          <KakaoMap
            height={420}
            markers={mapMarkers}
            showRoute={mapMarkers.length >= 2}
          />

          {mapMarkers.length === 0 ? (
            <p className="rounded-sm border border-dashed border-surface-line bg-surface-bg-alt px-4 py-3 text-center text-xs text-ink-3">
              일정 항목에 장소를 지정하면 타임라인 순서대로 지도에 동선이
              그려져요.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-sm border border-surface-line bg-surface-card p-4 text-center">
                <p className="text-xs text-ink-3">총 이동 거리</p>
                <p className="mt-1 text-lg font-bold text-ink">
                  {mapMarkers.length >= 2
                    ? `약 ${routeDistanceKm.toFixed(1)}km`
                    : '-'}
                </p>
              </div>
              <div className="rounded-sm border border-surface-line bg-surface-card p-4 text-center">
                <p className="text-xs text-ink-3">위치 지정</p>
                <p className="mt-1 text-lg font-bold text-ink">
                  {mapMarkers.length}곳
                </p>
              </div>
            </div>
          )}
          {mapMarkers.length >= 2 && (
            <p className="text-center text-[11px] text-ink-3">
              * 직선 거리 기준 근사값입니다.
            </p>
          )}
        </div>
      </div>

      {/* 슬라이드 패널: 일정 항목 편집 */}
      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editingItem ? `일정 항목 편집` : '일정 항목 추가'}
      >
        <div className="space-y-5">
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
                    'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors',
                    panelForm.categoryId === cat.id
                      ? 'border-brand bg-brand text-on-brand'
                      : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt',
                  )}
                >
                  <CategoryIcon id={cat.id} size={14} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 숙박 일수 (숙소 카테고리 + 신규 추가일 때만) */}
          {panelForm.categoryId === 'stay' && !editingItem && (
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-2">
                숙박 일수
              </label>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  { length: Math.max(1, days.length - dayIndex) },
                  (_, i) => i + 1,
                ).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPanelForm((f) => ({ ...f, nights: n }))}
                    className={cn(
                      'rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors',
                      panelForm.nights === n
                        ? 'border-brand bg-brand text-on-brand'
                        : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt',
                    )}
                  >
                    {n === 1 ? '이 날만' : `${n}일 연속`}
                  </button>
                ))}
              </div>
              {panelForm.nights > 1 && (
                <p className="mt-1.5 text-xs text-ink-3">
                  Day {dayIndex + 1}부터 {dayIndex + panelForm.nights}까지 같은
                  숙소가 추가돼요.
                </p>
              )}
            </div>
          )}

          {/* 제목 */}
          <Input
            label="제목"
            placeholder="일정 이름"
            value={panelForm.title}
            onChange={(e) =>
              setPanelForm((f) => ({ ...f, title: e.target.value }))
            }
          />

          {/* 장소 검색 (카카오) */}
          <div>
            <PlaceSearch
              label="장소"
              defaultKeyword={panelForm.place}
              onSelect={handlePlaceSelect}
            />
            {panelForm.lat != null && panelForm.lng != null ? (
              <>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-2">
                  <MapPin size={13} className="shrink-0 text-brand" />
                  <span className="truncate">
                    {panelForm.place || '선택한 위치'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPanelForm((f) => ({ ...f, lat: null, lng: null }))
                    }
                    className="ml-auto shrink-0 text-ink-3 hover:text-danger-text"
                  >
                    좌표 지우기
                  </button>
                </div>
                {/* 미니맵 미리보기 */}
                <KakaoMap
                  className="mt-2"
                  height={140}
                  markers={[
                    {
                      lat: panelForm.lat,
                      lng: panelForm.lng,
                      label: panelForm.place || undefined,
                    },
                  ]}
                />
              </>
            ) : (
              <div className="mt-2 flex h-32 items-center justify-center rounded-sm border border-dashed border-surface-line bg-surface-bg-alt text-xs text-ink-3">
                <MapPin size={16} className="mr-1 text-brand opacity-50" />
                장소를 검색해 위치를 지정하세요
              </div>
            )}
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
            <span className="mt-1 inline-flex items-center gap-1 rounded-xs border border-dashed border-surface-line-strong px-2 py-0.5 text-xs text-ink-3">
              <CircleDollarSign size={12} />
              다중통화 [TODO]
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
            <Button
              fullWidth
              onClick={handlePanelSave}
              disabled={createItemMut.isPending || updateItemMut.isPending}
            >
              {createItemMut.isPending || updateItemMut.isPending
                ? '저장 중...'
                : editingItem
                  ? '저장'
                  : '추가'}
            </Button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}

function SortableTimelineItem({
  item,
  index,
  total,
  placeName,
  routeOrder,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  item: PlanItem;
  index: number;
  total: number;
  placeName?: string;
  routeOrder?: number;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xs bg-surface-card px-3 py-2.5 shadow-sm cursor-pointer hover:ring-1 hover:ring-brand/30 transition-all"
      onClick={onEdit}
    >
      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-ink-3 hover:text-ink-2 active:cursor-grabbing touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      {/* 카테고리 아이콘 + (좌표 있으면) 작은 동선 순번 배지 겹침 */}
      <span className="relative shrink-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-surface-bg-alt text-ink-2">
          <CategoryIcon id={item.categoryId} size={18} />
        </span>
        {routeOrder != null && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-surface-card bg-brand px-1 text-[10px] font-bold text-on-brand"
            title="지도 동선 순번"
          >
            {routeOrder}
          </span>
        )}
      </span>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{item.title}</p>
        <p className="text-xs text-ink-3">
          <Badge
            variant="category"
            category={
              item.categoryId as
                'stay' | 'move' | 'food' | 'tour' | 'shop' | 'etc'
            }
            className="mr-1"
          >
            {CATEGORIES.find((c) => c.id === item.categoryId)?.label}
          </Badge>
          · {placeName || (item.latitude ? '위치 지정됨' : '장소 미정')}
          {item.endTime &&
            item.startTime &&
            ` · 약 ${getTimeDiff(item.startTime, item.endTime)}`}
        </p>
      </div>

      {/* 비용 + 시간 */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-ink">
          {item.estimatedCost > 0 ? formatKRW(item.estimatedCost) : '₩0'}
        </p>
        <p className="text-xs text-ink-3">
          {item.startTime || '--:--'}
          {item.endTime && `~${item.endTime}`}
        </p>
      </div>

      {/* 액션: 위/아래/삭제 */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={index === 0}
          className="flex h-7 w-7 items-center justify-center rounded-xs border border-surface-line text-ink-3 hover:bg-surface-bg-alt disabled:opacity-30 transition-colors"
          aria-label="위로 이동"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={index === total - 1}
          className="flex h-7 w-7 items-center justify-center rounded-xs border border-surface-line text-ink-3 hover:bg-surface-bg-alt disabled:opacity-30 transition-colors"
          aria-label="아래로 이동"
        >
          <ChevronDown size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-xs border border-surface-line text-ink-3 hover:text-danger hover:border-danger transition-colors"
          aria-label="삭제"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function getDayLabelFromStart(dayIdx: number, tripStartDate: string): string {
  const tripStart = new Date(tripStartDate);
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
  if (diffDays > 0) return `D+${diffDays}`;
  return `D${diffDays}`;
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

/** 두 좌표 사이의 직선(대권) 거리(km). */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // 지구 반지름(km)
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** ISO date(YYYY-MM-DD) → "M월 D일 (요일)". 없으면 빈 문자열. */
function formatDayDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const week = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${week[d.getDay()]})`;
}
