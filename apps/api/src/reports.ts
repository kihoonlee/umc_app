import type { UmcClient } from "@umc/db";
import { seoulDate } from "./db";
import { weeklySummary } from "./llm";

export interface WeeklyMetrics {
  week_start: string; // 월요일 (KST)
  week_end: string;
  days_learned: number;
  total_activities: number;
  avg_score: number | null;
  by_type: Record<string, number>;
}

/** 이번 주(월~일, KST) 시작일 */
export function weekStartSeoul(): string {
  const today = seoulDate();
  const d = new Date(`${today}T00:00:00+09:00`);
  const dow = d.getDay(); // 0=일
  const diff = dow === 0 ? 6 : dow - 1;
  return seoulDate(new Date(d.getTime() - diff * 24 * 60 * 60 * 1000));
}

/** 최근 7일 활동 → 주간 metrics 집계 */
export async function buildWeeklyMetrics(db: UmcClient, childId: string): Promise<WeeklyMetrics> {
  const weekStart = weekStartSeoul();
  const since = new Date(`${weekStart}T00:00:00+09:00`).toISOString();
  const { data, error } = await db
    .from("activity")
    .select("type,pronunciation_score,created_at")
    .eq("child_id", childId)
    .gte("created_at", since);
  if (error) throw new Error(`activity 집계 실패: ${error.message}`);

  const acts = data ?? [];
  const days = new Set(acts.map((a) => seoulDate(new Date(a.created_at))));
  const scored = acts.filter((a) => a.pronunciation_score != null);
  const byType: Record<string, number> = {};
  for (const a of acts) byType[a.type] = (byType[a.type] ?? 0) + 1;

  return {
    week_start: weekStart,
    week_end: seoulDate(new Date(new Date(`${weekStart}T00:00:00+09:00`).getTime() + 6 * 86400000)),
    days_learned: days.size,
    total_activities: acts.length,
    avg_score: scored.length
      ? Math.round(scored.reduce((s, a) => s + Number(a.pronunciation_score), 0) / scored.length)
      : null,
    by_type: byType,
  };
}

/** 주간 리포트 초안 생성(upsert) — AI 요약 포함, coach_reviewed=false */
export async function generateWeeklyReport(
  db: UmcClient,
  args: { childId: string; childName: string; anthropicKey?: string },
) {
  const metrics = await buildWeeklyMetrics(db, args.childId);
  const metricsText =
    `학습일 ${metrics.days_learned}/7, 활동 ${metrics.total_activities}회, ` +
    `평균 ${metrics.avg_score ?? "-"}점, 유형별 ${JSON.stringify(metrics.by_type)}`;
  const summary = await weeklySummary(args.anthropicKey, {
    childName: args.childName,
    metricsText,
  });

  const { data, error } = await db
    .from("weekly_report")
    .upsert(
      {
        child_id: args.childId,
        week_start: metrics.week_start,
        metrics: JSON.parse(JSON.stringify(metrics)),
        ai_summary: summary.text,
        coach_reviewed: false,
      },
      { onConflict: "child_id,week_start" },
    )
    .select("id,week_start,metrics,ai_summary,coach_reviewed,sent_at,opened_at")
    .single();
  if (error) throw new Error(`weekly_report upsert 실패: ${error.message}`);
  return { report: data, mock: summary.mock };
}
