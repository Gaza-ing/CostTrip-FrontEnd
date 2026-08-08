/**
 * 공통 유틸리티 함수
 */

/** KRW 금액 포맷 (₩1,234,567) */
export function formatKRW(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/** 클래스 조합 (falsy 값 제거) */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
