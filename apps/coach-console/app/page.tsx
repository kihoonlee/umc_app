"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { color, radius, space } from "@umc/ui";
import { getSupabase } from "@/lib/supabase";

interface MemberRow {
  id: string;
  name: string;
  birth_date: string;
  cefr_level: string | null;
  progress: { total_stars: number; streak_days: number; last_active: string | null } | null;
}

/** 개발자 원클릭 로그인 — admin 전권 (실사용자 오픈 전 제거 대상) */
const DEV_EMAIL = "dev@umc.dev";
const DEV_PASSWORD = "umc-dev-master-2026";

/** 코치 대시보드 (§8.1) — 로그인 + 담당 회원 목록·상태. admin 은 전체 회원 표시. */
export default function CoachHome() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const { data, error: err } = await getSupabase()
        .from("children")
        .select("id,name,birth_date,cefr_level,progress(total_stars,streak_days,last_active)")
        .order("created_at", { ascending: true });
      if (err) throw err;
      setMembers((data as unknown as MemberRow[]) ?? []);
    } catch (e) {
      setMembers([]);
      setError(e instanceof Error ? e.message : "회원 목록을 불러오지 못했어요.");
    }
  }, []);

  useEffect(() => {
    if (session) void loadMembers();
  }, [session, loadMembers]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await getSupabase().auth.signInWithPassword({ email, password });
      if (err) throw err;
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function devLogin() {
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await getSupabase().auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      });
      if (err) throw err;
    } catch (err) {
      setError(err instanceof Error ? err.message : "개발자 로그인에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (session === undefined) return <main style={s.page}>불러오는 중…</main>;

  if (!session) {
    return (
      <main style={{ ...s.page, maxWidth: 420 }}>
        <p style={s.brand}>UMC Coach Console</p>
        <h1 style={s.h1}>코치 로그인</h1>
        <form onSubmit={signIn} style={s.card}>
          <input
            style={s.input}
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={s.input}
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={s.error}>⚠ {error}</p>}
          <button style={s.cta} disabled={busy}>
            {busy ? "로그인 중…" : "로그인"}
          </button>
          <button type="button" style={s.devBtn} onClick={() => void devLogin()} disabled={busy}>
            🛠 개발자 로그인 (전체 권한)
          </button>
        </form>
      </main>
    );
  }

  const inactive = (m: MemberRow) => {
    const la = m.progress?.last_active;
    if (!la) return true;
    return Date.now() - new Date(la).getTime() > 3 * 24 * 60 * 60 * 1000;
  };

  return (
    <main style={s.page}>
      <header style={s.headerRow}>
        <div>
          <p style={s.brand}>UMC Coach Console</p>
          <h1 style={s.h1}>담당 회원 ({members?.length ?? "…"})</h1>
        </div>
        <button style={s.linkBtn} onClick={() => void getSupabase().auth.signOut()}>
          로그아웃
        </button>
      </header>

      {error && <p style={s.error}>⚠ {error}</p>}

      {members && members.length === 0 && (
        <div style={s.card}>
          <p style={{ margin: 0, color: color.gray700 }}>
            아직 배정된 회원이 없습니다. 관리자가 회원을 배정하면 여기에 표시돼요.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gap: space.sm }}>
        {members?.map((m) => (
          <Link key={m.id} href={`/member?id=${m.id}`} style={s.memberCard}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 16 }}>{m.name}</strong>
              <span style={s.meta}>
                {" "}
                · {m.birth_date.slice(0, 4)}년생 · {m.cefr_level ?? "진단 전"}
              </span>
              <div style={s.meta}>
                ⭐ {m.progress?.total_stars ?? 0} · 🔥 {m.progress?.streak_days ?? 0}일 · 마지막 학습{" "}
                {m.progress?.last_active ?? "없음"}
              </div>
            </div>
            {inactive(m) && <span style={s.warnBadge}>관심 필요</span>}
            <span style={{ color: color.primary, fontWeight: 700 }}>›</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 880, margin: "0 auto", padding: space.xl },
  brand: { color: color.primary, fontWeight: 700, margin: 0 },
  h1: { fontSize: 26, margin: `${space.xs}px 0 ${space.md}px` },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  card: {
    background: "#fff",
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.lg,
    padding: space.lg,
    display: "grid",
    gap: space.sm,
  },
  memberCard: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
    background: "#fff",
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.lg,
    padding: space.md,
    textDecoration: "none",
    color: color.gray700,
  },
  meta: { color: color.gray700, opacity: 0.65, fontSize: 13 },
  warnBadge: {
    background: "#FFF4E5",
    color: "#B25E09",
    borderRadius: radius.full,
    padding: `2px ${space.sm}px`,
    fontSize: 12,
    fontWeight: 700,
  },
  input: {
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.md,
    padding: `${space.sm + 2}px ${space.md}px`,
    fontSize: 15,
    background: color.gray50,
  },
  cta: {
    background: color.primary,
    color: "#fff",
    border: "none",
    borderRadius: radius.full,
    padding: `${space.sm + 4}px`,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: color.gray700,
    opacity: 0.6,
    cursor: "pointer",
    fontSize: 14,
  },
  error: { color: color.danger, fontSize: 14, margin: 0 },
  devBtn: {
    background: "none",
    border: `1px dashed ${color.gray700}`,
    color: color.gray700,
    borderRadius: radius.full,
    padding: `${space.sm}px`,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    opacity: 0.75,
  },
};
