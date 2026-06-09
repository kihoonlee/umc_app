import type { ApiEnvelope } from "@umc/types";
import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8787";

/**
 * apps/api(Hono Worker) 호출 헬퍼 — 세션 토큰 자동 첨부, { data, error } 봉투 해석.
 * 실패는 Error 로 throw (사용자 메시지는 error.userMessage 우선).
 */
export async function callApi<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;

  const res = await fetch(`${API_URL}${path}`, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`서버 응답을 읽지 못했어요. (HTTP ${res.status})`);
  }
  if (envelope.error || !res.ok) {
    throw new Error(envelope.error?.userMessage ?? envelope.error?.message ?? `HTTP ${res.status}`);
  }
  if (envelope.data === null) throw new Error("서버가 빈 응답을 보냈어요.");
  return envelope.data;
}
