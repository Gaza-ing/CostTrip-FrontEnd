import { useSyncExternalStore } from 'react';

const query = '(min-width: 1024px)';

function subscribe(callback: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(query).matches;
}

function getServerSnapshot() {
  return true; // SSR에서는 데스크톱으로 가정
}

export function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
