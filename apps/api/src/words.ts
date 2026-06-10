import type { UmcClient } from "@umc/db";
import type { ReadAloudResult } from "@umc/types";
import { seoulDate } from "./db";
import { starsForScore, type Reward } from "./learning";

/** SRS lite 간격 (시스템 수치 가이드): 1일 → 3일 → 7일 → 졸업. 오답 시 1일로 리셋. */
const NEXT_INTERVAL: Record<number, number | "graduated"> = { 1: 3, 3: 7, 7: "graduated" };

function plusDaysSeoul(days: number): string {
  return seoulDate(new Date(Date.now() + days * 86400000));
}

/**
 * M1 채점 결과에서 약점 단어(통과 임계 60 미달) 자동 수집 → word_card (다음날 복습 예약).
 * 이미 카드가 있는 단어는 건너뜀. 실패해도 학습 흐름을 막지 않도록 호출부에서 무시 가능.
 */
export async function collectWeakWords(
  db: UmcClient,
  args: { childId: string; contentId: string | null; result: ReadAloudResult },
): Promise<number> {
  const weak = [
    ...new Set(
      args.result.wordScores
        .filter((w) => w.score < 60)
        .map((w) => w.word.toLowerCase())
        .filter((w) => w.length > 1),
    ),
  ];
  if (weak.length === 0) return 0;

  const { data: existing } = await db
    .from("word_card")
    .select("word")
    .eq("child_id", args.childId)
    .in("word", weak);
  const known = new Set((existing ?? []).map((r) => r.word));
  const fresh = weak.filter((w) => !known.has(w));
  if (fresh.length === 0) return 0;

  const { error } = await db.from("word_card").insert(
    fresh.map((word) => ({
      child_id: args.childId,
      word,
      source_content_id: args.contentId,
      due_date: plusDaysSeoul(1),
      interval_days: 1,
      status: "learning" as const,
    })),
  );
  if (error) throw new Error(`word_card insert 실패: ${error.message}`);
  return fresh.length;
}

/** 카드 채점 — 정답: 1→3→7→졸업, 오답: 1일로 리셋 */
export async function gradeWordCard(
  db: UmcClient,
  args: { cardId: string; childId: string; correct: boolean },
) {
  const { data: card, error } = await db
    .from("word_card")
    .select("id,interval_days,status")
    .eq("id", args.cardId)
    .eq("child_id", args.childId)
    .single();
  if (error || !card) throw new Error("카드를 찾을 수 없어요.");

  let interval = card.interval_days;
  let status: "learning" | "review" | "graduated" = "review";
  let dueDate: string;

  if (args.correct) {
    const next = NEXT_INTERVAL[interval] ?? "graduated";
    if (next === "graduated") {
      status = "graduated";
      dueDate = plusDaysSeoul(365); // 졸업 — 사실상 재출제 없음
      interval = 7;
    } else {
      interval = next;
      dueDate = plusDaysSeoul(next);
    }
  } else {
    interval = 1;
    status = "learning";
    dueDate = plusDaysSeoul(1);
  }

  const { error: upErr } = await db
    .from("word_card")
    .update({ interval_days: interval, status, due_date: dueDate })
    .eq("id", args.cardId);
  if (upErr) throw new Error(`카드 갱신 실패: ${upErr.message}`);
  return { interval, status, dueDate };
}

/** 복습 세션 완료 — word_review activity 기록 + 별 보상(정답률 연동) */
export async function completeWordReview(
  db: UmcClient,
  args: { childId: string; total: number; correct: number },
): Promise<Reward> {
  const today = seoulDate();
  const since = new Date(`${today}T00:00:00+09:00`).toISOString();
  const { data: existing } = await db
    .from("learning_session")
    .select("id")
    .eq("child_id", args.childId)
    .gte("started_at", since)
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

  const ratio = args.total > 0 ? Math.round((args.correct / args.total) * 100) : 0;
  const { error: actErr } = await db.from("activity").insert({
    session_id: sessionId,
    child_id: args.childId,
    type: "word_review",
    detail: { total: args.total, correct: args.correct, ratio },
  });
  if (actErr) throw new Error(`activity insert 실패: ${actErr.message}`);

  const { data: prog, error: progErr } = await db
    .from("progress")
    .select("total_stars,streak_days,last_active")
    .eq("child_id", args.childId)
    .single();
  if (progErr) throw new Error(`progress 조회 실패: ${progErr.message}`);

  const starsEarned = starsForScore(ratio);
  const yesterday = seoulDate(new Date(Date.now() - 86400000));
  let streak = prog.streak_days;
  let streakExtended = false;
  if (prog.last_active === today) {
    // 유지
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
