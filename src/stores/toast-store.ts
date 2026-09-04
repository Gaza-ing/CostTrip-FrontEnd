import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  /** 표시 지속 시간(ms). 기본 3000 */
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, type = 'info', duration = 3000) => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random());
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));

    // 자동 제거
    if (duration > 0) {
      setTimeout(() => get().remove(id), duration);
    }
  },

  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/**
 * 컴포넌트 밖(이벤트 핸들러 등)에서도 쉽게 부를 수 있는 헬퍼.
 *   toast.success('저장되었습니다')
 */
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'success', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'error', duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'info', duration),
};
