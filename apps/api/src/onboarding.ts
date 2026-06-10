import type { UmcClient } from "@umc/db";
import { starsForScore } from "./learning";

/** 무료 체험 시작 — 인증 user 에 trialing subscription upsert (7일). 멱등. 결제 미구현, 상태 전용. */
export async function startTrial(db: UmcClient, userId: string) {
  const { data: existing } = await db
    .from("subscription")
    .select("id,status,trial_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { trial: existing, created: false };

  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("subscription")
    .insert({ user_id: userId, plan: "standard", status: "trialing", trial_end: trialEnd })
    .select("id,status,trial_end")
    .single();
  if (error) throw new Error(`subscription 생성 실패: ${error.message}`);
  return { trial: data, created: true };
}

const WELCOME_STICKER = "welcome";

/**
 * 온보딩 완료 — 첫 별 + 첫 스티커 지급 + children.mico_state.onboarded=true. 멱등.
 * 이미 onboarded 면 재지급하지 않고 현재 상태만 반환.
 */
export async function completeOnboarding(db: UmcClient, childId: string) {
  const { data: child, error: cErr } = await db
    .from("children")
    .select("mico_state")
    .eq("id", childId)
    .single();
  if (cErr || !child) throw new Error("자녀 정보를 찾을 수 없어요.");

  const micoState = (child.mico_state as Record<string, unknown> | null) ?? {};
  const alreadyOnboarded = micoState.onboarded === true;

  const { data: prog, error: pErr } = await db
    .from("progress")
    .select("total_stars,streak_days,last_active,stickers")
    .eq("child_id", childId)
    .single();
  if (pErr || !prog) throw new Error("진척 정보를 찾을 수 없어요.");

  if (alreadyOnboarded) {
    return {
      already: true,
      starsEarned: 0,
      totalStars: prog.total_stars,
      sticker: WELCOME_STICKER,
    };
  }

  const starsEarned = starsForScore(100); // 첫 성공 = 3별 축하
  const stickers = Array.isArray(prog.stickers) ? (prog.stickers as string[]) : [];
  const nextStickers = stickers.includes(WELCOME_STICKER)
    ? stickers
    : [...stickers, WELCOME_STICKER];

  const { error: upProg } = await db
    .from("progress")
    .update({ total_stars: prog.total_stars + starsEarned, stickers: nextStickers })
    .eq("child_id", childId);
  if (upProg) throw new Error(`progress 갱신 실패: ${upProg.message}`);

  const { error: upChild } = await db
    .from("children")
    .update({ mico_state: { ...micoState, onboarded: true } })
    .eq("id", childId);
  if (upChild) throw new Error(`mico_state 갱신 실패: ${upChild.message}`);

  return {
    already: false,
    starsEarned,
    totalStars: prog.total_stars + starsEarned,
    sticker: WELCOME_STICKER,
  };
}
