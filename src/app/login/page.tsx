'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-ink-3 text-sm">
          불러오는 중...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') || '/home';

  // 이미 로그인 상태면 원래 가려던 곳으로
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [authLoading, isAuthenticated, redirectTo, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace(redirectTo);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
          },
        });
        if (error) throw error;
        // 이메일 확인이 필요한 프로젝트면 session이 null로 온다
        if (!data.session) {
          setInfo('가입 확인 메일을 보냈습니다. 메일 인증 후 로그인하세요.');
          setMode('signin');
        } else {
          router.replace(redirectTo);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '요청을 처리하지 못했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-bg">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-bold text-ink mb-1">CostTrip</h1>
        <p className="text-sm text-ink-3 mb-6">
          {mode === 'signin' ? '로그인' : '회원가입'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <Input
              label="이름"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="표시할 이름"
              autoComplete="name"
            />
          )}
          <Input
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={
              mode === 'signin' ? 'current-password' : 'new-password'
            }
            required
            minLength={6}
          />

          {error && <p className="text-sm text-danger-text">{error}</p>}
          {info && <p className="text-sm text-ink-2">{info}</p>}

          <Button type="submit" fullWidth disabled={submitting}>
            {submitting
              ? '처리 중...'
              : mode === 'signin'
                ? '로그인'
                : '가입하기'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-ink-3">
          {mode === 'signin' ? (
            <button
              type="button"
              className="text-brand hover:underline"
              onClick={() => {
                setMode('signup');
                setError(null);
                setInfo(null);
              }}
            >
              계정이 없으신가요? 회원가입
            </button>
          ) : (
            <button
              type="button"
              className="text-brand hover:underline"
              onClick={() => {
                setMode('signin');
                setError(null);
                setInfo(null);
              }}
            >
              이미 계정이 있으신가요? 로그인
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
