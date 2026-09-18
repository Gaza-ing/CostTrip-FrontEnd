import type { PlanItem } from '@/types';
import { apiClient } from './client';
import { toBackendCategory, toFrontCategory } from '@/lib/category';

/**
 * 백엔드 PlanItem 응답(camel 변환 후).
 * 프론트 PlanItem과 필드가 다르므로 매퍼로 정규화한다.
 * - estimatedAmount(백) ↔ estimatedCost(프), null → 0
 * - type(백, 카테고리 key) ↔ categoryId(프, 카테고리 id)
 * - startTime/endTime: 백은 ISO datetime, 프는 "HH:mm" 문자열
 * - latitude/longitude: 백엔드 응답에 없음 → undefined
 */
interface BackendPlanItem {
  id: string;
  dayId: string;
  tripId: string;
  type: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  estimatedAmount: number | null;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  memo: string | null;
  sortOrder: number;
}

/** ISO datetime → "HH:mm" (없으면 undefined) */
function isoToHm(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** "HH:mm" + dayDate(ISO date) → ISO datetime (둘 중 하나라도 없으면 null) */
function hmToIso(hm: string | undefined, dayDate?: string): string | null {
  if (!hm) return null;
  const [h, m] = hm.split(':').map(Number);
  const base = dayDate ? new Date(dayDate) : new Date();
  base.setHours(h ?? 0, m ?? 0, 0, 0);
  return base.toISOString();
}

function normalize(p: BackendPlanItem): PlanItem {
  return {
    id: p.id,
    dayId: p.dayId,
    categoryId: toFrontCategory(p.type),
    title: p.title,
    estimatedCost: p.estimatedAmount ?? 0,
    startTime: isoToHm(p.startTime),
    endTime: isoToHm(p.endTime),
    latitude: p.latitude ?? undefined,
    longitude: p.longitude ?? undefined,
    placeName: p.placeName ?? undefined,
    sortOrder: p.sortOrder,
  };
}

/** 일자별 일정 항목 목록. */
export async function fetchPlanItems(
  tripId: string,
  dayId: string,
): Promise<PlanItem[]> {
  const data = await apiClient.get<BackendPlanItem[]>(
    `/trips/${tripId}/days/${dayId}/items`,
  );
  return data.map(normalize);
}

export interface PlanItemInput {
  title: string;
  categoryId: string;
  estimatedCost?: number;
  startTime?: string; // "HH:mm"
  endTime?: string; // "HH:mm"
  latitude?: number | null;
  longitude?: number | null;
  placeName?: string | null;
  memo?: string;
  sortOrder?: number;
}

/** 일정 항목 추가. dayDate(ISO date)를 주면 시각을 datetime으로 결합한다. */
export async function createPlanItem(
  tripId: string,
  dayId: string,
  input: PlanItemInput,
  dayDate?: string,
): Promise<PlanItem> {
  const created = await apiClient.post<BackendPlanItem>(
    `/trips/${tripId}/days/${dayId}/items`,
    {
      title: input.title,
      type: toBackendCategory(input.categoryId),
      startTime: hmToIso(input.startTime, dayDate),
      endTime: hmToIso(input.endTime, dayDate),
      estimatedAmount: input.estimatedCost ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      placeName: input.placeName ?? null,
      memo: input.memo ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  );
  return normalize(created);
}

/** 일정 항목 수정. */
export async function updatePlanItem(
  tripId: string,
  itemId: string,
  patch: Partial<PlanItemInput>,
  dayDate?: string,
): Promise<PlanItem> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.categoryId !== undefined)
    body.type = toBackendCategory(patch.categoryId);
  if (patch.estimatedCost !== undefined)
    body.estimatedAmount = patch.estimatedCost;
  if (patch.startTime !== undefined)
    body.startTime = hmToIso(patch.startTime, dayDate);
  if (patch.endTime !== undefined)
    body.endTime = hmToIso(patch.endTime, dayDate);
  if (patch.latitude !== undefined) body.latitude = patch.latitude;
  if (patch.longitude !== undefined) body.longitude = patch.longitude;
  if (patch.placeName !== undefined) body.placeName = patch.placeName;
  if (patch.memo !== undefined) body.memo = patch.memo;
  if (patch.sortOrder !== undefined) body.sortOrder = patch.sortOrder;

  const updated = await apiClient.patch<BackendPlanItem>(
    `/trips/${tripId}/items/${itemId}`,
    body,
  );
  return normalize(updated);
}

/** 일정 항목 삭제. */
export async function deletePlanItem(
  tripId: string,
  itemId: string,
): Promise<void> {
  await apiClient.delete<void>(`/trips/${tripId}/items/${itemId}`);
}

/** Day 요약 (일정 추가 페이지 하단 바). */
export interface DaySummary {
  itemCount: number;
  moveCount: number;
  distanceKm: number;
  durationMin: number;
  /**
   * 이동시간 근거:
   * - kakao_driving: 전 구간 자동차 실측
   * - mixed: 일부 구간은 실측, 일부(도로 없는 산·섬 등)는 직선거리 추정
   * - estimate: 전체 직선거리 추정(키 없음 등)
   */
  durationSource?: 'kakao_driving' | 'mixed' | 'estimate';
  totalEstimated: number;
  currency: string;
}

/** 일자 요약: 항목수/이동/거리/시간/합계비용. */
export function fetchDaySummary(
  tripId: string,
  dayId: string,
): Promise<DaySummary> {
  return apiClient.get<DaySummary>(`/trips/${tripId}/days/${dayId}/summary`);
}

/** 동선 사이 추천 후보 하나. */
export interface GapSuggestionItem {
  externalId: string;
  name: string;
  /** 통일 카테고리(sightseeing/food/...) */
  category: string;
  latitude: number;
  longitude: number;
  /** A→후보→B 추가 이동거리(km). 작을수록 동선에서 덜 벗어남. */
  detourKm: number;
  address?: string | null;
  imageUrl?: string | null;
}

/** 한 구간(두 일정 사이)의 추천 묶음. */
export interface GapSuggestionGroup {
  /** 좌표 있는 항목 기준 순번(앞/뒤). */
  fromIndex: number;
  toIndex: number;
  fromTitle: string;
  toTitle: string;
  suggestions: GapSuggestionItem[];
}

export interface GapSuggestionsResponse {
  gaps: GapSuggestionGroup[];
}

/**
 * 동선 사이 관광지 추천.
 * 좌표 있는 항목이 2개 이상일 때, 인접한 두 항목 사이에 들를 만한
 * 관광지를 detour(추가 이동거리) 적은 순으로 제안한다.
 */
export function fetchGapSuggestions(
  tripId: string,
  dayId: string,
): Promise<GapSuggestionsResponse> {
  return apiClient.get<GapSuggestionsResponse>(
    `/trips/${tripId}/days/${dayId}/gap-suggestions`,
  );
}

/** 한 구간의 이동시간. */
export interface RouteLeg {
  durationMin: number;
  /** kakao_driving(자동차 실측) / estimate(직선거리 추정) */
  source: 'kakao_driving' | 'estimate';
}

/**
 * 방문 순서 좌표들의 구간별 자동차 이동시간.
 * 지도에 그린 좌표 순서를 그대로 보내면 인접 구간마다 시간을 돌려준다.
 * (좌표 순서를 프론트가 정하므로 지도 동선과 라벨이 항상 일치)
 */
export function fetchRouteLegs(
  points: { latitude: number; longitude: number }[],
): Promise<{ legs: RouteLeg[] }> {
  return apiClient.post<{ legs: RouteLeg[] }>('/places/route-legs', {
    points,
  });
}

/**
 * 여러 날에 동일 일정 항목을 한번에 추가 ("여러 날에 추가" 토글).
 * 백엔드: POST /trips/{tripId}/days/items:bulk { dayIds, item }
 */
export async function createPlanItemsBulk(
  tripId: string,
  dayIds: string[],
  input: PlanItemInput,
  dayDate?: string,
): Promise<PlanItem[]> {
  const created = await apiClient.post<BackendPlanItem[]>(
    `/trips/${tripId}/days/items:bulk`,
    {
      dayIds,
      item: {
        title: input.title,
        type: toBackendCategory(input.categoryId),
        startTime: hmToIso(input.startTime, dayDate),
        endTime: hmToIso(input.endTime, dayDate),
        estimatedAmount: input.estimatedCost ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        placeName: input.placeName ?? null,
        memo: input.memo ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    },
  );
  return created.map(normalize);
}
