import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type UmcClient = SupabaseClient<Database>;

/**
 * 플랫폼 무관 Supabase 클라이언트 팩토리.
 * - Expo(아이/엄마 App): auth.storage 에 AsyncStorage 주입
 * - Next(코치 콘솔): @supabase/ssr 쿠키 핸들러 사용 권장
 * - apps/api(Worker): service-role 키 + persistSession:false
 */
export function createUmcClient(
  url: string,
  key: string,
  options?: SupabaseClientOptions<"public">,
): UmcClient {
  return createClient<Database>(url, key, options);
}
