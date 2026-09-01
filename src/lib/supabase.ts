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

// 환경변수가 없으면 빌드/정적 생성 단계에서 모듈 로드가 실패하지 않도록
// placeholder로 클라이언트를 만든다. 실제 인증 호출은 올바른 값이 있어야 동작한다.
if ((!supabaseUrl || !supabaseAnonKey) && typeof window !== 'undefined') {
  // 브라우저(런타임)에서 값이 비어있으면 개발자에게 경고
  console.error(
    'Supabase 환경변수가 없습니다. .env.local에 ' +
      'NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.',
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
