/**
 * 카카오 지도 JS SDK 로더 (싱글톤).
 *
 * - SDK는 브라우저에서만 로드한다. (SSR 시 no-op)
 * - autoload=false 로 로드한 뒤 `kakao.maps.load(cb)`가 끝나면 resolve 한다.
 * - 장소 검색을 함께 쓰기 위해 `libraries=services` 를 포함한다.
 * - 여러 번 호출해도 스크립트는 한 번만 주입되고 같은 Promise를 공유한다.
 *
 * 키는 NEXT_PUBLIC_KAKAO_MAP_APP_KEY (JavaScript 키)를 사용한다.
 */

const SDK_SRC_BASE = 'https://dapi.kakao.com/v2/maps/sdk.js';

let loadPromise: Promise<typeof kakao> | null = null;

/** 카카오 JavaScript 키가 설정되어 있는지 여부. */
export function hasKakaoKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY);
}

/**
 * 카카오 지도 SDK를 로드하고 `kakao` 전역 객체를 resolve 한다.
 * - 키가 없거나 서버 환경이면 reject.
 */
export function loadKakaoMap(): Promise<typeof kakao> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('카카오 지도는 브라우저에서만 로드됩니다.'),
    );
  }

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  if (!appKey) {
    return Promise.reject(
      new Error(
        'NEXT_PUBLIC_KAKAO_MAP_APP_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요.',
      ),
    );
  }

  // 이미 로드가 끝난 경우 즉시 resolve
  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise<typeof kakao>((resolve, reject) => {
    const existing = document.getElementById(
      'kakao-map-sdk',
    ) as HTMLScriptElement | null;

    const onLoad = () => {
      if (!window.kakao?.maps) {
        reject(
          new Error('카카오 SDK 로드 후에도 kakao.maps 를 찾을 수 없습니다.'),
        );
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao));
    };

    if (existing) {
      // 스크립트 태그는 있으나 아직 로드 중인 경우
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('카카오 SDK 스크립트 로드에 실패했습니다.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.async = true;
    script.src = `${SDK_SRC_BASE}?appkey=${appKey}&autoload=false&libraries=services`;
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener(
      'error',
      () => {
        loadPromise = null; // 재시도 가능하도록 초기화
        reject(new Error('카카오 SDK 스크립트 로드에 실패했습니다.'));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return loadPromise;
}
