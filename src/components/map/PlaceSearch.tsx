'use client';

import { useRef, useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { loadKakaoMap, hasKakaoKey } from '@/lib/kakao-map';

/** 장소 검색으로 선택된 결과. */
export interface SelectedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface PlaceSearchProps {
  /** 결과 항목을 선택했을 때 호출 */
  onSelect: (place: SelectedPlace) => void;
  /** 검색창 라벨 */
  label?: string;
  /** 검색창 초기값(장소명) */
  defaultKeyword?: string;
}

/**
 * 카카오 장소 검색(키워드) 컴포넌트.
 *
 * - 키워드로 검색해 결과 목록을 보여주고, 선택하면 좌표를 onSelect로 넘긴다.
 * - 카카오 키가 없으면 검색 기능을 비활성화하고 안내한다.
 */
export function PlaceSearch({
  onSelect,
  label = '장소 검색',
  defaultKeyword = '',
}: PlaceSearchProps) {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [results, setResults] = useState<
    kakao.maps.services.PlacesSearchResultItem[]
  >([]);
  const [state, setState] = useState<'idle' | 'searching' | 'empty' | 'error'>(
    'idle',
  );
  const placesRef = useRef<kakao.maps.services.Places | null>(null);
  const keyMissing = !hasKakaoKey();

  async function runSearch() {
    const q = keyword.trim();
    if (!q) return;
    if (keyMissing) {
      setState('error');
      return;
    }

    setState('searching');
    try {
      const kakao = await loadKakaoMap();
      if (!placesRef.current) {
        placesRef.current = new kakao.maps.services.Places();
      }
      placesRef.current.keywordSearch(q, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          setResults(data);
          setState('idle');
        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
          setResults([]);
          setState('empty');
        } else {
          setResults([]);
          setState('error');
        }
      });
    } catch {
      setState('error');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  }

  function pick(item: kakao.maps.services.PlacesSearchResultItem) {
    onSelect({
      name: item.place_name,
      address: item.road_address_name || item.address_name,
      lat: parseFloat(item.y),
      lng: parseFloat(item.x),
    });
    setResults([]);
    setKeyword(item.place_name);
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label={label}
            placeholder="장소명 검색 (예: 국립아시아문화전당)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            hint={keyMissing ? '카카오 지도 키가 필요합니다' : undefined}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={runSearch}
          disabled={state === 'searching' || keyMissing}
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
          {keyMissing
            ? '카카오 지도 키(NEXT_PUBLIC_KAKAO_MAP_APP_KEY)가 설정되지 않았습니다.'
            : '검색 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.'}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-52 divide-y divide-surface-line overflow-y-auto rounded-sm border border-surface-line bg-surface-card">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => pick(item)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-surface-bg-alt transition-colors"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {item.place_name}
                  </span>
                  <span className="block truncate text-xs text-ink-3">
                    {item.road_address_name || item.address_name}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
