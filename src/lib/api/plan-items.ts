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
    latitude: undefined,
    longitude: undefined,
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
