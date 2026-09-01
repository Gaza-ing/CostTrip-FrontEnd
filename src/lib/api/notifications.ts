import type { Notification } from '@/types';
import { apiClient } from './client';

/** 내 알림 목록 (최신순). */
export function fetchNotifications(): Promise<Notification[]> {
  return apiClient.get<Notification[]>('/notifications');
}

/** 알림 하나 읽음 처리. */
export function markNotificationRead(
  notificationId: string,
): Promise<{ id: string; isRead: boolean }> {
  return apiClient.patch<{ id: string; isRead: boolean }>(
    `/notifications/${notificationId}/read`,
  );
}

/** 모든 알림 읽음 처리. */
export function markAllNotificationsRead(): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/notifications/read-all');
}
