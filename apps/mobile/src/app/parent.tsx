import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { useApp } from "@/lib/app-state";
import { callApi } from "@/lib/api";
import { notify, errorMessage } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

interface ActRow {
  type: string;
  pronunciation_score: number | null;
  created_at: string;
}
interface CoachMsg {
  id: string;
  body: string;
  sent_at: string | null;
}
interface ReportRow {
  id: string;
  week_start: string;
  metrics: { days_learned?: number; total_activities?: number; avg_score?: number | null } | null;
  ai_summary: string | null;
  opened_at: string | null;
}
interface DayAgg {
  label: string; // 월~일
  date: string;
  count: number;
  avg: number | null;
}

const CHEER_EMOJIS = ["👍", "❤️", "🎉"];
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 엄마 홈 대시보드 (§7.1) — 오늘의 한 줄 + 이번 주 그래프 + 코치 메시지 + 응원하기.
 * 차분한 톤(엄마 화면 이중 톤 원칙).
 */
export default function ParentDashboard() {
  const { session, child } = useApp();
  const [acts, setActs] = useState<ActRow[] | null>(null);
  const [coachMsgs, setCoachMsgs] = useState<CoachMsg[]>([]);
  const [sendingCheer, setSendingCheer] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!child) return;
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [actRes, msgRes] = await Promise.all([
        supabase
          .from("activity")
          .select("type,pronunciation_score,created_at")
          .eq("child_id", child.id)
          .gte("created_at", weekAgo)
          .order("created_at", { ascending: false }),
        supabase
          .from("coach_message")
          .select("id,body,sent_at")
          .eq("child_id", child.id)
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
          .limit(2),
      ]);
      if (actRes.error) throw actRes.error;
      setActs((actRes.data as ActRow[]) ?? []);
      if (!msgRes.error) setCoachMsgs((msgRes.data as CoachMsg[]) ?? []);
      const repRes = await supabase
        .from("weekly_report")
        .select("id,week_start,metrics,ai_summary,opened_at")
        .eq("child_id", child.id)
        .not("sent_at", "is", null)
        .order("week_start", { ascending: false })
        .limit(4);
      if (!repRes.error) setReports((repRes.data as unknown as ReportRow[]) ?? []);
    } catch (e) {
      setActs([]);
      notify("데이터 불러오기 실패", errorMessage(e));
    }
  }, [child]);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!child) {
      router.replace("/profiles");
      return;
    }
    void load();
  }, [session, child, load]);

  async function openReport(r: ReportRow) {
    setOpenReportId(openReportId === r.id ? null : r.id);
    if (!r.opened_at) {
      try {
        await callApi(`/v1/reports/weekly/${r.id}/open`, { body: {} });
        setReports((prev) =>
          prev.map((x) => (x.id === r.id ? { ...x, opened_at: new Date().toISOString() } : x)),
        );
      } catch (e) {
        // 열람 마킹 실패 — 내용 표시는 계속, 알림으로 고지
        notify("열람 기록 실패", errorMessage(e));
      }
    }
  }

  async function sendCheer(emoji: string) {
    if (!session || !child || sendingCheer) return;
    setSendingCheer(true);
    try {
      const { error } = await supabase.from("cheer").insert({
        child_id: child.id,
        parent_id: session.user.id,
        emoji,
      });
      if (error) throw error;
      notify("응원 전달 완료", `${child.name}의 홈 화면에서 미코가 전해줄 거예요 ${emoji}`);
    } catch (e) {
      notify("응원 보내기 실패", errorMessage(e));
    } finally {
      setSendingCheer(false);
    }
  }

  if (!child || acts === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  // 오늘의 한 줄
  const todayStr = new Date().toDateString();
  const todayActs = acts.filter((a) => new Date(a.created_at).toDateString() === todayStr);
  const scored = todayActs.filter((a) => a.pronunciation_score != null);
  const todayAvg = scored.length
    ? Math.round(scored.reduce((s, a) => s + Number(a.pronunciation_score), 0) / scored.length)
    : null;
  const todayLine = todayActs.length
    ? `오늘 ${child.name}(이)가 학습 ${todayActs.length}회를 완료했어요${todayAvg != null ? ` — 평균 ${todayAvg}점!` : "!"}`
    : `${child.name}(이)는 아직 오늘 학습 전이에요. 하원 후 미코가 기다리고 있어요!`;

  // 이번 주 (최근 7일) 집계
  const days: DayAgg[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const key = d.toDateString();
    const dayActs = acts.filter((a) => new Date(a.created_at).toDateString() === key);
    const dayScored = dayActs.filter((a) => a.pronunciation_score != null);
    return {
      label: DAY_LABELS[d.getDay()] ?? "",
      date: key,
      count: dayActs.length,
      avg: dayScored.length
        ? Math.round(dayScored.reduce((s, a) => s + Number(a.pronunciation_score), 0) / dayScored.length)
        : null,
    };
  });
  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const learnedDays = days.filter((d) => d.count > 0).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ 돌아가기</Text>
          </Pressable>
          <Text style={styles.childChip}>🧒 {child.name}</Text>
        </View>

        <Text style={styles.title}>안녕하세요! 👋</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>📊 오늘의 한 줄</Text>
          <Text style={styles.todayLine}>{todayLine}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>📈 이번 주 (최근 7일)</Text>
          <View style={styles.chartRow}>
            {days.map((d) => (
              <View key={d.date} style={styles.chartCol}>
                <Text style={styles.barAvg}>{d.avg ?? ""}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(d.count / maxCount) * 100}%` as `${number}%`,
                        backgroundColor: d.count ? color.primary : color.gray200,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chartSummary}>
            학습 {learnedDays}일 / 7일 {learnedDays >= 5 ? "✓ 목표 달성!" : "(목표 5일)"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>💬 코치 메시지</Text>
          {coachMsgs.length === 0 ? (
            <Text style={styles.emptyMsg}>아직 받은 메시지가 없어요. 코치가 곧 인사할 거예요!</Text>
          ) : (
            coachMsgs.map((m) => (
              <View key={m.id} style={styles.msgBubble}>
                <Text style={styles.msgBody}>{m.body}</Text>
                {m.sent_at && (
                  <Text style={styles.msgDate}>{new Date(m.sent_at).toLocaleDateString("ko-KR")}</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>📋 주간 리포트</Text>
          {reports.length === 0 ? (
            <Text style={styles.emptyMsg}>아직 발송된 리포트가 없어요. 매주 일요일에 도착해요.</Text>
          ) : (
            reports.map((r) => (
              <Pressable key={r.id} style={styles.reportRow} onPress={() => void openReport(r)}>
                <View style={styles.reportHead}>
                  <Text style={styles.reportWeek}>{r.week_start} 주</Text>
                  <Text style={styles.reportBadge}>{r.opened_at ? "읽음" : "● 새 리포트"}</Text>
                </View>
                <Text style={styles.reportMeta}>
                  학습 {r.metrics?.days_learned ?? 0}일 · 활동 {r.metrics?.total_activities ?? 0}회 · 평균{" "}
                  {r.metrics?.avg_score ?? "-"}점
                </Text>
                {openReportId === r.id && r.ai_summary && (
                  <Text style={styles.reportBody}>{r.ai_summary}</Text>
                )}
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>🎁 {child.name} 응원하기</Text>
          <Text style={styles.cheerHint}>누르면 아이 화면에서 미코가 전해줘요</Text>
          <View style={styles.cheerRow}>
            {CHEER_EMOJIS.map((e) => (
              <Pressable
                key={e}
                style={[styles.cheerBtn, sendingCheer && { opacity: 0.5 }]}
                onPress={() => void sendCheer(e)}
                disabled={sendingCheer}
              >
                <Text style={styles.cheerEmoji}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.gray50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.gray50 },
  scroll: { padding: space.lg, gap: space.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { color: color.primary, fontWeight: "700", fontSize: fontSize.body },
  childChip: {
    fontWeight: "700",
    color: color.gray700,
    backgroundColor: "#fff",
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    overflow: "hidden",
    fontSize: fontSize.body,
  },
  title: { fontSize: fontSize.heading, fontWeight: "800", color: color.dark },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: color.gray200,
  },
  cardLabel: { fontWeight: "800", color: color.gray700, fontSize: fontSize.body },
  todayLine: { fontSize: fontSize.bodyKid, fontWeight: "600", color: color.dark, lineHeight: 26 },
  chartRow: { flexDirection: "row", justifyContent: "space-between", height: 120, marginTop: space.xs },
  chartCol: { alignItems: "center", flex: 1, gap: 2 },
  barAvg: { fontSize: 10, color: color.primary, fontWeight: "700", height: 14 },
  barTrack: { flex: 1, width: 16, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: fontSize.caption, color: color.gray700, opacity: 0.7 },
  chartSummary: { color: color.gray700, fontWeight: "600", fontSize: fontSize.body },
  emptyMsg: { color: color.gray700, opacity: 0.6, fontSize: fontSize.body },
  msgBubble: { backgroundColor: color.gray50, borderRadius: radius.md, padding: space.md, gap: 4 },
  msgBody: { color: color.gray700, fontSize: fontSize.body, lineHeight: 21 },
  msgDate: { color: color.gray700, opacity: 0.5, fontSize: fontSize.caption },
  reportRow: { backgroundColor: color.gray50, borderRadius: radius.md, padding: space.md, gap: 4 },
  reportHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reportWeek: { fontWeight: "800", color: color.gray700, fontSize: fontSize.body },
  reportBadge: { color: color.accent, fontWeight: "700", fontSize: fontSize.caption },
  reportMeta: { color: color.gray700, opacity: 0.65, fontSize: fontSize.caption },
  reportBody: { color: color.gray700, fontSize: fontSize.body, lineHeight: 21, marginTop: 4 },
  cheerHint: { color: color.gray700, opacity: 0.6, fontSize: fontSize.caption },
  cheerRow: { flexDirection: "row", gap: space.md, marginTop: space.xs },
  cheerBtn: {
    flex: 1,
    backgroundColor: color.gray50,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: color.gray200,
  },
  cheerEmoji: { fontSize: 28 },
});
