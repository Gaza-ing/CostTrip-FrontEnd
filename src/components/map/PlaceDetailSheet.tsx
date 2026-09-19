'use client';

/**
 * 마커 클릭용 장소 상세 시트.
 *
 * 카카오맵 앱의 장소 상세(사진 갤러리·개요·요금)와 유사한 UX를 우리 TourAPI
 * 데이터로 재현한다. 우측에서 슬라이드로 열리며, 하단 "일정에 추가"로 부모가
 * 신규 일정 폼을 프리필하도록 콜백을 넘긴다.
 *
 * 백엔드 GET /places/detail-card/{contentId}를 usePlaceDetailCard로 조회.
 * 사진/개요/요금은 부가정보라 없을 수 있으니 각 섹션을 조건부로 렌더한다.
 */

import { useEffect } from 'react';
import { X, MapPin, Phone, Clock, Wallet, Plus, Sparkles } from 'lucide-react';
import { cn, formatKRW } from '@/lib/utils';
import { usePlaceDetailCard } from '@/hooks/use-places';
import type { PlaceDetailCard } from '@/lib/api/places';

export interface PlaceDetailSheetProps {
  /** 조회할 TourAPI contentId. null이면 닫힘. */
  contentId: string | null;
  onClose: () => void;
  /** "일정에 추가" 클릭 시 호출. 부모가 폼을 프리필한다. */
  onAddToPlan: (card: PlaceDetailCard) => void;
}

/** HTML 태그를 제거해 순수 텍스트로 만든다(개요·요금 원문 표시용). */
function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
}

/** homepage 필드(<a href> HTML 포함)에서 첫 URL을 추출. */
function extractUrl(homepage?: string | null): string | null {
  if (!homepage) return null;
  const match = homepage.match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0] : null;
}

export function PlaceDetailSheet({
  contentId,
  onClose,
  onAddToPlan,
}: PlaceDetailSheetProps) {
  const open = contentId !== null;
  const { data: card, isLoading, isError } = usePlaceDetailCard(contentId);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const homepageUrl = extractUrl(card?.homepage);
  const overview = card?.overview ? stripHtml(card.overview) : null;
  const useFee = card?.useFee ? stripHtml(card.useFee) : null;
  const useTime = card?.useTime ? stripHtml(card.useTime) : null;
  const est = card?.costEstimate;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/20"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[420px] max-w-[90vw] flex-col border-l border-surface-line bg-surface-card shadow-md transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-label="장소 상세"
      >
        {/* 헤더 */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-surface-line px-5">
          <h2 className="truncate pr-3 text-base font-semibold text-ink">
            {card?.name ?? '장소 상세'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-surface-line text-ink-3 transition-colors hover:bg-surface-bg-alt"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-ink-3">
              장소 정보를 불러오는 중...
            </div>
          ) : isError || !card ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-ink-3">
              <MapPin size={24} className="opacity-50" />
              장소 정보를 불러오지 못했어요.
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* 사진 갤러리 (가로 스크롤) */}
              {card.images.length > 0 ? (
                <div className="flex snap-x gap-2 overflow-x-auto px-5 pt-4">
                  {card.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${src}-${i}`}
                      src={src}
                      alt={`${card.name} 사진 ${i + 1}`}
                      className="h-40 w-60 shrink-0 snap-start rounded-sm object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : card.firstImage ? (
                <div className="px-5 pt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.firstImage}
                    alt={card.name}
                    className="h-44 w-full rounded-sm object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}

              <div className="space-y-4 px-5">
                {/* 주소·연락처 */}
                <div className="space-y-1.5 text-sm text-ink-2">
                  {card.address && (
                    <p className="flex items-start gap-2">
                      <MapPin
                        size={14}
                        className="mt-0.5 shrink-0 text-brand"
                      />
                      <span>{card.address}</span>
                    </p>
                  )}
                  {card.tel && (
                    <p className="flex items-center gap-2">
                      <Phone size={14} className="shrink-0 text-ink-3" />
                      <span>{card.tel}</span>
                    </p>
                  )}
                  {useTime && (
                    <p className="flex items-start gap-2">
                      <Clock size={14} className="mt-0.5 shrink-0 text-ink-3" />
                      <span className="whitespace-pre-line">{useTime}</span>
                    </p>
                  )}
                </div>

                {/* 예상 비용 (실측일 때만 강조) */}
                {est && est.source === 'api' && est.amount != null && (
                  <div className="flex items-center gap-1.5 rounded-sm border border-brand-soft bg-brand-tint px-3 py-2 text-sm text-brand">
                    <Sparkles size={14} className="shrink-0" />
                    <span>
                      관광정보 기준{' '}
                      <b className="font-semibold">
                        {est.amount > 0 ? formatKRW(est.amount) : '무료'}
                      </b>
                      {est.range &&
                        est.range.min !== est.range.max &&
                        est.range.max > 0 && (
                          <span className="text-ink-3">
                            {' '}
                            ({formatKRW(est.range.min)} ~{' '}
                            {formatKRW(est.range.max)})
                          </span>
                        )}
                    </span>
                  </div>
                )}

                {/* 이용요금 원문 */}
                {useFee && (
                  <div>
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                      <Wallet size={13} className="text-ink-3" />
                      이용요금
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">
                      {useFee}
                    </p>
                  </div>
                )}

                {/* 개요 */}
                {overview && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-ink-2">
                      소개
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">
                      {overview}
                    </p>
                  </div>
                )}

                {/* 홈페이지 */}
                {homepageUrl && (
                  <a
                    href={homepageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-brand underline underline-offset-2 hover:text-brand-dark"
                  >
                    홈페이지 방문
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 하단: 일정에 추가 */}
        {card && (
          <div className="shrink-0 border-t border-surface-line p-4">
            <button
              type="button"
              onClick={() => onAddToPlan(card)}
              className="flex w-full items-center justify-center gap-1.5 rounded-sm bg-brand py-2.5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-dark"
            >
              <Plus size={16} />이 장소를 일정에 추가
            </button>
          </div>
        )}
      </div>
    </>
  );
}
