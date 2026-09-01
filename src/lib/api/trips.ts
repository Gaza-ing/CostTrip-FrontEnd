import type { Trip } from '@/types';
import { apiClient } from './client';

/**
 * 백엔드 Trip 응답(camel 변환 후) 형태.
 * 백엔드 필드명/상태값이 프론트 Trip 타입과 일부 다르므로 여기서 정규화한다.
 * - totalBudgetAmount → totalBudget
 * - status 'ongoing' → 'in_progress'
 * - 응답에 updatedAt 없음 → createdAt으로 대체
 */
interface BackendTrip {
  id: string;
  ownerUserId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripTimeZone: string;
  headcount: number;
  totalBudgetAmount: number;
  currencyCode: string;
  status: string;
  coverImageUrl: string | null;
  createdAt: string;
}

function backendStatusToFront(status: string): Trip['status'] {
  if (status === 'ongoing') return 'in_progress';
  if (status === 'completed' || status === 'archived') return 'completed';
  return 'planning';
}

function frontStatusToBackend(status: Trip['status']): string {
  if (status === 'in_progress') return 'ongoing';
  return status; // 'planning' | 'completed'
}

function normalizeTrip(t: BackendTrip): Trip {
  return {
    id: t.id,
    title: t.title,
    destination: t.destination,
    startDate: t.startDate,
    endDate: t.endDate,
    headcount: t.headcount,
    totalBudget: t.totalBudgetAmount,
    currencyCode: t.currencyCode,
    tripTimeZone: t.tripTimeZone,
    status: backendStatusToFront(t.status),
    createdAt: t.createdAt,
    updatedAt: t.createdAt, // 백엔드 응답에 updatedAt 없음
  };
}

/** 여행 목록 조회 (내가 멤버인 여행). */
export async function fetchTrips(): Promise<Trip[]> {
  const data = await apiClient.get<BackendTrip[]>('/trips');
  return data.map(normalizeTrip);
}

/** 여행 단건 조회. */
export async function fetchTrip(tripId: string): Promise<Trip | undefined> {
  const data = await apiClient.get<BackendTrip>(`/trips/${tripId}`);
  return normalizeTrip(data);
}

/** 여행 생성. */
export async function createTrip(
  data: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Trip> {
  const created = await apiClient.post<BackendTrip>('/trips', {
    title: data.title,
    destination: data.destination,
    startDate: data.startDate,
    endDate: data.endDate,
    tripTimeZone: data.tripTimeZone,
    headcount: data.headcount,
    totalBudgetAmount: data.totalBudget,
  });
  return normalizeTrip(created);
}

/** 여행 수정. */
export async function updateTrip(
  tripId: string,
  patch: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Trip> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.destination !== undefined) body.destination = patch.destination;
  if (patch.startDate !== undefined) body.startDate = patch.startDate;
  if (patch.endDate !== undefined) body.endDate = patch.endDate;
  if (patch.headcount !== undefined) body.headcount = patch.headcount;
  if (patch.totalBudget !== undefined)
    body.totalBudgetAmount = patch.totalBudget;
  if (patch.status !== undefined)
    body.status = frontStatusToBackend(patch.status);

  const updated = await apiClient.patch<BackendTrip>(`/trips/${tripId}`, body);
  return normalizeTrip(updated);
}

/** 여행 삭제 (소프트 삭제). */
export async function deleteTrip(tripId: string): Promise<void> {
  await apiClient.delete<void>(`/trips/${tripId}`);
}
