import type { Day } from '@/types';
import { apiClient } from './client';

/**
 * 백엔드 Day 응답: { id, tripId, dayIndex(1-based), memo }
 * 프론트 Day: { id, tripId, dayIndex(0-based), date }
 * - dayIndex는 1-based → 0-based로 변환
 * - date는 백엔드 응답에 없어 tripStartDate 기준으로 채운다(선택)
 */
interface BackendDay {
  id: string;
  tripId: string;
  dayIndex: number;
  memo: string | null;
}

/** 여행 일자 목록. tripStartDate(ISO)를 주면 각 Day의 date를 계산해 채운다. */
export async function fetchDays(
  tripId: string,
  tripStartDate?: string,
): Promise<Day[]> {
  const data = await apiClient.get<BackendDay[]>(`/trips/${tripId}/days`);
  return data.map((d) => {
    const zeroBasedIndex = d.dayIndex - 1;
    let date = '';
    if (tripStartDate) {
      const base = new Date(tripStartDate);
      base.setDate(base.getDate() + zeroBasedIndex);
      date = base.toISOString().slice(0, 10);
    }
    return {
      id: d.id,
      tripId: d.tripId,
      dayIndex: zeroBasedIndex,
      date,
    };
  });
}
