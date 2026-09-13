import type { Trip } from '@/types';

/**
 * 여행의 "표시 상태"를 날짜 기준으로 파생한다.
 *
 * 백엔드 trip.status 필드(planning/in_progress/completed)는 자동으로
 * 갱신되지 않아 실제 날짜와 어긋날 수 있으므로, 화면 표시·필터는
 * 이 함수(날짜 기준)를 단일 기준으로 사용한다.
 *
 * - completed: trip.status가 completed거나, 종료일이 지난 경우
 * - ongoing: 오늘이 시작일~종료일 사이
 * - planning: 시작일이 아직 오지 않은 경우
 */
export type TripPhase = 'planning' | 'ongoing' | 'completed';

export function getTripPhase(trip: Trip, now: Date = new Date()): TripPhase {
  if (trip.status === 'completed') return 'completed';

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = new Date(trip.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(trip.endDate);
  end.setHours(0, 0, 0, 0);

  if (today < start) return 'planning';
  if (today > end) return 'completed';
  return 'ongoing';
}

/** 표시 상태의 한글 라벨. */
export function tripPhaseLabel(phase: TripPhase): string {
  switch (phase) {
    case 'planning':
      return '예정';
    case 'ongoing':
      return '진행중';
    case 'completed':
      return '완료';
  }
}
