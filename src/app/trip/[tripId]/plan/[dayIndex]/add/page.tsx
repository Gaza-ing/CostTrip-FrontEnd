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

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  GripVertical,
  Info,
} from 'lucide-react';
import { PlaceDetailSheet } from '@/components/map/PlaceDetailSheet';
import type { PlaceDetailCard } from '@/lib/api/places';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TimeSelect, type TimeSelectHandle } from '@/components/ui/TimeSelect';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { KakaoMap } from '@/components/map/KakaoMap';
import { PlaceSearch, type SelectedPlace } from '@/components/map/PlaceSearch';
import { CategoryIcon } from '@/lib/category-icons';
import { PLAN_CATEGORIES } from '@/lib/constants';
import { formatKRW, cn } from '@/lib/utils';
import { toPlanCategory } from '@/lib/category';
import {
  contentTypeIdForCategory,
  type CostEstimate,
  type Place,
} from '@/lib/api/places';
import type { PoiMarker } from '@/components/map/KakaoMap';
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
  useUpdatePlanItem,
  useDeletePlanItem,
  useReorderPlanItems,
} from '@/hooks/use-plan';
import {
  type GapSuggestionItem,
  type GapSuggestionGroup,
} from '@/lib/api/plan-items';
import { useEstimatePlaceCost, useNearbyPlaces } from '@/hooks/use-places';
import type { PlanItem } from '@/types';

interface AddForm {
  title: string;
  categoryId: string;
  place: string;
  startTime: string;
  endTime: string;
  estimatedCost: number;
  memo: string;
  lat: number | null;
  lng: number | null;
  /** 숙소일 때 연속 숙박 일수(이 날 포함). 기본 1. */
  nights: number;
}

const EMPTY_FORM: AddForm = {
  title: '',
  categoryId: 'attraction',
  place: '',
  startTime: '', // 비워둠 — 사용자가 필요할 때만 입력(시간 미지정 허용)
  endTime: '',
  estimatedCost: 0,
  memo: '',
  lat: null,
  lng: null,
  nights: 1,
};

export default function PlanAddPage() {
  const params = useParams();
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
  const updateItemMut = useUpdatePlanItem(tripId, dayId ?? '');
  const deleteItemMut = useDeletePlanItem(tripId, dayId ?? '');
  const reorderMut = useReorderPlanItems(tripId, dayId ?? '');
  const estimateMut = useEstimatePlaceCost();
  const nearbyMut = useNearbyPlaces();

  // 마커 클릭 시 열리는 장소 상세 시트의 대상 contentId(null이면 닫힘).
  const [detailContentId, setDetailContentId] = useState<string | null>(null);

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
  // 편집 중인 항목 id(null이면 신규 추가). 인라인 폼이 이 값으로 신규/편집 전환.
  const [editingId, setEditingId] = useState<string | null>(null);
  // PlaceSearch(검색창 내부 상태)를 초기화하기 위한 리마운트 키.
  const [placeSearchKey, setPlaceSearchKey] = useState(0);
  // 폼 영역 참조(편집/추천 시작 시 스크롤 이동용).
  const formRef = useRef<HTMLDivElement>(null);
  // 종료 시간 필드 참조(시작 시간 입력 완료 시 이어서 포커스).
  const endTimeRef = useRef<TimeSelectHandle>(null);
  // "이 지역에서 찾기"로 지도에 뿌린 관광지 후보들.
  const [poiPlaces, setPoiPlaces] = useState<Place[]>([]);
  // 지도 현재 중심 좌표(이 지역 검색 기준). KakaoMap onCenterChanged로 갱신.
  const mapCenterRef = useRef<{ lat: number; lng: number } | null>(null);
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
  // 드래그로 바꾼 순서(id 배열). 없으면 서버 정렬 사용.
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // 일정 리스트 정렬: 드래그로 정한 순서(orderOverride) > sortOrder.
  const sortedItems = useMemo(() => {
    const base = [...serverItems].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!orderOverride) return base;
    const byId = new Map(base.map((i) => [i.id, i]));
    const ordered = orderOverride
      .map((id) => byId.get(id))
      .filter((i): i is PlanItem => !!i);
    const extras = base.filter((i) => !orderOverride.includes(i.id));
    return [...ordered, ...extras];
  }, [serverItems, orderOverride]);

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

  // 지도에 뿌릴 관광지 후보 마커(초록 · 클릭 선택)
  const poiMarkers = useMemo(
    () =>
      poiPlaces.map((p) => ({
        id: p.externalId,
        lat: p.latitude,
        lng: p.longitude,
        label: p.name,
      })),
    [poiPlaces],
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
  const saving =
    createItemMut.isPending ||
    createBulkMut.isPending ||
    updateItemMut.isPending;

  /** 장소 선택 → 폼 채우고 비용 추정 프리필. */
  async function handlePlaceSelect(place: SelectedPlace) {
    // TourAPI 장소면 일정 카테고리를 자동 지정(contentTypeId 우선).
    const planCategory =
      place.source === 'tour'
        ? toPlanCategory({
            contentTypeId: place.contentTypeId,
            unifiedCategory: place.category,
          })
        : null;

    setForm((f) => {
      // 제목이 비었거나 '직전 장소명 그대로'면(=사용자가 직접 안 고침)
      // 새 장소명으로 갱신한다. 사용자가 제목을 커스텀했으면 그대로 둔다.
      const keepTitle = f.title && f.title !== f.place;
      return {
        ...f,
        place: place.name,
        lat: place.lat,
        lng: place.lng,
        title: keepTitle ? f.title : place.name,
        categoryId: planCategory ?? f.categoryId,
        // 새 장소를 고르면 비용 초기화(실측 있으면 아래에서 다시 채움)
        estimatedCost: 0,
      };
    });
    setEstimate(null);
    setHighlighted([]); // 폼에서 새 장소 선택 시 추천 강조 모두 해제

    // TourAPI 장소면 실제 contentId/contentTypeId로 실측 조회.
    // 카카오 폴백 장소는 ID가 없어 관광지(12)로 추정 시도(백엔드가 폴백 응답).
    const contentId = place.source === 'tour' ? place.externalId! : '0';
    const contentTypeId =
      place.source === 'tour' && place.contentTypeId
        ? place.contentTypeId
        : contentTypeIdForCategory(place.category ?? 'sightseeing');

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

  /** "이 지역에서 찾기": 지도 현재 중심 주변 관광지를 조회해 마커로 뿌린다. */
  async function handleSearchThisArea() {
    if (nearbyMut.isPending) return;
    // 지도 중심이 아직 없으면(이동 전) 첫 일정 좌표나 광주 시청 근처를 기본값으로
    const center =
      mapCenterRef.current ??
      (baseMarkers[0]
        ? { lat: baseMarkers[0].lat, lng: baseMarkers[0].lng }
        : { lat: 35.1595, lng: 126.8526 }); // 광주 시청 근처
    try {
      const places = await nearbyMut.mutateAsync({
        lat: center.lat,
        lng: center.lng,
        radius: 3000,
      });
      // 관광지/문화시설 위주로, 이미 담긴 좌표는 제외
      const existing = new Set(
        baseMarkers.map((m) => `${m.lat.toFixed(4)},${m.lng.toFixed(4)}`),
      );
      const filtered = places.filter(
        (p) =>
          p.latitude !== 0 &&
          p.longitude !== 0 &&
          !existing.has(`${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`),
      );
      setPoiPlaces(filtered);
      if (filtered.length === 0) {
        toast.info('이 근처에서 관광지를 찾지 못했어요');
      }
    } catch {
      toast.error('주변 관광지 검색에 실패했어요');
    }
  }

  /**
   * 지도 관광지 마커 클릭 → 장소 상세 시트 열기.
   * (카카오맵 앱 상세와 유사: 사진·개요·요금을 먼저 보고 '일정에 추가')
   * externalId(TourAPI contentId)가 있어야 상세 조회가 가능하다.
   */
  function handlePoiClick(poi: PoiMarker) {
    const place = poiPlaces.find((p) => p.externalId === poi.id);
    if (!place || !place.externalId) return;
    setDetailContentId(place.externalId);
  }

  /**
   * 상세 시트의 "일정에 추가" → 인라인 폼에 프리필.
   * 시트를 닫고, 상세 카드 정보(좌표·카테고리·실측 비용)를 폼에 채운 뒤
   * 폼으로 스크롤한다. 실제 저장은 사용자가 폼에서 확정한다.
   */
  function handleAddFromDetail(card: PlaceDetailCard) {
    setDetailContentId(null);
    setEditingId(null);
    setEstimate(null);
    setHighlighted([]);
    setPlaceSearchKey((k) => k + 1);

    const est = card.costEstimate ?? null;
    const planCategory = toPlanCategory({
      contentTypeId: card.contentTypeId ?? undefined,
      unifiedCategory: card.category,
    });
    // 실측(api) 비용만 자동 프리필. 카테고리 평균은 0원 오인 방지로 제외.
    const prefillCost =
      est && est.source === 'api' && est.amount != null ? est.amount : 0;

    setForm({
      ...EMPTY_FORM,
      title: card.name,
      categoryId: planCategory,
      place: card.name,
      lat: card.latitude ?? null,
      lng: card.longitude ?? null,
      estimatedCost: prefillCost,
    });
    if (est) setEstimate(est);
    scrollToForm();
  }

  /** 추천 장소 상세 보기 → 상세 시트 열기(추천은 contentId를 갖고 있음). */
  function handleShowSuggestionDetail(s: GapSuggestionItem) {
    setDetailContentId(s.externalId);
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

  /** 추천 장소를 인라인 폼(신규)에 채운다. 바로 저장하지 않고 사용자가 확인·저장. */
  function handleAddSuggestion(s: GapSuggestionItem) {
    setEditingId(null);
    setEstimate(null);
    setHighlighted([]);
    setPlaceSearchKey((k) => k + 1);
    setForm({
      ...EMPTY_FORM,
      title: s.name,
      categoryId: toPlanCategory({ unifiedCategory: s.category }),
      place: s.name,
      lat: s.latitude,
      lng: s.longitude,
    });
    // 추천은 TourAPI contentId가 있으니 실측 비용을 바로 조회해 프리필
    const contentTypeId = contentTypeIdForCategory(s.category);
    estimateMut
      .mutateAsync({ contentId: s.externalId, contentTypeId })
      .then((est) => {
        setEstimate(est);
        if (est.source === 'api' && est.amount != null) {
          setForm((f) => ({ ...f, estimatedCost: est.amount as number }));
        }
      })
      .catch(() => {});
    scrollToForm();
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
      memo: form.memo || undefined,
      sortOrder: sortedItems.length,
    };
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEstimate(null);
    setHighlighted([]);
    setPlaceSearchKey((k) => k + 1); // 검색창 초기화(리마운트)
  }

  /** 폼으로 스크롤 이동(편집/추천 시작 시). */
  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** 일정 리스트 드래그로 순서 변경 → 서버에 일괄 저장(reorder API). */
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !dayId) return;
    const oldIndex = sortedItems.findIndex((i) => i.id === active.id);
    const newIndex = sortedItems.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(sortedItems, oldIndex, newIndex);
    setOrderOverride(reordered.map((i) => i.id)); // 낙관적 반영

    try {
      // 최종 순서(id 배열)를 한 번에 보내 sortOrder를 원자적으로 재부여.
      await reorderMut.mutateAsync(reordered.map((i) => i.id));
      setOrderOverride(null); // 서버 정렬(캐시 갱신됨)을 신뢰
    } catch {
      setOrderOverride(null);
      toast.error('순서 저장에 실패했어요');
    }
  }

  /** 편집 취소 → 신규 입력 상태로 복귀. */
  function cancelEdit() {
    setEditingId(null);
    resetForm();
  }

  /** 리스트 항목을 인라인 폼에 채워 편집 모드로 전환. */
  function startEditInline(item: PlanItem) {
    setEditingId(item.id);
    setEstimate(null);
    setHighlighted([]);
    setPlaceSearchKey((k) => k + 1);
    setForm({
      title: item.title,
      categoryId: item.categoryId,
      place: item.placeName ?? '',
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      estimatedCost: item.estimatedCost,
      memo: item.memo ?? '',
      lat: item.latitude ?? null,
      lng: item.longitude ?? null,
      nights: 1,
    });
    scrollToForm();
  }

  // 저장 가능 여부: 제목이나 장소 중 하나는 반드시 있어야 함
  const canSave = form.title.trim().length > 0 || form.place.trim().length > 0;

  /** 저장 후 이 페이지에 머무름 (연속 추가). */
  function handleSave() {
    if (!dayId || saving) return;
    if (!canSave) {
      toast.error('제목이나 장소를 입력해 주세요');
      return;
    }
    const input = buildInput();

    // 편집 모드: 기존 항목 수정(PATCH). 숙박 일수/연속추가는 신규에만 적용.
    if (editingId) {
      if (updateItemMut.isPending) return;
      updateItemMut.mutate(
        {
          itemId: editingId,
          patch: {
            title: input.title,
            categoryId: input.categoryId,
            estimatedCost: input.estimatedCost,
            startTime: input.startTime,
            endTime: input.endTime,
            latitude: input.latitude,
            longitude: input.longitude,
            placeName: input.placeName,
            memo: input.memo,
          },
          dayDate,
        },
        {
          onSuccess: () => {
            toast.success('일정을 수정했어요');
            cancelEdit(); // 편집 종료 → 신규 입력 상태로
          },
          onError: () => toast.error('수정에 실패했어요'),
        },
      );
      return;
    }

    // 숙소는 선택한 숙박 일수만큼 여러 Day에 동시 추가 (이 날 ~ 이 날+nights-1)
    const isStay = form.categoryId === 'lodging';
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
            afterSave();
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
          afterSave();
        },
        onError: () => toast.error('일정 추가에 실패했어요'),
      },
    );
  }

  function afterSave() {
    // 인라인 폼: 신규 추가 후 폼을 비워 다음 입력 준비(페이지에 머문다).
    resetForm();
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
              {dayDate ? ` · ${dayDate.replace(/-/g, '.')}` : ''} — 지도로
              동선을 확인하고 주변 관광지를 찾아 일정을 채워보세요
            </p>
          </div>
        </div>
      </div>

      {/* 메인: 좌 지도 / 우 목록+폼 */}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* 좌: 지도 */}
        <div className="space-y-3">
          <div className="relative">
            <KakaoMap
              height={480}
              markers={markers}
              // 동선(경로·거리)은 기존 일정끼리만 그린다. 추천/새 장소 마커는
              // highlight로 표시돼 KakaoMap이 동선 계산에서 제외한다.
              showRoute={baseMarkers.length >= 2}
              focus={focusPoint}
              poiMarkers={poiMarkers}
              onPoiClick={handlePoiClick}
              onCenterChanged={(c) => {
                mapCenterRef.current = c;
              }}
            />
            {/* 지도 위: 이 지역에서 찾기 */}
            <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
              <button
                type="button"
                onClick={handleSearchThisArea}
                disabled={nearbyMut.isPending}
                className="flex items-center gap-1.5 rounded-pill border border-surface-line bg-surface-card px-3.5 py-1.5 text-xs font-semibold text-ink shadow-md transition-colors hover:bg-surface-bg-alt disabled:opacity-60"
              >
                <MapPin size={13} className="text-brand" />
                {nearbyMut.isPending ? '찾는 중...' : '이 지역에서 관광지 찾기'}
              </button>
            </div>
            {poiPlaces.length > 0 && (
              <button
                type="button"
                onClick={() => setPoiPlaces([])}
                className="absolute right-3 top-3 z-10 rounded-pill border border-surface-line bg-surface-card px-2.5 py-1 text-[11px] text-ink-3 shadow-sm hover:text-ink-2"
              >
                관광지 지우기
              </button>
            )}
          </div>
          <div className="space-y-0.5 px-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
              <MapPin size={13} className="shrink-0 text-brand" />이 지역에서
              관광지 찾기
            </p>
            <p className="text-[11px] leading-relaxed text-ink-3">
              버튼을 누르면 초록 마커로 주변 관광지가 표시돼요. 마커를 누르면
              장소와 예상 비용이 아래 폼에 자동으로 채워집니다.
            </p>
          </div>
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
            onDetail={handleShowSuggestionDetail}
            highlightedIds={highlighted.map((h) => h.externalId)}
            adding={createItemMut.isPending}
          />

          {/* Day 전체 일정(시간순) */}
          <div>
            <div className="mb-2 flex items-center justify-between px-3">
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
                <p className="mb-2 text-[11px] text-ink-3">
                  손잡이를 드래그해 순서를 바꿀 수 있어요. 항목을 누르면
                  편집돼요.
                </p>
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2">
                      {sortedItems.map((item, idx) => (
                        <SortablePlanRow
                          key={item.id}
                          item={item}
                          index={idx}
                          editing={editingId === item.id}
                          onEdit={() => startEditInline(item)}
                          onDelete={() => setPendingDelete(item)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </Card>
            )}
          </div>

          {/* 새 일정 상세 / 편집 (인라인 폼) */}
          <Card ref={formRef} className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Plus size={15} className="text-brand" />
                <h2 className="text-sm font-semibold text-ink">
                  {editingId ? '일정 편집' : '새 일정 상세'}
                </h2>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-xs text-ink-3 hover:text-ink-2"
                >
                  편집 취소
                </button>
              )}
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
                {PLAN_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        categoryId: cat.id,
                        nights: cat.id === 'lodging' ? f.nights : 1,
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
                  setEstimate(null);
                }}
              />
              {estimateMut.isPending ? (
                <p className="mt-1 text-xs text-ink-3">비용 추정 중...</p>
              ) : estimate ? (
                <CostEstimateHint estimate={estimate} />
              ) : null}
            </div>

            {/* 시간 */}
            <div className="grid grid-cols-2 gap-3">
              <TimeSelect
                label="시작 시간"
                value={form.startTime}
                onChange={(v) => setForm((f) => ({ ...f, startTime: v }))}
                onComplete={() => endTimeRef.current?.focusHour()}
              />
              <TimeSelect
                ref={endTimeRef}
                label="종료 시간"
                value={form.endTime}
                onChange={(v) => setForm((f) => ({ ...f, endTime: v }))}
              />
            </div>

            {/* 메모 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-2">
                메모
              </label>
              <textarea
                value={form.memo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, memo: e.target.value }))
                }
                placeholder="참고할 메모 (선택)"
                rows={2}
                className="w-full rounded-sm border border-surface-line bg-surface-card px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
              />
            </div>

            {/* 숙박 일수 (신규 + 숙소 + 남은 날 2일 이상) */}
            {!editingId &&
              form.categoryId === 'lodging' &&
              remainingDays > 1 && (
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

            {/* 폼 액션 */}
            <div className="flex justify-end gap-2 border-t border-surface-line pt-3">
              {editingId ? (
                <>
                  <Button variant="secondary" onClick={cancelEdit}>
                    취소
                  </Button>
                  <Button
                    onClick={() => handleSave()}
                    disabled={saving || !canSave}
                  >
                    {saving ? '저장 중...' : '수정'}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => handleSave()}
                  disabled={saving || !canSave}
                >
                  {saving ? '저장 중...' : '일정 추가'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 하단 요약 바 — 화면 하단 고정(sticky). 폭만 지도 열(좌측)에 맞춘다.
          메인 그리드가 [1.3fr_1fr]이라 지도 열 = 전체의 1.3/2.3 ≈ 56.5%. */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-surface-line bg-surface-card px-5 py-3 shadow-md lg:w-[calc((100%-1.25rem)*1.3/2.3)]">
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
      </div>

      {/* 마커 클릭 장소 상세 시트 */}
      <PlaceDetailSheet
        contentId={detailContentId}
        onClose={() => setDetailContentId(null)}
        onAddToPlan={handleAddFromDetail}
      />

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
 * 드래그 가능한 일정 리스트 행.
 * 왼쪽 손잡이(GripVertical)로만 드래그하고, 본문 클릭은 편집으로 이어진다.
 * (손잡이에 onClick stopPropagation을 두어 드래그와 편집 클릭을 분리)
 */
function SortablePlanRow({
  item,
  index,
  editing,
  onEdit,
  onDelete,
}: {
  item: PlanItem;
  index: number;
  /** 현재 인라인 폼에서 편집 중인 항목인지. true면 카드를 강조 표시. */
  editing: boolean;
  onEdit: () => void;
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
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-xs px-2 py-2 shadow-sm transition-colors',
        editing ? 'bg-brand-tint ring-1 ring-brand' : 'bg-surface-card',
      )}
    >
      {/* 드래그 손잡이 */}
      <span
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none text-ink-3 hover:text-ink-2 active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        aria-label="드래그해 순서 변경"
      >
        <GripVertical size={14} />
      </span>

      {/* 항목 본문 클릭 → 편집 */}
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`${item.title} 편집`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-on-brand">
          {index + 1}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-ink-3">
          {item.startTime || '--:--'}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-medium text-ink">
            {item.title}
          </span>
          {editing && (
            <span className="shrink-0 rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-on-brand">
              편집 중
            </span>
          )}
        </span>
        <span className="shrink-0 text-sm font-semibold text-ink">
          {item.estimatedCost > 0 ? formatKRW(item.estimatedCost) : '₩0'}
        </span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-surface-line text-ink-3 transition-colors hover:border-danger hover:text-danger"
        aria-label={`${item.title} 삭제`}
      >
        <Trash2 size={13} />
      </button>
    </li>
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

/** 추천 응답의 통일 카테고리 → 일정 카테고리 한글 라벨. */
function suggestionCategoryLabel(unifiedCategory: string): string {
  const planId = toPlanCategory({ unifiedCategory });
  return PLAN_CATEGORIES.find((c) => c.id === planId)?.label ?? '기타';
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
  onDetail,
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
  /** 상세 보기(사진·개요·요금 시트 열기). 추천은 contentId를 갖고 있어 조회 가능. */
  onDetail: (s: GapSuggestionItem) => void;
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
              카드를 누르면 지도에서 위치를 볼 수 있어요. &lsquo;상세&rsquo;로
              사진·소개·요금을 확인할 수 있어요.
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
                            'flex items-start gap-2 rounded-sm border px-3 py-2.5 transition-colors',
                            active
                              ? 'border-brand bg-brand-tint'
                              : 'border-surface-line bg-surface-card',
                          )}
                        >
                          {/* 카드 본문 클릭 → 지도에서 위치 강조(토글) */}
                          <button
                            type="button"
                            onClick={() => onHighlight(s)}
                            className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                            aria-pressed={active}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-ink">
                                {s.name}
                              </span>
                              <span className="shrink-0 rounded-pill bg-brand-tint px-1.5 py-0.5 text-[10px] font-medium text-brand">
                                {suggestionCategoryLabel(s.category)}
                              </span>
                            </span>
                            {s.address && (
                              <span className="flex items-start gap-1 text-[11px] text-ink-3">
                                <MapPin size={11} className="mt-0.5 shrink-0" />
                                <span className="truncate">{s.address}</span>
                              </span>
                            )}
                            <span
                              className={cn(
                                'text-[11px]',
                                active ? 'text-brand' : 'text-ink-3',
                              )}
                            >
                              {formatDetour(s.detourKm)}
                              {active
                                ? ' · 지도에 표시 중'
                                : ' · 눌러서 지도 보기'}
                            </span>
                          </button>
                          <div className="mt-0.5 flex shrink-0 flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => onDetail(s)}
                              className="flex items-center gap-1 rounded-xs border border-surface-line px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-bg-alt"
                            >
                              <Info size={12} />
                              상세
                            </button>
                            <button
                              type="button"
                              onClick={() => onAdd(s)}
                              disabled={adding}
                              className="flex items-center gap-1 rounded-xs border border-brand-soft px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-tint disabled:opacity-50"
                            >
                              <Plus size={12} />
                              추가
                            </button>
                          </div>
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
