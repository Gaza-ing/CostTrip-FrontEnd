import { createClient } from '@supabase/supabase-js';

/**
 * 브라우저용 Supabase 클라이언트 (싱글톤).
 *
 * - 로그인/회원가입/세션 관리는 이 클라이언트를 통해 이뤄진다.
 * - 백엔드 API 호출 시 필요한 access token(JWT)은 이 클라이언트의
 *   세션에서 꺼내 Authorization 헤더로 전달한다. (lib/api/client.ts)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 환경변수가 없습니다. .env.local에 ' +
      'NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
