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
  Lightbulb,
  ChevronDown,
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
import { toBackendCategory, toFrontCategory } from '@/lib/category';
import { contentTypeIdForCategory, type CostEstimate } from '@/lib/api/places';
import { toast } from '@/stores/toast-store';
import { useTrip } from '@/hooks/use-trips';
import {
  useDays,
  usePlanItems,
  useDaySummary,
  useGapSuggestions,
  useRouteLegs,
  useCreatePlanItem,
  useCreatePlanItemsBulk,
  useDeletePlanItem,
} from '@/hooks/use-plan';
import type {
  GapSuggestionItem,
  GapSuggestionGroup,
} from '@/lib/api/plan-items';
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

  // 동선 추천 펼침 여부(사용자가 원할 때만 추천 로드).
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 좌표 있는 항목이 2개 이상일 때만 동선 사이 추천을 조회
  const geoItemCount = serverItems.filter(
    (i) => i.latitude != null && i.longitude != null,
  ).length;
  const { data: gapData, isLoading: gapLoading } = useGapSuggestions(
    tripId,
    dayId,
    geoItemCount >= 2 && showSuggestions, // 펼쳤을 때만 로드
  );

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
  // PlaceSearch(검색창 내부 상태)를 초기화하기 위한 리마운트 키.
  // 저장 후 연속 추가 시 검색어/결과가 남지 않도록 증가시킨다.
  const [placeSearchKey, setPlaceSearchKey] = useState(0);
  // 마지막 비용 추정 결과(범위·신뢰도·근거 배지 표시용). null이면 배지 숨김.
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  // 삭제 확인 모달 대상 항목 (null이면 닫힘)
  const [pendingDelete, setPendingDelete] = useState<PlanItem | null>(null);
  // 지도에 강조 표시할 추천 장소들(카드 클릭 시 토글, 여러 개 동시 가능).
  const [highlighted, setHighlighted] = useState<GapSuggestionItem[]>([]);
  // 지도가 마지막으로 포커스(이동)할 좌표. 추천 카드를 켤 때 그 위치로 이동.
  const [focusPoint, setFocusPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

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

  // 동선 좌표 그대로 구간별 이동시간 조회(순서 일치 보장)
  const routePoints = useMemo(
    () => baseMarkers.map((m) => ({ latitude: m.lat, longitude: m.lng })),
    [baseMarkers],
  );
  const { data: routeLegsData } = useRouteLegs(routePoints);

  // 각 동선 마커에 "다음 구간까지 걸리는 시간(분)"을 붙인다.
  // legs[i] = 마커 i → 마커 i+1 구간. 마지막 마커는 다음 구간이 없음.
  const baseMarkersWithLeg = useMemo(() => {
    const legs = routeLegsData?.legs ?? [];
    return baseMarkers.map((m, idx) => ({
      ...m,
      legMinToNext: idx < legs.length ? legs[idx].durationMin : undefined,
    }));
  }, [baseMarkers, routeLegsData]);

  // 동선 뒤에 덧붙일 강조 마커: 선택한 추천 장소들 + 폼에서 선택한 새 장소.
  // highlight:true로 표시해 동선(경로선·거리) 계산에서는 제외한다.
  const markers = useMemo(() => {
    const extra = highlighted.map((h) => ({
      lat: h.latitude,
      lng: h.longitude,
      label: `⭐ ${h.name}`,
      highlight: true,
    }));
    // 폼에서 새 장소를 고른 경우 함께 표시(추천 강조와 별개)
    if (form.lat != null && form.lng != null) {
      extra.push({
        lat: form.lat,
        lng: form.lng,
        label: `⭐ ${form.place || form.title || '새 장소'}`,
        highlight: true,
      });
    }
    return [...baseMarkersWithLeg, ...extra];
  }, [
    baseMarkersWithLeg,
    form.lat,
    form.lng,
    form.place,
    form.title,
    highlighted,
  ]);

  const currentTotal = summary?.totalEstimated ?? 0;
  const projectedTotal = currentTotal + (form.estimatedCost || 0);
  const remainingDays = Math.max(1, days.length - dayIndex);
  const saving = createItemMut.isPending || createBulkMut.isPending;

  /** 장소 선택 → 폼 채우고 비용 추정 프리필. */
  async function handlePlaceSelect(place: SelectedPlace) {
    // TourAPI 장소는 그 카테고리를 폼 카테고리에 반영(사용자가 바꿀 수 있음).
    const frontCategory =
      place.source === 'tour' && place.category
        ? toFrontCategory(place.category)
        : null;

    setForm((f) => ({
      ...f,
      place: place.name,
      lat: place.lat,
      lng: place.lng,
      title: f.title || place.name,
      categoryId: frontCategory ?? f.categoryId,
    }));
    setEstimate(null);
    setHighlighted([]); // 폼에서 새 장소 선택 시 추천 강조 모두 해제

    // TourAPI 장소면 실제 contentId/contentTypeId로 실측 조회.
    // 카카오 폴백 장소는 ID가 없어 카테고리 기반 추정만 시도(백엔드가 폴백 응답).
    const contentId = place.source === 'tour' ? place.externalId! : '0';
    const contentTypeId =
      place.source === 'tour' && place.contentTypeId
        ? place.contentTypeId
        : contentTypeIdForCategory(
            toBackendCategory(frontCategory ?? form.categoryId),
          );

    try {
      const est = await estimateMut.mutateAsync({ contentId, contentTypeId });
      setEstimate(est);
      // 실측(api)만 대표값을 자동 프리필한다. 카테고리 평균 추천(source=category)은
      // "명시적 0원"으로 오인되지 않도록 자동 확정하지 않고 배지로만 제안한다.
      if (est.source === 'api' && est.amount != null) {
        setForm((f) => ({ ...f, estimatedCost: est.amount as number }));
      }
    } catch {
      // 추정 실패는 조용히 무시 (사용자가 직접 입력)
    }
  }

  /** 추천 카드 클릭 → 지도 강조 토글(여러 개 동시 선택 가능). */
  function handleHighlightSuggestion(s: GapSuggestionItem) {
    setHighlighted((cur) => {
      const on = cur.some((h) => h.externalId === s.externalId);
      if (on) return cur.filter((h) => h.externalId !== s.externalId);
      // 새로 켤 때 그 위치로 지도 포커스(같은 좌표 재클릭도 이동하도록 새 객체)
      setFocusPoint({ lat: s.latitude, lng: s.longitude });
      return [...cur, s];
    });
  }

  /** 추천 장소를 이 Day 일정에 바로 추가. */
  function handleAddSuggestion(s: GapSuggestionItem) {
    if (!dayId || createItemMut.isPending) return;
    createItemMut.mutate(
      {
        input: {
          title: s.name,
          categoryId: toFrontCategory(s.category),
          latitude: s.latitude,
          longitude: s.longitude,
          placeName: s.name,
          sortOrder: sortedItems.length,
        },
        dayDate,
      },
      {
        onSuccess: () => {
          toast.success(`'${s.name}'을(를) 일정에 추가했어요`);
          // 추가된 항목은 동선에 편입되므로 강조 목록에서 제거
          setHighlighted((cur) =>
            cur.filter((h) => h.externalId !== s.externalId),
          );
        },
        onError: () => toast.error('추가에 실패했어요'),
      },
    );
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
    setEstimate(null);
    setHighlighted([]);
    setPlaceSearchKey((k) => k + 1); // 검색창 초기화(리마운트)
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
            // 동선(경로·거리)은 기존 일정끼리만 그린다. 추천/새 장소 마커는
            // highlight로 표시돼 KakaoMap이 동선 계산에서 제외한다.
            showRoute={baseMarkers.length >= 2}
            focus={focusPoint}
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

          {/* 동선 사이 관광지 추천 (일정 위에 배치: 추천받고 싶을 때 펼침) */}
          <GapSuggestions
            enabled={geoItemCount >= 2}
            open={showSuggestions}
            onToggle={() => setShowSuggestions((v) => !v)}
            loading={gapLoading}
            gaps={gapData?.gaps ?? []}
            onAdd={handleAddSuggestion}
            onHighlight={handleHighlightSuggestion}
            highlightedIds={highlighted.map((h) => h.externalId)}
            adding={createItemMut.isPending}
          />

          {/* Day 전체 일정(시간순) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                Day {dayIndex + 1} 전체 일정 · 시간순
              </h2>
              <span className="text-xs text-ink-3">
                {sortedItems.length > 0 && '눌러서 편집 · '}
                {sortedItems.length}건
              </span>
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
                      {/* 항목 본문 클릭 → 편집 화면으로 이동 */}
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/trip/${tripId}/plan/${dayIndex}?edit=${item.id}`,
                          )
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        aria-label={`${item.title} 편집`}
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
                      </button>
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
                key={placeSearchKey}
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

            {/* 예상 비용 + 추정 배지 (장소 선택 직후 바로 확인되도록 카테고리 아래 배치) */}
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
                  setEstimate(null);
                }}
              />
              {estimateMut.isPending ? (
                <p className="mt-1 text-xs text-ink-3">비용 추정 중...</p>
              ) : estimate ? (
                <CostEstimateHint estimate={estimate} />
              ) : null}
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
          <Clock size={14} className="text-ink-3" />
          {summary?.durationSource === 'kakao_driving' ||
          summary?.durationSource === 'mixed'
            ? '차로 '
            : ''}
          약 {summary?.durationMin ?? 0}분
          {summary?.durationSource === 'estimate' && (
            <span className="text-[11px] text-ink-3">(추정)</span>
          )}
          {summary?.durationSource === 'mixed' && (
            <span className="text-[11px] text-ink-3">(일부 추정)</span>
          )}
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

/**
 * 비용 추정 힌트 배지 — 정확한 정보만 표시.
 *
 * 관광정보(TourAPI)에 실제 요금이 있을 때만 금액을 보여준다.
 * 카테고리 평균 같은 추측성 값은 노출하지 않는다(부정확한 정보 방지).
 *
 * - 실측 요금 있음(source=api, amount>0): "관광정보 기준 약 ₩3,000" (자동 프리필됨).
 * - 관광정보상 무료(source=api, amount=0): "관광정보 기준 무료".
 * - 그 외(요금 데이터 없음): 담백하게 직접 입력 안내만.
 *
 * 예상 비용 칸은 그 자체로 편집 가능한 입력 필드라, 배지에 "수정 가능" 같은
 * 안내는 붙이지 않는다(중복·혼란 방지). 배지는 금액의 출처만 알려준다.
 */
function CostEstimateHint({ estimate }: { estimate: CostEstimate }) {
  const { source, amount, range } = estimate;
  const rangeLabel =
    range && range.min !== range.max && range.max > 0
      ? `${formatKRW(range.min)} ~ ${formatKRW(range.max)}`
      : null;

  // 실측 요금 있음
  if (source === 'api' && amount != null && amount > 0) {
    return (
      <HintBox tone="brand">
        <Sparkles size={12} />
        <span>
          관광정보 기준 약 <b className="font-semibold">{formatKRW(amount)}</b>
          {rangeLabel && <span className="text-ink-3"> ({rangeLabel})</span>}
        </span>
      </HintBox>
    );
  }

  // 관광정보상 무료
  if (source === 'api' && amount === 0) {
    return (
      <HintBox tone="brand">
        <Sparkles size={12} />
        <span>
          관광정보 기준 <b className="font-semibold">무료</b>
        </span>
      </HintBox>
    );
  }

  // 요금 데이터 없음 → 직접 입력 안내(추측값 노출 안 함)
  return (
    <HintBox tone="muted">
      <span>등록된 요금 정보가 없어요. 예상 비용을 직접 입력해 주세요.</span>
    </HintBox>
  );
}

/** 힌트 배지 공통 박스. */
function HintBox({
  tone,
  children,
}: {
  tone: 'brand' | 'muted';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'mt-1.5 inline-flex items-center gap-1 rounded-xs border border-dashed px-2 py-0.5 text-xs',
        tone === 'brand'
          ? 'border-brand-soft text-brand'
          : 'border-surface-line text-ink-3',
      )}
    >
      {children}
    </span>
  );
}

/** detour(추가 이동거리, km)를 사람이 읽기 좋게. */
function formatDetour(km: number): string {
  if (km <= 0.05) return '동선 위';
  if (km < 1) return `+${Math.round(km * 1000)}m`;
  return `+${km.toFixed(1)}km`;
}

/** 백엔드 카테고리 키 → 한글 라벨. */
function suggestionCategoryLabel(backendKey: string): string {
  const frontId = toFrontCategory(backendKey);
  return CATEGORIES.find((c) => c.id === frontId)?.label ?? '기타';
}

/**
 * 동선 사이 관광지 추천 섹션.
 * 인접한 두 일정(A→B) 사이에 들를 만한 곳을 detour 적은 순으로 보여준다.
 */
function GapSuggestions({
  enabled,
  open,
  onToggle,
  loading,
  gaps,
  onAdd,
  onHighlight,
  highlightedIds,
  adding,
}: {
  /** 좌표 있는 일정이 2개 이상이라 추천이 가능한 상태인지 */
  enabled: boolean;
  /** 펼침 여부 */
  open: boolean;
  onToggle: () => void;
  loading: boolean;
  gaps: GapSuggestionGroup[];
  onAdd: (s: GapSuggestionItem) => void;
  onHighlight: (s: GapSuggestionItem) => void;
  highlightedIds: string[];
  adding: boolean;
}) {
  // 후보가 하나라도 있는 구간만 노출
  const nonEmpty = gaps.filter((g) => g.suggestions.length > 0);

  // 전구 안내 배너(항상 보임). 클릭 시 펼침/접힘 토글.
  return (
    <Card padding="sm" className="border-brand-soft bg-brand-tint/40">
      <button
        type="button"
        onClick={enabled ? onToggle : undefined}
        disabled={!enabled}
        className={cn(
          'flex w-full items-center gap-2 text-left',
          !enabled && 'cursor-default',
        )}
        aria-expanded={open}
      >
        <Lightbulb
          size={16}
          className={cn('shrink-0', enabled ? 'text-brand' : 'text-ink-3')}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">
            동선 사이 가볼 만한 곳 추천
          </span>
          <span className="block text-[11px] text-ink-3">
            {enabled
              ? '두 일정 사이에 들를 만한 관광지를 찾아드려요'
              : '좌표가 있는 일정을 2개 이상 추가하면 추천해드려요'}
          </span>
        </span>
        {enabled && (
          <ChevronDown
            size={16}
            className={cn(
              'shrink-0 text-ink-3 transition-transform',
              open && 'rotate-180',
            )}
          />
        )}
      </button>

      {enabled && open && (
        <div className="mt-3 border-t border-brand-soft pt-3">
          {nonEmpty.length > 0 && (
            <p className="mb-2 text-[11px] text-ink-3">
              카드를 누르면 지도에서 위치를 볼 수 있어요.
            </p>
          )}
          {loading ? (
            <p className="text-sm text-ink-3">주변 관광지를 찾는 중...</p>
          ) : nonEmpty.length === 0 ? (
            <p className="text-sm text-ink-3">
              동선 근처에서 추천할 만한 곳을 찾지 못했어요.
            </p>
          ) : (
            <div className="space-y-3">
              {nonEmpty.map((gap) => (
                <div key={`${gap.fromIndex}-${gap.toIndex}`}>
                  <p className="mb-1.5 text-xs text-ink-3">
                    <b className="text-ink-2">{gap.fromTitle}</b>
                    {' → '}
                    <b className="text-ink-2">{gap.toTitle}</b> 사이
                  </p>
                  <ul className="space-y-1.5">
                    {gap.suggestions.map((s) => {
                      const active = highlightedIds.includes(s.externalId);
                      return (
                        <li
                          key={s.externalId}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xs border px-3 py-2 transition-colors',
                            active
                              ? 'border-brand bg-brand-tint'
                              : 'border-surface-line bg-surface-card',
                          )}
                        >
                          {/* 카드 본문 클릭 → 지도에서 위치 강조(토글) */}
                          <button
                            type="button"
                            onClick={() => onHighlight(s)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                            aria-pressed={active}
                          >
                            <MapPin
                              size={14}
                              className={cn(
                                'shrink-0',
                                active ? 'text-brand' : 'text-ink-3',
                              )}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-medium text-ink">
                                  {s.name}
                                </span>
                                <span className="shrink-0 rounded-pill bg-brand-tint px-1.5 py-0.5 text-[10px] font-medium text-brand">
                                  {suggestionCategoryLabel(s.category)}
                                </span>
                              </span>
                              <span className="text-[11px] text-ink-3">
                                {formatDetour(s.detourKm)}
                                {active
                                  ? ' · 지도에 표시됨'
                                  : ' · 눌러서 위치 보기'}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onAdd(s)}
                            disabled={adding}
                            className="flex shrink-0 items-center gap-1 rounded-xs border border-brand-soft px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-tint disabled:opacity-50"
                          >
                            <Plus size={12} />
                            추가
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
