import { create } from 'zustand';

interface AppState {
  /** 현재 선택된 여행 ID */
  currentTripId: string | null;
  /** 여행 컨텍스트 설정 */
  setCurrentTrip: (tripId: string | null) => void;

  /** 사이드바 열림 상태 */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  /** 사이드바 너비 (px) */
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTripId: null,
  setCurrentTrip: (tripId) => set({ currentTripId: tripId }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  sidebarWidth: 220,
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
}));
