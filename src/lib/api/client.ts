import { supabase } from '@/lib/supabase';
import { keysToCamel, keysToSnake } from './case';

// 환경변수가 없어도 빌드/정적 생성이 실패하지 않도록 기본값을 둔다.
// 실제 API 호출은 올바른 값이 설정돼야 동작한다.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

/** API 요청 실패 시 던지는 에러. status와 서버가 준 detail을 담는다. */
export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown, message?: string) {
    super(message ?? `API 요청 실패 (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  /** 쿼리 파라미터 (camelCase 키 → snake_case로 변환되어 전송) */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** 요청 body (camelCase → snake_case로 변환되어 전송) */
  body?: unknown;
  /** 인증 토큰 없이 호출 (기본은 토큰 자동 첨부) */
  skipAuth?: boolean;
  signal?: AbortSignal;
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      // 쿼리 키도 백엔드 규약(snake_case)에 맞춘다
      const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      url.searchParams.set(snakeKey, String(value));
    }
  }
  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};

  if (!options.skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let bodyInit: BodyInit | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyInit = JSON.stringify(keysToSnake(options.body));
  }

  const response = await fetch(buildUrl(path, options.params), {
    method,
    headers,
    body: bodyInit,
    signal: options.signal,
  });

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const raw = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    // FastAPI는 보통 { detail: ... } 형태로 에러를 준다
    const detail =
      raw && typeof raw === 'object' && 'detail' in raw ? raw.detail : raw;
    const message =
      typeof detail === 'string'
        ? detail
        : `API 요청 실패 (${response.status})`;
    throw new ApiError(response.status, detail, message);
  }

  return keysToCamel<T>(raw);
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
};
