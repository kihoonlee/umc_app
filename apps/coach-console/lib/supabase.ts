"use client";

import { createUmcClient, type UmcClient } from "@umc/db";

let client: UmcClient | null = null;

/** 코치 콘솔 browser 클라이언트 (localStorage 세션 — SPA 패턴) */
export function getSupabase(): UmcClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 미설정 — apps/coach-console/.env.local 확인");
  }
  client = createUmcClient(url, key);
  return client;
}
