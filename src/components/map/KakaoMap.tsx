'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { loadKakaoMap, hasKakaoKey } from '@/lib/kakao-map';

export interface MapMarker {
  /** 위도 */
  lat: number;
  /** 경도 */
  lng: number;
  /** 마커 라벨 (예: 장소명) */
  label?: string;
  /** 동선 순서 (1부터). 지정 시 번호 배지로 표시 */
  order?: number;
}

interface KakaoMapProps {
  markers: MapMarker[];
  /** 마커들을 순서대로 잇는 동선(폴리라인) 표시 여부 */
  showRoute?: boolean;
  /** 지도 높이(px). 기본 420 */
  height?: number;
  /** 마커가 없을 때 기본 중심 좌표. 기본: 서울시청 */
  defaultCenter?: { lat: number; lng: number };
  className?: string;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }; // 서울시청
const ROUTE_COLOR = '#2563eb';

/**
 * 카카오 지도를 렌더하는 재사용 컴포넌트.
 *
 * - markers: 표시할 좌표 목록. 순서 배지(order)와 라벨(label)을 함께 표시.
 * - showRoute: markers를 순서대로 잇는 동선 폴리라인.
 * - 키가 없거나 로드 실패 시 안내용 fallback UI를 보여준다.
 */
export function KakaoMap({
  markers,
  showRoute = false,
  height = 420,
  defaultCenter = DEFAULT_CENTER,
  className,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  // 지도에 그린 오버레이(마커/라벨/폴리라인)를 정리하기 위한 참조
  const overlaysRef = useRef<
    Array<{ setMap: (m: kakao.maps.Map | null) => void }>
  >([]);
  // 키 존재 여부는 순수 계산이므로 렌더 시점에 파생값으로 구한다.
  const keyMissing = !hasKakaoKey();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorReason, setErrorReason] = useState<string>('');

  // 1) SDK 로드 + 지도 인스턴스 1회 생성 (키가 있을 때만)
  useEffect(() => {
    if (keyMissing) return;

    let cancelled = false;
    loadKakaoMap()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
          level: 5,
        });
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorReason(msg);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // defaultCenter는 최초 1회만 사용 (의존성에서 제외)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyMissing]);

  // 2) markers/showRoute 변경 시 오버레이 다시 그리기
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.kakao?.maps) return;
    const { kakao } = window;
    const map = mapRef.current;

    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    if (markers.length === 0) {
      map.setCenter(
        new kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
      );
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();
    const path: kakao.maps.LatLng[] = [];

    markers.forEach((m) => {
      const pos = new kakao.maps.LatLng(m.lat, m.lng);
      path.push(pos);
      bounds.extend(pos);

      const marker = new kakao.maps.Marker({ position: pos, map });
      overlaysRef.current.push(marker);

      // 순서 배지 + 라벨 오버레이
      if (m.order != null || m.label) {
        const badge =
          m.order != null
            ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-right:4px;border-radius:9px;background:${ROUTE_COLOR};color:#fff;font-size:11px;font-weight:700;">${m.order}</span>`
            : '';
        const label = m.label
          ? `<span style="font-size:11px;font-weight:600;color:#1f2937;">${escapeHtml(
              m.label,
            )}</span>`
          : '';
        const content = `<div style="transform:translateY(-6px);display:inline-flex;align-items:center;white-space:nowrap;background:#fff;border:1px solid #e5e7eb;border-radius:9999px;padding:2px 8px 2px 4px;box-shadow:0 1px 3px rgba(0,0,0,0.12);">${badge}${label}</div>`;
        const overlay = new kakao.maps.CustomOverlay({
          position: pos,
          content,
          yAnchor: 2.1,
          map,
        });
        overlaysRef.current.push(overlay);
      }
    });

    // 동선 폴리라인 + 구간별 거리 라벨
    if (showRoute && path.length >= 2) {
      const polyline = new kakao.maps.Polyline({
        path,
        strokeWeight: 3,
        strokeColor: ROUTE_COLOR,
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
        map,
      });
      overlaysRef.current.push(polyline);

      // 각 구간(마커 i → i+1) 중점에 직선 거리 라벨 표시
      for (let i = 1; i < markers.length; i++) {
        const a = markers[i - 1];
        const b = markers[i];
        const km = haversineKm(a, b);
        const distText =
          km >= 1 ? `${km.toFixed(1)}km` : `${Math.round(km * 1000)}m`;
        const midLat = (a.lat + b.lat) / 2;
        const midLng = (a.lng + b.lng) / 2;
        const seg = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(midLat, midLng),
          content: `<div style="transform:translateY(-50%);white-space:nowrap;background:${ROUTE_COLOR};color:#fff;border-radius:9999px;padding:1px 7px;font-size:10px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,0.2);">${distText}</div>`,
          yAnchor: 0.5,
          xAnchor: 0.5,
          map,
        });
        overlaysRef.current.push(seg);
      }
    }

    // 뷰포트 맞춤
    if (markers.length === 1) {
      map.setCenter(new kakao.maps.LatLng(markers[0].lat, markers[0].lng));
      map.setLevel(4);
    } else if (!bounds.isEmpty()) {
      map.setBounds(bounds);
    }
  }, [markers, showRoute, status, defaultCenter]);

  if (keyMissing || status === 'error') {
    const message = keyMissing
      ? '카카오 지도 키(NEXT_PUBLIC_KAKAO_MAP_APP_KEY)가 설정되지 않았습니다. .env.local 설정 후 서버를 재시작하세요.'
      : errorReason ||
        '카카오 지도 SDK 로드에 실패했습니다. 카카오 콘솔의 Web 플랫폼 도메인 등록을 확인하세요.';
    return (
      <div
        className={`relative flex flex-col items-center justify-center rounded-md border border-surface-line bg-surface-bg-alt text-ink-3 ${className ?? ''}`}
        style={{ height }}
      >
        <AlertCircle size={28} className="mb-2 text-ink-3 opacity-60" />
        <p className="text-sm font-medium">지도를 불러올 수 없어요</p>
        <p className="mt-1 px-6 text-center text-xs">{message}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-surface-line bg-surface-bg-alt ${className ?? ''}`}
      style={{ height }}
    >
      <div ref={containerRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-bg-alt text-ink-3">
          <MapPin
            size={28}
            className="mb-2 animate-pulse text-brand opacity-60"
          />
          <p className="text-xs">지도 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}

/** 오버레이 content에 넣는 문자열의 HTML 특수문자 이스케이프 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 두 좌표 사이의 직선(대권) 거리(km). */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
