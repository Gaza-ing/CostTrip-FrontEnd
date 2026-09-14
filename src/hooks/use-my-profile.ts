import { useAuth } from '@/lib/auth-context';
import { useMe } from '@/hooks/use-auth-user';

/**
 * 현재 로그인 사용자의 표시용 프로필(이름/이메일/아바타 색)을 한곳에서 제공한다.
 *
 * - 이름/이메일: 백엔드 users(useMe) 우선, 없으면 세션 metadata 폴백
 * - avatarColor: 사용자가 프로필에서 고른 색(Supabase user_metadata.avatar_color).
 *   지정하지 않았으면 undefined → Avatar가 이름 해시로 기본색 결정.
 *
 * 사이드바·설정 등 여러 화면이 같은 값을 쓰게 해 프로필 표시를 일치시킨다.
 */
export function useMyProfile() {
  const { session } = useAuth();
  const { data: me } = useMe();

  const meta = session?.user.user_metadata ?? {};
  const displayName =
    me?.displayName ||
    (meta.display_name as string) ||
    session?.user.email?.split('@')[0] ||
    '사용자';
  const email = me?.email || session?.user.email || '';
  const avatarColor = (meta.avatar_color as string) || undefined;
  // 내 백엔드 user id. member.userId 와 매칭해 "나"인 멤버에 내 색을 씌우는 데 사용.
  const userId = me?.id;

  return { displayName, email, avatarColor, userId };
}
