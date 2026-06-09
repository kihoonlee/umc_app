"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ApiEnvelope } from "@umc/types";
import { color, radius, space } from "@umc/ui";
import { getSupabase } from "@/lib/supabase";

interface ChildInfo {
  id: string;
  name: string;
  birth_date: string;
  cefr_level: string | null;
  progress: { total_stars: number; streak_days: number; last_active: string | null } | null;
}
interface ActRow {
  id: string;
  type: string;
  pronunciation_score: number | null;
  wcpm: number | null;
  fluency_score: number | null;
  created_at: string;
}
interface MsgRow {
  id: string;
  body: string;
  sent_at: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  m1_read: "📖 읽기",
  m2_shadow: "🎤 연따",
  m2_dialog: "🦊 대화",
  word_review: "🃏 단어",
};

/** 회원 상세 (§8.2) — 학습 데이터 + 메시지 이력 + AI 초안 작성·발송. */
export default function MemberDetail() {
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const [child, setChild] = useState<ChildInfo | null>(null);
  const [acts, setActs] = useState<ActRow[]>([]);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    try {
      const [c, a, m] = await Promise.all([
        supabase
          .from("children")
          .select("id,name,birth_date,cefr_level,progress(total_stars,streak_days,last_active)")
          .eq("id", childId)
          .single(),
        supabase
          .from("activity")
          .select("id,type,pronunciation_score,wcpm,fluency_score,created_at")
          .eq("child_id", childId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("coach_message")
          .select("id,body,sent_at")
          .eq("child_id", childId)
          .order("sent_at", { ascending: false })
          .limit(5),
      ]);
      if (c.error) throw c.error;
      setChild(c.data as unknown as ChildInfo);
      setActs((a.data as ActRow[]) ?? []);
      setMsgs((m.data as MsgRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했어요.");
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateDraft() {
    if (!child) return;
    setDrafting(true);
    setError(null);
    try {
      const scored = acts.filter((a) => a.pronunciation_score != null);
      const avg = scored.length
        ? Math.round(scored.reduce((s, a) => s + Number(a.pronunciation_score), 0) / scored.length)
        : null;
      const summary = `최근 활동 ${acts.length}회 (평균 ${avg ?? "-"}점), 연속 학습 ${child.progress?.streak_days ?? 0}일, 누적 별 ${child.progress?.total_stars ?? 0}개`;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8787";
      const res = await fetch(`${apiUrl}/v1/coach/messages/draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ childName: child.name, summary }),
      });
      const env = (await res.json()) as ApiEnvelope<{ text: string; mock: boolean }>;
      if (env.error || !env.data) throw new Error(env.error?.userMessage ?? "초안 생성 실패");
      setDraft(env.data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 초안 생성에 실패했어요.");
    } finally {
      setDrafting(false);
    }
  }

  async function send() {
    if (!child || !draft.trim()) return;
    setSending(true);
    setError(null);
    setOkMsg(null);
    try {
      const supabase = getSupabase();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("로그인이 만료됐어요.");
      const { error: err } = await supabase.from("coach_message").insert({
        coach_id: u.user.id,
        child_id: child.id,
        body: draft.trim(),
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      if (err) throw err;
      setOkMsg("발송 완료 — 엄마 대시보드에 표시됩니다.");
      setDraft("");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "발송에 실패했어요.");
    } finally {
      setSending(false);
    }
  }

  if (!child) {
    return (
      <main style={s.page}>
        <Link href="/" style={s.backLink}>‹ 대시보드</Link>
        <p>{error ? `⚠ ${error}` : "불러오는 중…"}</p>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <Link href="/" style={s.backLink}>‹ 대시보드</Link>
      <h1 style={s.h1}>
        {child.name}{" "}
        <span style={s.meta}>
          {child.birth_date.slice(0, 4)}년생 · {child.cefr_level ?? "진단 전"} · ⭐{" "}
          {child.progress?.total_stars ?? 0} · 🔥 {child.progress?.streak_days ?? 0}일
        </span>
      </h1>

      <div style={s.grid}>
        <section style={s.card}>
          <h2 style={s.h2}>최근 학습 활동</h2>
          {acts.length === 0 && <p style={s.meta}>아직 학습 기록이 없어요.</p>}
          <ul style={s.list}>
            {acts.map((a) => (
              <li key={a.id} style={s.actRow}>
                <span>{TYPE_LABEL[a.type] ?? a.type}</span>
                <span style={s.meta}>
                  {a.pronunciation_score != null ? `${Math.round(Number(a.pronunciation_score))}점` : "-"}
                  {a.wcpm != null ? ` · ${a.wcpm} WPM` : ""}
                  {a.fluency_score != null ? ` · 유창성 ${Math.round(Number(a.fluency_score))}` : ""}
                </span>
                <span style={s.meta}>{new Date(a.created_at).toLocaleString("ko-KR")}</span>
              </li>
            ))}
          </ul>
        </section>

        <section style={s.card}>
          <h2 style={s.h2}>코칭 메시지 작성</h2>
          <button style={s.draftBtn} onClick={() => void generateDraft()} disabled={drafting}>
            {drafting ? "초안 생성 중…" : "🤖 AI 초안 생성"}
          </button>
          <textarea
            style={s.textarea}
            rows={6}
            placeholder="어머니께 보낼 메시지 — AI 초안을 생성한 뒤 직접 검수·수정해 발송하세요."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {error && <p style={s.error}>⚠ {error}</p>}
          {okMsg && <p style={s.ok}>✓ {okMsg}</p>}
          <button style={s.cta} onClick={() => void send()} disabled={sending || !draft.trim()}>
            {sending ? "발송 중…" : "발송"}
          </button>

          <h2 style={{ ...s.h2, marginTop: space.md }}>최근 발송 이력</h2>
          {msgs.length === 0 && <p style={s.meta}>발송한 메시지가 없어요.</p>}
          {msgs.map((m) => (
            <div key={m.id} style={s.msgRow}>
              <p style={{ margin: 0, fontSize: 14 }}>{m.body}</p>
              <span style={s.meta}>{m.sent_at ? new Date(m.sent_at).toLocaleString("ko-KR") : ""}</span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 980, margin: "0 auto", padding: space.xl },
  backLink: { color: color.primary, textDecoration: "none", fontWeight: 700 },
  h1: { fontSize: 24, margin: `${space.sm}px 0 ${space.md}px` },
  h2: { fontSize: 16, margin: `0 0 ${space.xs}px` },
  meta: { color: color.gray700, opacity: 0.65, fontSize: 13, fontWeight: 400 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md },
  card: {
    background: "#fff",
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.lg,
    padding: space.lg,
    display: "grid",
    gap: space.sm,
    alignContent: "start",
  },
  list: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: space.xs },
  actRow: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: space.sm,
    background: color.gray50,
    borderRadius: radius.md,
    padding: `${space.xs + 2}px ${space.sm}px`,
    fontSize: 14,
  },
  draftBtn: {
    background: "#fff",
    border: `1px solid ${color.primary}`,
    color: color.primary,
    borderRadius: radius.full,
    padding: `${space.sm}px`,
    fontWeight: 700,
    cursor: "pointer",
  },
  textarea: {
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.md,
    padding: space.sm,
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical",
    background: color.gray50,
  },
  cta: {
    background: color.accent,
    color: "#fff",
    border: "none",
    borderRadius: radius.full,
    padding: `${space.sm + 2}px`,
    fontWeight: 700,
    cursor: "pointer",
  },
  msgRow: {
    background: color.gray50,
    borderRadius: radius.md,
    padding: space.sm,
    display: "grid",
    gap: 4,
  },
  error: { color: color.danger, fontSize: 14, margin: 0 },
  ok: { color: color.success, fontSize: 14, margin: 0 },
};
