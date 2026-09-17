'use client';

/**
 * 일정 추가 전용 페이지 (지도 기반 + 비용 추정).
 *
 * - 좌: 큰 지도. 기존 일정 동선 + 선택한 후보 위치를 함께 표시.
 * - 우: Day 탭 / Day 전체 일정(시간순) / 새 일정 상세 폼.
 * - 하단: Day 요약(항목수·이동·거리·시간·합계) + 신규 반영 미리보기.
 *
 * 편집은 기존 슬라이드 패널 페이지(../[dayIndex])에서 처리한다.
 * 이 페이지는 "추가"에 집중한다.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus,
  MapPin,
  Route,
  Clock,
  Wallet,
  ArrowLeft,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TimeSelect } from '@/components/ui/TimeSelect';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { KakaoMap } from '@/components/map/KakaoMap';
import { PlaceSearch, type SelectedPlace } from '@/components/map/PlaceSearch';
import { CategoryIcon } from '@/lib/category-icons';
import { CATEGORIES } from '@/lib/constants';
import { formatKRW, cn } from '@/lib/utils';
import { toBackendCategory } from '@/lib/category';
import { contentTypeIdForCategory } from '@/lib/api/places';
import { toast } from '@/stores/toast-store';
import { useTrip } from '@/hooks/use-trips';
import {
  useDays,
  usePlanItems,
  useDaySummary,
  useCreatePlanItem,
  useCreatePlanItemsBulk,
  useDeletePlanItem,
} from '@/hooks/use-plan';
import { useEstimatePlaceCost } from '@/hooks/use-places';
import type { PlanItem } from '@/types';

interface AddForm {
  title: string;
  categoryId: string;
  place: string;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  lat: number | null;
  lng: number | null;
  /** 숙소일 때 연속 숙박 일수(이 날 포함). 기본 1. */
  nights: number;
}

const EMPTY_FORM: AddForm = {
  title: '',
  categoryId: 'tour',
  place: '',
  startTime: '12:00', // 기본 낮 12:00
  endTime: '',
  estimatedCost: 0,
  lat: null,
  lng: null,
  nights: 1,
};

export default function PlanAddPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const dayIndex = parseInt(params.dayIndex as string);

  const { data: trip } = useTrip(tripId);
  const tripStartDate = trip?.startDate ?? '';

  const { data: days = [] } = useDays(tripId, tripStartDate || undefined);
  const currentDay = days[dayIndex];
  const dayId = currentDay?.id;
  const dayDate = currentDay?.date || undefined;

  const { data: serverItems = [] } = usePlanItems(tripId, dayId);
  const { data: summary } = useDaySummary(tripId, dayId);
  const createItemMut = useCreatePlanItem(tripId, dayId ?? '');
  const createBulkMut = useCreatePlanItemsBulk(tripId);
  const deleteItemMut = useDeletePlanItem(tripId, dayId ?? '');
  const estimateMut = useEstimatePlaceCost();

  /** 삭제 확인 모달에서 확정 시 실행. */
  function confirmDelete() {
    if (!pendingDelete || deleteItemMut.isPending) return;
    deleteItemMut.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('일정을 삭제했어요');
        setPendingDelete(null);
      },
      onError: () => toast.error('삭제에 실패했어요'),
    });
  }

  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [estimateSource, setEstimateSource] = useState<
    'api' | 'category' | null
  >(null);
  // 삭제 확인 모달 대상 항목 (null이면 닫힘)
  const [pendingDelete, setPendingDelete] = useState<PlanItem | null>(null);

  // 시간순 정렬된 기존 일정
  const sortedItems = useMemo(
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

  // 좌표 있는 항목 → 지도 마커(동선)
  const baseMarkers = useMemo(
    () =>
      sortedItems
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
    [sortedItems],
  );

  // 후보(선택한 신규 장소) 마커를 동선 뒤에 덧붙임
  const markers = useMemo(() => {
    if (form.lat == null || form.lng == null) return baseMarkers;
    return [
      ...baseMarkers,
      {
        lat: form.lat,
        lng: form.lng,
        label: form.place || form.title || '새 장소',
        order: baseMarkers.length + 1,
      },
    ];
  }, [baseMarkers, form.lat, form.lng, form.place, form.title]);

  const currentTotal = summary?.totalEstimated ?? 0;
  const projectedTotal = currentTotal + (form.estimatedCost || 0);
  const remainingDays = Math.max(1, days.length - dayIndex);
  const saving = createItemMut.isPending || createBulkMut.isPending;

  /** 장소 선택 → 폼 채우고 비용 추정 프리필. */
  async function handlePlaceSelect(place: SelectedPlace) {
    setForm((f) => ({
      ...f,
      place: place.name,
      lat: place.lat,
      lng: place.lng,
      title: f.title || place.name,
    }));
    setEstimateSource(null);

    // 카카오 검색 결과는 TourAPI contentId가 없어 카테고리 기반 추정만 시도.
    // (백엔드는 contentId가 유효하지 않으면 카테고리 폴백으로 응답)
    const contentTypeId = contentTypeIdForCategory(
      toBackendCategory(form.categoryId),
    );
    try {
      const est = await estimateMut.mutateAsync({
        contentId: '0',
        contentTypeId,
      });
      if (est.amount != null) {
        setForm((f) => ({ ...f, estimatedCost: est.amount as number }));
        setEstimateSource(est.source);
      }
    } catch {
      // 추정 실패는 조용히 무시 (사용자가 직접 입력)
    }
  }

  function buildInput() {
    const lat = form.lat;
    const lng = form.lng;
    const placeName = lat != null && lng != null ? form.place || null : null;
    return {
      title: form.title || form.place || '새 일정',
      categoryId: form.categoryId,
      estimatedCost: form.estimatedCost,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      latitude: lat,
      longitude: lng,
      placeName,
      sortOrder: sortedItems.length,
    };
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEstimateSource(null);
  }

  // 저장 가능 여부: 제목이나 장소 중 하나는 반드시 있어야 함
  const canSave = form.title.trim().length > 0 || form.place.trim().length > 0;

  /** 저장 후 이 페이지에 머무름 (연속 추가). */
  function handleSave(thenClose: boolean) {
    if (!dayId || saving) return;
    if (!canSave) {
      toast.error('제목이나 장소를 입력해 주세요');
      return;
    }
    const input = buildInput();

    // 숙소는 선택한 숙박 일수만큼 여러 Day에 동시 추가 (이 날 ~ 이 날+nights-1)
    const isStay = form.categoryId === 'stay';
    const nights = isStay
      ? Math.min(Math.max(1, form.nights), remainingDays)
      : 1;

    if (nights > 1) {
      const targetDayIds = days
        .slice(dayIndex, dayIndex + nights)
        .map((d) => d.id);
      createBulkMut.mutate(
        { dayIds: targetDayIds, input, dayDate },
        {
          onSuccess: () => {
            toast.success(`${nights}일간 숙소 일정을 추가했어요`);
            afterSave(thenClose);
          },
          onError: () => toast.error('일정 추가에 실패했어요'),
        },
      );
      return;
    }

    createItemMut.mutate(
      { input, dayDate },
      {
        onSuccess: () => {
          toast.success('일정을 추가했어요');
          afterSave(thenClose);
        },
        onError: () => toast.error('일정 추가에 실패했어요'),
      },
    );
  }

  function afterSave(thenClose: boolean) {
    if (thenClose) {
      router.push(`/trip/${tripId}/plan/${dayIndex}`);
    } else {
      resetForm();
    }
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/trip/${tripId}/plan/${dayIndex}`}
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-surface-line text-ink-3 hover:bg-surface-bg-alt"
            aria-label="일정으로 돌아가기"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-ink">일정 추가</h1>
            <p className="text-xs text-ink-3">
              {trip?.title ?? '여행'} · Day {dayIndex + 1}
              {dayDate ? ` · ${dayDate.replace(/-/g, '.')}` : ''} — 지도에서
              장소를 골라 추가하세요
            </p>
          </div>
        </div>
      </div>

      {/* 메인: 좌 지도 / 우 목록+폼 */}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* 좌: 지도 */}
        <div className="space-y-3">
          <KakaoMap
            height={480}
            markers={markers}
            showRoute={markers.length >= 2}
          />
          <p className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <Route size={12} />
            직선거리 기준 근사값입니다. 파란 번호가 방문 순서예요.
          </p>
        </div>

        {/* 우 */}
        <div className="space-y-5">
          {/* Day 탭 */}
          <div className="flex flex-wrap gap-1.5">
            {days.map((day, i) => (
              <Link
                key={day.id}
                href={`/trip/${tripId}/plan/${i}/add`}
                className={cn(
                  'rounded-pill px-3.5 py-1.5 text-sm font-medium transition-all',
                  i === dayIndex
                    ? 'bg-brand text-on-brand'
                    : 'bg-surface-bg-alt text-ink-3 hover:text-ink-2',
                )}
              >
                Day {i + 1}
              </Link>
            ))}
          </div>

          {/* Day 전체 일정(시간순) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                Day {dayIndex + 1} 전체 일정 · 시간순
              </h2>
              <span className="text-xs text-ink-3">{sortedItems.length}건</span>
            </div>
            {sortedItems.length === 0 ? (
              <Card className="py-8 text-center">
                <p className="text-sm text-ink-3">
                  Day {dayIndex + 1}에 등록된 일정이 없어요. 아래에서 첫 일정을
                  추가해 보세요.
                </p>
              </Card>
            ) : (
              <Card padding="sm" className="bg-brand-tint border-brand-soft">
                <ul className="space-y-2">
                  {sortedItems.map((item, idx) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xs bg-surface-card px-3 py-2 shadow-sm"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-on-brand">
                        {idx + 1}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-3">
                        {item.startTime || '--:--'}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-sm font-medium text-ink">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        {item.estimatedCost > 0
                          ? formatKRW(item.estimatedCost)
                          : '₩0'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(item)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-surface-line text-ink-3 transition-colors hover:border-danger hover:text-danger"
                        aria-label={`${item.title} 삭제`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* 새 일정 상세 폼 */}
          <Card className="space-y-4">
            <div className="flex items-center gap-1.5">
              <Plus size={15} className="text-brand" />
              <h2 className="text-sm font-semibold text-ink">새 일정 상세</h2>
            </div>

            {/* 장소 검색 → 비용 프리필 */}
            <div>
              <PlaceSearch
                label="장소"
                defaultKeyword={form.place}
                onSelect={handlePlaceSelect}
              />
              {form.lat != null && form.lng != null && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-2">
                  <MapPin size={13} className="shrink-0 text-brand" />
                  <span className="truncate">
                    {form.place || '선택한 위치'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, lat: null, lng: null }))
                    }
                    className="ml-auto shrink-0 text-ink-3 hover:text-danger-text"
                  >
                    좌표 지우기
                  </button>
                </div>
              )}
            </div>

            {/* 제목 */}
            <Input
              label="제목"
              placeholder="일정 이름"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />

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
                      setForm((f) => ({
                        ...f,
                        categoryId: cat.id,
                        // 숙소가 아니면 숙박 일수 초기화
                        nights: cat.id === 'stay' ? f.nights : 1,
                      }))
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors',
                      form.categoryId === cat.id
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

            {/* 시간 (10분 단위 드롭다운) */}
            <div className="grid grid-cols-2 gap-3">
              <TimeSelect
                label="시작 시간"
                value={form.startTime}
                onChange={(v) => setForm((f) => ({ ...f, startTime: v }))}
              />
              <TimeSelect
                label="종료 시간"
                value={form.endTime}
                onChange={(v) => setForm((f) => ({ ...f, endTime: v }))}
              />
            </div>

            {/* 예상 비용 + 추정 배지 */}
            <div>
              <Input
                label="예상 비용"
                type="number"
                min={0}
                value={form.estimatedCost.toString()}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    estimatedCost: parseInt(e.target.value) || 0,
                  }));
                  setEstimateSource(null);
                }}
              />
              {estimateMut.isPending && (
                <p className="mt-1 text-xs text-ink-3">비용 추정 중...</p>
              )}
              {estimateSource && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-xs border border-dashed border-brand-soft px-2 py-0.5 text-xs text-brand">
                  <Sparkles size={12} />
                  {estimateSource === 'api'
                    ? '관광정보 기반 추정'
                    : '카테고리 기반 추정'}{' '}
                  · 수정 가능
                </span>
              )}
            </div>

            {/* 숙박 일수 (숙소 카테고리 + 남은 날이 2일 이상일 때) */}
            {form.categoryId === 'stay' && remainingDays > 1 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-2">
                  숙박 일수
                </label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: remainingDays }, (_, i) => i + 1).map(
                    (n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, nights: n }))}
                        className={cn(
                          'rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors',
                          form.nights === n
                            ? 'border-brand bg-brand text-on-brand'
                            : 'border-surface-line text-ink-2 hover:bg-surface-bg-alt',
                        )}
                      >
                        {n === 1 ? '이 날만' : `${n}일 연속`}
                      </button>
                    ),
                  )}
                </div>
                {form.nights > 1 && (
                  <p className="mt-1.5 text-xs text-ink-3">
                    Day {dayIndex + 1}부터 {dayIndex + form.nights}까지 같은
                    숙소가 추가돼요.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 하단 요약 바 */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-surface-line bg-surface-card px-5 py-3 shadow-md">
        <span className="flex items-center gap-1.5 text-sm text-ink-2">
          <span className="font-semibold text-ink">
            일정 {summary?.itemCount ?? sortedItems.length}개
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-sm text-ink-2">
          <Route size={14} className="text-ink-3" />
          이동 {summary?.moveCount ?? 0}회 · 약{' '}
          {(summary?.distanceKm ?? 0).toFixed(1)}km
        </span>
        <span className="flex items-center gap-1.5 text-sm text-ink-2">
          <Clock size={14} className="text-ink-3" />약{' '}
          {summary?.durationMin ?? 0}분
        </span>
        <span className="flex items-center gap-1.5 text-sm text-ink-2">
          <Wallet size={14} className="text-ink-3" />
          {formatKRW(currentTotal)}
          {form.estimatedCost > 0 && (
            <>
              <span className="text-ink-3">→</span>
              <span className="font-semibold text-brand">
                {formatKRW(projectedTotal)}
              </span>
            </>
          )}
        </span>

        <div className="ml-auto flex gap-2">
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={saving || !canSave}
          >
            <Plus size={15} />
            저장하고 계속
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || !canSave}
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      {/* 일정 삭제 확인 모달 */}
      <ConfirmModal
        open={pendingDelete !== null}
        title="일정을 삭제할까요?"
        description={
          pendingDelete ? (
            <>
              <b className="text-ink">{pendingDelete.title}</b> 일정이
              삭제됩니다. 되돌릴 수 없어요.
            </>
          ) : undefined
        }
        pending={deleteItemMut.isPending}
        pendingLabel="삭제 중..."
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
