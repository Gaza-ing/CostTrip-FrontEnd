import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api/notifications';

/** 내 알림 목록 조회 */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });
}

/** 알림 하나 읽음 처리 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** 모든 알림 읽음 처리 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
