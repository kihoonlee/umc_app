import { createUmcClient, type UmcClient } from "@umc/db";

/** service-role 클라이언트 (RLS 우회 — 서버 전용) */
export function serviceClient(env: {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}): UmcClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정 (.dev.vars / secrets)");
  }
  return createUmcClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Authorization: Bearer <jwt> 검증 → user id 반환 (실패 시 null) */
export async function userIdFromAuthHeader(
  db: UmcClient,
  authorization: string | undefined,
): Promise<string | null> {
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/** child 가 해당 보호자(parent) 소유인지 확인 */
export async function assertChildOwner(
  db: UmcClient,
  childId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await db
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("parent_id", userId)
    .maybeSingle();
  return !!data;
}

/** Asia/Seoul 기준 YYYY-MM-DD (아이 학습일 경계는 한국 시간) */
export function seoulDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}
