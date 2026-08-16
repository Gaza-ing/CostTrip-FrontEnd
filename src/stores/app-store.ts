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

  /** 여행 기간 */
  tripStartDate: string;
  tripEndDate: string;
  setTripDates: (startDate: string, endDate: string) => void;

  /** 편집 패널 상태 */
  editMode: {
    active: boolean;
    title: string;
    subtitle: string;
  };
  setEditMode: (mode: { active: boolean; title: string; subtitle: string }) => void;
  clearEditMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTripId: null,
  setCurrentTrip: (tripId) => set({ currentTripId: tripId }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  sidebarWidth: 220,
  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  tripStartDate: '2026-07-10',
  tripEndDate: '2026-07-14',
  setTripDates: (startDate, endDate) =>
    set({ tripStartDate: startDate, tripEndDate: endDate }),

  editMode: { active: false, title: '', subtitle: '' },
  setEditMode: (mode) => set({ editMode: mode }),
  clearEditMode: () =>
    set({ editMode: { active: false, title: '', subtitle: '' } }),
}));
