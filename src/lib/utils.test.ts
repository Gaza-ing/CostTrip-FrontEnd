import { describe, it, expect } from 'vitest';
import { formatKRW, cn } from './utils';

describe('formatKRW', () => {
  it('양수 금액을 원화 형식으로 포맷한다', () => {
    expect(formatKRW(2400000)).toBe('₩2,400,000');
  });

  it('0원을 포맷한다', () => {
    expect(formatKRW(0)).toBe('₩0');
  });

  it('작은 금액을 포맷한다', () => {
    expect(formatKRW(500)).toBe('₩500');
  });

  it('큰 금액을 포맷한다', () => {
    expect(formatKRW(1000000000)).toBe('₩1,000,000,000');
  });

  it('음수(환불)를 포맷한다', () => {
    expect(formatKRW(-5000)).toBe('₩-5,000');
  });
});

describe('cn', () => {
  it('여러 클래스를 합친다', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('falsy 값을 제거한다', () => {
    expect(cn('a', undefined, null, false, 'b')).toBe('a b');
  });

  it('빈 값만 있으면 빈 문자열을 반환한다', () => {
    expect(cn(undefined, null, false)).toBe('');
  });
});
