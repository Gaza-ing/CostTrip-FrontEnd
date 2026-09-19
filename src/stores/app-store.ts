import type { ReactNode } from 'react';
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

  /** 편집 패널 상태 */
  editMode: {
    active: boolean;
    title: string;
    subtitle: string;
  };
  setEditMode: (mode: {
    active: boolean;
    title: string;
    subtitle: string;
  }) => void;
  clearEditMode: () => void;

  /** 페이지별 헤더 우측 액션 (사이드바 섹션이 바뀌면 각 페이지가 자신의 액션으로 교체) */
  headerAction: ReactNode | null;
  setHeaderAction: (action: ReactNode | null) => void;

  /** 헤더 검색어 (홈=여행 검색, 알림=알림 검색). 페이지 이동 시 초기화. */
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTripId: null,
  setCurrentTrip: (tripId) => set({ currentTripId: tripId }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  sidebarWidth: 220,
  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  editMode: { active: false, title: '', subtitle: '' },
  setEditMode: (mode) => set({ editMode: mode }),
  clearEditMode: () =>
    set({ editMode: { active: false, title: '', subtitle: '' } }),

  headerAction: null,
  setHeaderAction: (action) => set({ headerAction: action }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
