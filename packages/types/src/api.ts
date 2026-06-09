/**
 * 공통 API 응답 봉투 — 상세 기획서 §11.1: 모든 응답은 { data, meta, error }.
 */
export interface ApiMeta {
  /** 커서 기반 페이지네이션 다음 커서 */
  nextCursor?: string | null;
  [key: string]: unknown;
}

export interface ApiError {
  code: string;
  message: string;
  /** 사용자에게 보여줄 한국어 메시지 (글로벌 에러 UX 원칙) */
  userMessage?: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  data: T | null;
  meta?: ApiMeta;
  error: ApiError | null;
}

export function ok<T>(data: T, meta?: ApiMeta): ApiEnvelope<T> {
  return { data, meta, error: null };
}

export function fail(error: ApiError): ApiEnvelope<never> {
  return { data: null, error };
}
