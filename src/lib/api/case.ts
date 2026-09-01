/**
 * snake_case ↔ camelCase 변환 유틸.
 *
 * 백엔드(FastAPI/Pydantic)는 snake_case로 주고받고,
 * 프론트엔드 타입은 camelCase를 쓰므로 API 경계에서 변환한다.
 *
 * 객체/배열을 재귀적으로 순회하되, Date 등 특수 객체는 그대로 둔다.
 */

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value.constructor === Object || value.constructor === undefined)
  );
}

function convertKeys(
  value: unknown,
  transform: (key: string) => string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, transform));
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[transform(key)] = convertKeys(val, transform);
    }
    return result;
  }
  return value;
}

/** 백엔드 응답(snake_case) → 프론트(camelCase) */
export function keysToCamel<T = unknown>(value: unknown): T {
  return convertKeys(value, toCamel) as T;
}

/** 프론트(camelCase) → 백엔드 요청(snake_case) */
export function keysToSnake<T = unknown>(value: unknown): T {
  return convertKeys(value, toSnake) as T;
}
