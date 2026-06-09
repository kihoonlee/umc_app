import { color, radius, space } from "@umc/ui";

/** 코치 콘솔 대시보드 — Phase 0 hello (상세 기획서 §8.1). 데이터는 Phase 4에서 연결. */
export default function CoachDashboard() {
  const todos = [
    { label: "메시지 답장 대기", count: 3, hint: "가장 오래 13시간" },
    { label: "일요일 리포트 검수 대기", count: 12, hint: "" },
    { label: "영상 코칭 예약", count: 2, hint: "오늘 14:00, 16:00" },
  ];

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: space.xl }}>
      <header style={{ marginBottom: space.xl }}>
        <p style={{ color: color.primary, fontWeight: 700, margin: 0 }}>UMC Coach Console</p>
        <h1 style={{ fontSize: 28, margin: `${space.xs}px 0 0` }}>
          안녕하세요, 김미경 코치님 👋
        </h1>
        <p style={{ color: color.gray700, opacity: 0.7 }}>
          Phase 0 스캐폴드 — 담당 회원·리포트 검수·코칭 메시지는 Phase 4에서 연결됩니다.
        </p>
      </header>

      <section
        style={{
          background: "#fff",
          border: `1px solid ${color.gray200}`,
          borderRadius: radius.lg,
          padding: space.lg,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>📋 오늘 해야 할 일</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: space.sm }}>
          {todos.map((t) => (
            <li
              key={t.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: `${space.sm}px ${space.md}px`,
                background: color.gray50,
                borderRadius: radius.md,
              }}
            >
              <span>
                {t.label}
                {t.hint ? (
                  <span style={{ color: color.gray700, opacity: 0.6, marginLeft: space.sm }}>
                    ({t.hint})
                  </span>
                ) : null}
              </span>
              <span
                style={{
                  background: color.accent,
                  color: "#fff",
                  borderRadius: radius.full,
                  padding: `2px ${space.sm}px`,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {t.count}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
