import { cn } from '@/lib/utils';

/**
 * 아바타 색상 팔레트 (7색).
 * globals.css 의 member-*, cat-* 토큰과 동일 계열의 hex 값.
 * 색은 저장하지 않고, 시드(이름 또는 id) 해시로 결정론적으로 배정한다.
 * (정렬이 바뀌어도 같은 멤버는 같은 색을 유지)
 */
export const AVATAR_COLORS = [
  '#4c6fff', // member-blue / brand
  '#16a34a', // member-green
  '#f97316', // member-orange
  '#8b5cf6', // member-purple
  '#0ea5e9', // cat-move (sky)
  '#ec4899', // cat-shop (pink)
  '#10b981', // cat-tour (emerald)
] as const;

/** 시드 문자열을 팔레트 인덱스로 변환 (결정론적). */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** 표시 이름에서 이니셜(첫 글자) 추출. 비어 있으면 '?'. */
export function initialOf(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  // 이모지/서러게이트 페어 대응: Array.from 으로 첫 코드포인트
  return Array.from(trimmed)[0].toUpperCase();
}

interface AvatarProps {
  /** 표시 이름 (이니셜 소스) */
  name: string | null | undefined;
  /** 지름(px). 기본 36 */
  size?: number;
  /**
   * 색 결정 시드. 지정하지 않으면 name 을 사용.
   * 멤버는 안정적인 id를 넘기는 것을 권장(이름 변경/중복에도 색 유지).
   */
  colorSeed?: string;
  /** 겹침 표시 등을 위한 테두리 클래스 추가용 */
  className?: string;
  title?: string;
}

/**
 * 이니셜 + 색상 원형 아바타.
 * 사진(photoUrl) 지원은 후속 프로필 편집에서 추가 예정.
 */
export function Avatar({
  name,
  size = 36,
  colorSeed,
  className,
  title,
}: AvatarProps) {
  const initial = initialOf(name);
  const bg = avatarColor(colorSeed ?? name ?? '');
  // 지름에 비례한 폰트 크기 (대략 42%)
  const fontSize = Math.max(10, Math.round(size * 0.42));

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none',
        className,
      )}
      style={{ width: size, height: size, backgroundColor: bg, fontSize }}
      title={title ?? name ?? undefined}
      aria-label={name ?? undefined}
    >
      {initial}
    </span>
  );
}
