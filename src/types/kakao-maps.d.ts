/**
 * 카카오 지도 JS SDK 최소 타입 선언.
 *
 * 공식 @types 패키지 대신, 이 프로젝트에서 실제로 사용하는 API만 직접 선언한다.
 * (지도 생성 / 좌표 / 마커 / 폴리라인 / 인포윈도우 / bounds / 장소검색 services)
 */

declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
    isEmpty(): boolean;
  }

  interface MapOptions {
    center: LatLng;
    level?: number;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    setLevel(level: number): void;
    setBounds(bounds: LatLngBounds): void;
    relayout(): void;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
    title?: string;
    image?: MarkerImage;
    zIndex?: number;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  interface MarkerImageOptions {
    offset?: Point;
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: MarkerImageOptions);
  }

  interface PolylineOptions {
    path: LatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
    map?: Map;
  }

  class Polyline {
    constructor(options: PolylineOptions);
    setMap(map: Map | null): void;
  }

  interface CustomOverlayOptions {
    position: LatLng;
    content: string | HTMLElement;
    map?: Map;
    yAnchor?: number;
    xAnchor?: number;
    zIndex?: number;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
  }

  function load(callback: () => void): void;

  namespace event {
    function addListener(
      target: object,
      type: string,
      handler: (...args: unknown[]) => void,
    ): void;
  }

  namespace services {
    const Status: {
      OK: 'OK';
      ZERO_RESULT: 'ZERO_RESULT';
      ERROR: 'ERROR';
    };

    type StatusType = 'OK' | 'ZERO_RESULT' | 'ERROR';

    interface PlacesSearchResultItem {
      id: string;
      place_name: string;
      address_name: string;
      road_address_name: string;
      category_name: string;
      phone: string;
      place_url: string;
      x: string; // 경도(lng)
      y: string; // 위도(lat)
    }

    interface Pagination {
      totalCount: number;
      current: number;
      hasNextPage: boolean;
      nextPage(): void;
    }

    interface KeywordSearchOptions {
      page?: number;
      size?: number;
    }

    class Places {
      constructor();
      keywordSearch(
        keyword: string,
        callback: (
          result: PlacesSearchResultItem[],
          status: StatusType,
          pagination: Pagination,
        ) => void,
        options?: KeywordSearchOptions,
      ): void;
    }
  }
}

interface Window {
  kakao: typeof kakao;
}
