import { create } from 'zustand';

interface AppState {
  /** 현재 선택된 여행 ID */
  currentTripId: string | null;
  /** 여행 컨텍스트 설정 */
  setCurrentTrip: (tripId: string | null) => void;

  /** 사이드바 열림 상태 (모바일) */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTripId: null,
  setCurrentTrip: (tripId) => set({ currentTripId: tripId }),

  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
