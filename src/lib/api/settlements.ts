import type { SettlementSummary, Transfer } from '@/types';
import { apiClient } from './client';

/** 정산 현황 조회 (순잔액 + 추천 송금안). 백엔드가 계산해서 돌려준다. */
export function fetchSettlement(tripId: string): Promise<SettlementSummary> {
  return apiClient.get<SettlementSummary>(`/trips/${tripId}/settlement`);
}

/** 정산안 생성 (현 시점 지출 스냅샷 배치 생성). */
export function proposeSettlement(
  tripId: string,
): Promise<{ batchId: string; transfers: Transfer[] }> {
  return apiClient.post<{ batchId: string; transfers: Transfer[] }>(
    `/trips/${tripId}/settlement/propose`,
  );
}

/** 송금 완료 토글. */
export function toggleTransfer(
  tripId: string,
  transferId: string,
): Promise<{ id: string; isSettled: boolean }> {
  return apiClient.patch<{ id: string; isSettled: boolean }>(
    `/trips/${tripId}/settlement/transfers/${transferId}`,
  );
}
