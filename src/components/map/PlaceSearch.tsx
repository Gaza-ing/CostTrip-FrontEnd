'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { loadKakaoMap, hasKakaoKey } from '@/lib/kakao-map';
import {
  searchPlaces,
  contentTypeIdForPlace,
  type Place,
} from '@/lib/api/places';
import { toFrontCategory } from '@/lib/category';
import { CATEGORIES } from '@/lib/constants';

/** 장소 검색으로 선택된 결과. */
export interface SelectedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** 어느 소스에서 골랐는지. tour = 관광공사(실측 요금 조회 가능). */
  source: 'tour' | 'kakao';
  /** TourAPI 장소 고유 ID (source=tour일 때만). 비용 실측 조회에 사용. */
  externalId?: string;
  /** TourAPI 관광타입 (source=tour일 때만). */
  contentTypeId?: string;
  /** 통일 카테고리 (source=tour일 때만). 폼 카테고리 프리필용. */
  category?: string;
}

interface PlaceSearchProps {
  /** 결과 항목을 선택했을 때 호출 */
  onSelect: (place: SelectedPlace) => void;
  /** 검색창 라벨 */
  label?: string;
  /** 검색창 초기값(장소명) */
  defaultKeyword?: string;
}

type SearchState = 'idle' | 'searching' | 'empty' | 'error';

/** 카카오 결과를 SelectedPlace 형태로. */
function kakaoToSelected(
  item: kakao.maps.services.PlacesSearchResultItem,
): SelectedPlace {
  return {
    name: item.place_name,
    address: item.road_address_name || item.address_name,
    lat: parseFloat(item.y),
    lng: parseFloat(item.x),
    source: 'kakao',
  };
}

/** TourAPI Place를 SelectedPlace 형태로. */
function tourToSelected(place: Place): SelectedPlace {
  return {
    name: place.name,
    address: place.address ?? '',
    lat: place.latitude,
    lng: place.longitude,
    source: 'tour',
    externalId: place.externalId,
    contentTypeId: contentTypeIdForPlace(place),
    category: place.category,
  };
}

/** 통일 카테고리 → 한글 라벨 (관광/숙소 등). */
function categoryLabel(backendKey: string): string {
  const frontId = toFrontCategory(backendKey);
  return CATEGORIES.find((c) => c.id === frontId)?.label ?? '기타';
}

/**
 * 장소 검색 컴포넌트 — 관광공사(TourAPI) 우선, 카카오 폴백.
 *
 * - 먼저 백엔드 TourAPI 검색으로 관광지/문화시설/숙박 등을 찾는다.
 *   이 결과는 장소 ID(contentId)를 가지므로 실측 요금을 조회할 수 있다.
 * - TourAPI 결과가 없으면(일반 식당·카페 등) 카카오 지도 검색으로 폴백한다.
 *   카카오 결과는 좌표만 잡고 요금은 카테고리 힌트로 처리된다.
 */
export function PlaceSearch({
  onSelect,
  label = '장소 검색',
  defaultKeyword = '',
}: PlaceSearchProps) {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [tourResults, setTourResults] = useState<Place[]>([]);
  const [kakaoResults, setKakaoResults] = useState<
    kakao.maps.services.PlacesSearchResultItem[]
  >([]);
  const [state, setState] = useState<SearchState>('idle');
  /** 카카오 폴백을 썼는지(안내 문구용). */
  const [usedKakaoFallback, setUsedKakaoFallback] = useState(false);
  const placesRef = useRef<kakao.maps.services.Places | null>(null);
  // 자동완성 debounce 타이머 + 최신 요청만 반영하기 위한 시퀀스 가드.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  /** 카카오 키워드 검색(폴백). 콜백 API를 Promise로 정리. */
  async function kakaoSearch(
    q: string,
  ): Promise<kakao.maps.services.PlacesSearchResultItem[]> {
    if (!hasKakaoKey()) throw new Error('no-kakao-key');
    const kakao = await loadKakaoMap();
    if (!placesRef.current) {
      placesRef.current = new kakao.maps.services.Places();
    }
    return new Promise((resolve) => {
      placesRef.current!.keywordSearch(q, (data, status) => {
        // ZERO_RESULT/ERROR 모두 빈 배열로 정규화(폴백 실패는 empty로 표시)
        resolve(status === kakao.maps.services.Status.OK ? data : []);
      });
    });
  }

  async function runSearch(rawKeyword?: string) {
    const q = (rawKeyword ?? keyword).trim();
    if (!q) return;

    // 이 요청의 시퀀스 번호. 나중에 시작된 요청만 결과를 반영(경쟁조건 방지).
    const seq = ++seqRef.current;
    const isLatest = () => seq === seqRef.current;

    setState('searching');
    setTourResults([]);
    setKakaoResults([]);
    setUsedKakaoFallback(false);

    // 1) TourAPI 우선
    try {
      const tour = await searchPlaces(q);
      if (!isLatest()) return; // 더 최신 검색이 시작됨 → 이 결과는 폐기
      if (tour.length > 0) {
        setTourResults(tour);
        setState('idle');
        return;
      }
    } catch {
      // TourAPI 실패는 조용히 카카오 폴백으로 넘어감
    }
    if (!isLatest()) return;

    // 2) 카카오 폴백
    try {
      const kakao = await kakaoSearch(q);
      if (!isLatest()) return;
      setUsedKakaoFallback(true);
      if (kakao.length > 0) {
        setKakaoResults(kakao);
        setState('idle');
      } else {
        setState('empty');
      }
    } catch (e) {
      if (!isLatest()) return;
      // 카카오 키 없음 등
      setState(
        e instanceof Error && e.message === 'no-kakao-key' ? 'empty' : 'error',
      );
    }
  }

  /** 입력 변경 → debounce 후 자동 검색(2자 이상). 검색 버튼/Enter는 즉시 실행. */
  function handleKeywordChange(next: string) {
    setKeyword(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = next.trim();
    if (q.length < 2) {
      // 2자 미만이면 자동 검색 안 하고 결과 비움
      seqRef.current++; // 진행 중이던 자동검색 결과 무효화
      setTourResults([]);
      setKakaoResults([]);
      setState('idle');
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(q), 400);
  }

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      runSearch();
    }
  }

  /** 선택 확정 시 진행 중 자동검색/타이머를 정리(결과 다시 안 뜨게). */
  function clearSearch(nextKeyword: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    seqRef.current++; // 진행 중 요청 결과 무효화
    setTourResults([]);
    setKakaoResults([]);
    setState('idle');
    setKeyword(nextKeyword);
  }

  function pickTour(place: Place) {
    onSelect(tourToSelected(place));
    clearSearch(place.name);
  }

  function pickKakao(item: kakao.maps.services.PlacesSearchResultItem) {
    onSelect(kakaoToSelected(item));
    clearSearch(item.place_name);
  }

  const hasResults = tourResults.length > 0 || kakaoResults.length > 0;

  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label={label}
            placeholder="장소명 검색 (예: 국립아시아문화전당)"
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => runSearch()}
          disabled={state === 'searching'}
          className="mb-[1px] shrink-0"
        >
          {state === 'searching' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          검색
        </Button>
      </div>

      {state === 'empty' && (
        <p className="mt-2 text-xs text-ink-3">검색 결과가 없어요.</p>
      )}
      {state === 'error' && (
        <p className="mt-2 text-xs text-danger-text">
          검색 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {/* TourAPI 결과 (실측 요금 조회 가능) */}
      {tourResults.length > 0 && (
        <ul className="mt-2 max-h-52 divide-y divide-surface-line overflow-y-auto rounded-sm border border-surface-line bg-surface-card">
          {tourResults.map((place) => (
            <li key={`tour-${place.externalId}`}>
              <button
                type="button"
                onClick={() => pickTour(place)}
                className="flex w-full flex-col gap-1 px-3 py-2.5 text-left hover:bg-surface-bg-alt transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-ink">
                    {place.name}
                  </span>
                  <span className="shrink-0 rounded-pill bg-brand-tint px-1.5 py-0.5 text-[10px] font-medium text-brand">
                    {categoryLabel(place.category)}
                  </span>
                </span>
                {place.address && (
                  <span className="flex items-start gap-1 text-[11px] text-ink-3">
                    <MapPin size={11} className="mt-0.5 shrink-0" />
                    <span className="truncate">{place.address}</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 카카오 폴백 결과 (좌표만) */}
      {kakaoResults.length > 0 && (
        <>
          {usedKakaoFallback && (
            <p className="mt-2 text-[11px] text-ink-3">
              관광정보에 없는 장소예요. 지도 검색 결과를 보여드릴게요(요금은
              직접 입력).
            </p>
          )}
          <ul className="mt-1 max-h-52 divide-y divide-surface-line overflow-y-auto rounded-sm border border-surface-line bg-surface-card">
            {kakaoResults.map((item) => (
              <li key={`kakao-${item.id}`}>
                <button
                  type="button"
                  onClick={() => pickKakao(item)}
                  className="flex w-full flex-col gap-1 px-3 py-2.5 text-left hover:bg-surface-bg-alt transition-colors"
                >
                  <span className="truncate text-sm font-medium text-ink">
                    {item.place_name}
                  </span>
                  <span className="flex items-start gap-1 text-[11px] text-ink-3">
                    <MapPin size={11} className="mt-0.5 shrink-0" />
                    <span className="truncate">
                      {item.road_address_name || item.address_name}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!hasResults &&
        state === 'idle' &&
        keyword.trim().length > 0 &&
        keyword.trim().length < 2 && (
          <p className="mt-2 text-[11px] text-ink-3">
            두 글자 이상 입력하면 장소를 찾아드려요.
          </p>
        )}
    </div>
  );
}
