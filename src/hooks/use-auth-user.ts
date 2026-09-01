import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth-context';

/** 백엔드 기준 현재 로그인 사용자 정보 (users 테이블). */
export function useMe() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: isAuthenticated,
  });
}
