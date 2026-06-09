import type { UmcClient } from "@umc/db";
import type { ReadAloudResult } from "@umc/types";
import { seoulDate } from "./db";

export interface Reward {
  starsEarned: number; // 1~3 (점수 연동 — 시스템 수치 가이드)
  totalStars: number;
  streakDays: number;
  streakExtended: boolean;
}

/** 점수 → 별 1~3개 (통과 60 / 우수 80 임계) */
export function starsForScore(score: number): number {
  if (score >= 80) return 3;
  if (score >= 60) return 2;
  return 1;
}

/**
 * M1 read-aloud 결과 영속 + 보상 갱신 (service-role).
 * learning_session(당일 재사용) → activity insert → progress 별·streak 갱신.
 */
export async function persistReadAloud(
  db: UmcClient,
  args: {
    childId: string;
    contentId: string | null;
    audioPath: string | null;
    result: ReadAloudResult;
  },
): Promise<Reward> {
  const today = seoulDate();
  const avgScore = args.result.wcr;

  // 1) 오늘 세션 재사용 또는 생성 (일일 학습 = 한 세션)
  const since = `${today}T00:00:00+09:00`;
  const { data: existing } = await db
    .from("learning_session")
    .select("id")
    .eq("child_id", args.childId)
    .gte("started_at", new Date(since).toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionId = existing?.id;
  if (!sessionId) {
    const { data: created, error } = await db
      .from("learning_session")
      .insert({ child_id: args.childId })
      .select("id")
      .single();
    if (error) throw new Error(`learning_session insert 실패: ${error.message}`);
    sessionId = created.id;
  }

  // 2) activity 기록 (mock 채점 detail 포함)
  const { error: actErr } = await db.from("activity").insert({
    session_id: sessionId,
    child_id: args.childId,
    content_id: args.contentId,
    type: "m1_read",
    pronunciation_score: avgScore,
    wcpm: args.result.wcpm,
    detail: {
      ...JSON.parse(JSON.stringify(args.result)),
      audio_path: args.audioPath,
    },
  });
  if (actErr) throw new Error(`activity insert 실패: ${actErr.message}`);

  // 3) progress — 별 적립 + streak (어제→+1 / 오늘 이미→유지 / 그 외→1)
  const { data: prog, error: progErr } = await db
    .from("progress")
    .select("total_stars,streak_days,last_active")
    .eq("child_id", args.childId)
    .single();
  if (progErr) throw new Error(`progress 조회 실패: ${progErr.message}`);

  const starsEarned = starsForScore(avgScore);
  const yesterday = seoulDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  let streak = prog.streak_days;
  let streakExtended = false;
  if (prog.last_active === today) {
    // 오늘 이미 학습 — streak 유지
  } else if (prog.last_active === yesterday) {
    streak += 1;
    streakExtended = true;
  } else {
    streak = 1;
    streakExtended = true;
  }
  const totalStars = prog.total_stars + starsEarned;

  const { error: updErr } = await db
    .from("progress")
    .update({ total_stars: totalStars, streak_days: streak, last_active: today })
    .eq("child_id", args.childId);
  if (updErr) throw new Error(`progress 갱신 실패: ${updErr.message}`);

  return { starsEarned, totalStars, streakDays: streak, streakExtended };
}
