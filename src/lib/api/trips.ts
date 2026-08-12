import type { Trip } from '@/types';
import { mockTrips } from './mock-data';

/**
 * 여행 목록 조회
 * TODO: 실제 API 연동 시 fetch로 교체
 */
export async function fetchTrips(): Promise<Trip[]> {
  // mock: 네트워크 지연 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockTrips;
}

/**
 * 여행 단건 조회
 */
export async function fetchTrip(tripId: string): Promise<Trip | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockTrips.find((t) => t.id === tripId);
}

/**
 * 여행 생성
 */
export async function createTrip(
  data: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Trip> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const newTrip: Trip = {
    ...data,
    id: `trip-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockTrips.push(newTrip);
  return newTrip;
}
