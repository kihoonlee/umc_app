import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ok, fail } from "@umc/types";
import type { DailyPlan, ReadAloudRequest } from "@umc/types";
import { mockReadAloud } from "./mock/score";
import { micoReply, coachDraft } from "./llm";
import { serviceClient, userIdFromAuthHeader, assertChildOwner, childAccessRole } from "./db";
import { persistScoredActivity } from "./learning";
import { generateWeeklyReport } from "./reports";
import { collectWeakWords, gradeWordCard, completeWordReview } from "./words";
import { mapDiagnostic } from "./levels";

type Bindings = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ANTHROPIC_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use("*", logger());
app.use("*", cors());

type AuthedCtx = {
  db: ReturnType<typeof serviceClient>;
  userId: string;
  role: "parent" | "coach";
};

/** 공용: 토큰 검증 + child 접근 역할 확인. 실패 시 Response 반환. */
async function authChild(
  c: { env: Bindings; req: { header: (n: string) => string | undefined } },
  childId: string | undefined,
  json: (body: unknown, status: 400 | 401 | 403 | 500) => Response,
): Promise<AuthedCtx | Response> {
  if (!childId) {
    return json(fail({ code: "BAD_REQUEST", message: "childId required", userMessage: "프로필 정보가 없어요." }), 400);
  }
  let db;
  try {
    db = serviceClient(c.env);
  } catch (e) {
    return json(
      fail({ code: "CONFIG", message: e instanceof Error ? e.message : "config", userMessage: "서버 설정 오류예요." }),
      500,
    );
  }
  const userId = await userIdFromAuthHeader(db, c.req.header("authorization"));
  if (!userId) {
    return json(fail({ code: "UNAUTHORIZED", message: "invalid token", userMessage: "로그인이 만료됐어요." }), 401);
  }
  const role = await childAccessRole(db, childId, userId);
  if (!role) {
    return json(fail({ code: "FORBIDDEN", message: "no access", userMessage: "프로필 정보를 확인할 수 없어요." }), 403);
  }
  return { db, userId, role };
}

// ── Health ───────────────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json(ok({ status: "ok", service: "umc-api", ts: new Date().toISOString() })),
);

// ── 오늘의 학습 계획 (Mock) ──────────────────────────────────────────
app.get("/v1/children/:childId/daily-plan", (c) => {
  const childId = c.req.param("childId");
  const plan: DailyPlan = {
    id: `mock-${childId}`,
    childId,
    planDate: new Date().toISOString().slice(0, 10),
    bookId: "00000000-0000-0000-0000-000000000101",
    shadowClipId: "00000000-0000-0000-0000-000000000201",
    wordCardIds: [],
    status: "pending",
    estimatedMinutes: 18,
  };
  return c.json(ok(plan, { mock: true }));
});

// ── M1 소리내어읽기 평가 (Mock-first) + 영속·보상 ────────────────────
// 인증: Authorization: Bearer <supabase access_token>. 채점은 mock(텍스트 기반),
// 영속(learning_session/activity)과 보상(progress 별·streak)은 실제로 수행.
app.post("/v1/learning/m1/read-aloud", async (c) => {
  const body = await c.req.json<ReadAloudRequest>().catch(() => null);
  if (!body?.expectedText || !body.childId) {
    return c.json(
      fail({
        code: "BAD_REQUEST",
        message: "expectedText / childId required",
        userMessage: "읽을 문장을 찾지 못했어요. 다시 시도해 주세요.",
      }),
      400,
    );
  }

  let db;
  try {
    db = serviceClient(c.env);
  } catch (e) {
    return c.json(
      fail({
        code: "CONFIG",
        message: e instanceof Error ? e.message : "config error",
        userMessage: "서버 설정 오류예요. 잠시 후 다시 시도해 주세요.",
      }),
      500,
    );
  }

  const userId = await userIdFromAuthHeader(db, c.req.header("authorization"));
  if (!userId) {
    return c.json(
      fail({ code: "UNAUTHORIZED", message: "invalid token", userMessage: "로그인이 만료됐어요. 다시 로그인해 주세요." }),
      401,
    );
  }
  if (!(await assertChildOwner(db, body.childId, userId))) {
    return c.json(
      fail({ code: "FORBIDDEN", message: "child not owned", userMessage: "프로필 정보를 확인할 수 없어요." }),
      403,
    );
  }

  const result = mockReadAloud(body.expectedText);
  try {
    const reward = await persistScoredActivity(db, {
      type: "m1_read",
      childId: body.childId,
      contentId: body.contentId ?? null,
      audioPath: body.audioPath ?? null,
      result,
    });
    // 약점 단어(red) 자동 수집 → 내일 복습 카드 (실패해도 채점 흐름은 유지)
    let wordsCollected = 0;
    try {
      wordsCollected = await collectWeakWords(db, {
        childId: body.childId,
        contentId: body.contentId ?? null,
        result,
      });
    } catch {
      // word_card 수집 실패는 비치명 — 다음 학습에서 재수집됨
    }
    return c.json(ok({ result, reward, wordsCollected }));
  } catch (e) {
    return c.json(
      fail({
        code: "PERSIST_FAILED",
        message: e instanceof Error ? e.message : "persist error",
        userMessage: "점수 저장에 실패했어요. 다시 시도해 주세요.",
      }),
      500,
    );
  }
});

// ── M2 연따: 구간 즉시 채점 (무영속 — 연습 피드백용) ─────────────────
app.post("/v1/learning/m2/shadow/evaluate", async (c) => {
  const body = await c.req.json<{ segmentText?: string }>().catch(() => null);
  if (!body?.segmentText) {
    return c.json(
      fail({ code: "BAD_REQUEST", message: "segmentText required", userMessage: "따라 말할 문장을 찾지 못했어요." }),
      400,
    );
  }
  return c.json(ok(mockReadAloud(body.segmentText)));
});

// ── M2 연따: 클립 완료 제출 (영속 + 보상 1회) ───────────────────────
app.post("/v1/learning/m2/shadow", async (c) => {
  const body = await c.req
    .json<{ childId?: string; contentId?: string; audioPath?: string | null; fullText?: string }>()
    .catch(() => null);
  if (!body?.childId || !body.fullText) {
    return c.json(
      fail({ code: "BAD_REQUEST", message: "childId / fullText required", userMessage: "연따 결과를 저장하지 못했어요. 다시 시도해 주세요." }),
      400,
    );
  }

  let db;
  try {
    db = serviceClient(c.env);
  } catch (e) {
    return c.json(
      fail({ code: "CONFIG", message: e instanceof Error ? e.message : "config error", userMessage: "서버 설정 오류예요. 잠시 후 다시 시도해 주세요." }),
      500,
    );
  }

  const userId = await userIdFromAuthHeader(db, c.req.header("authorization"));
  if (!userId) {
    return c.json(
      fail({ code: "UNAUTHORIZED", message: "invalid token", userMessage: "로그인이 만료됐어요. 다시 로그인해 주세요." }),
      401,
    );
  }
  if (!(await assertChildOwner(db, body.childId, userId))) {
    return c.json(
      fail({ code: "FORBIDDEN", message: "child not owned", userMessage: "프로필 정보를 확인할 수 없어요." }),
      403,
    );
  }

  const result = mockReadAloud(body.fullText);
  try {
    const reward = await persistScoredActivity(db, {
      type: "m2_shadow",
      childId: body.childId,
      contentId: body.contentId ?? null,
      audioPath: body.audioPath ?? null,
      result,
    });
    return c.json(ok({ result, reward }));
  } catch (e) {
    return c.json(
      fail({ code: "PERSIST_FAILED", message: e instanceof Error ? e.message : "persist error", userMessage: "점수 저장에 실패했어요. 다시 시도해 주세요." }),
      500,
    );
  }
});

// ── M2 미코 대화 (LLM, 키 없으면 mock) ───────────────────────────────
app.post("/v1/learning/m2/dialog", async (c) => {
  const body = await c.req.json<{ userText?: string; cefr?: string }>().catch(() => null);
  if (!body?.userText) {
    return c.json(
      fail({ code: "BAD_REQUEST", message: "userText required", userMessage: "할 말을 입력해 주세요." }),
      400,
    );
  }
  const reply = await micoReply(c.env.ANTHROPIC_API_KEY, { userText: body.userText, cefr: body.cefr });
  return c.json(ok(reply));
});

// ── 코치 메시지 초안 (LLM, 키 없으면 mock) ───────────────────────────
app.post("/v1/coach/messages/draft", async (c) => {
  const body = await c.req.json<{ childName?: string; summary?: string }>().catch(() => null);
  if (!body?.childName) {
    return c.json(
      fail({ code: "BAD_REQUEST", message: "childName required", userMessage: "회원 정보를 선택해 주세요." }),
      400,
    );
  }
  const draft = await coachDraft(c.env.ANTHROPIC_API_KEY, {
    childName: body.childName,
    summary: body.summary ?? "",
  });
  return c.json(ok(draft));
});

// ── 주간 리포트: 초안 생성 (코치/부모) ───────────────────────────────
app.post("/v1/reports/weekly/generate", async (c) => {
  const body = await c.req.json<{ childId?: string }>().catch(() => null);
  const auth = await authChild(c, body?.childId, (b, s) => c.json(b as object, s));
  if (auth instanceof Response) return auth;
  const { db } = auth;
  try {
    const { data: child } = await db.from("children").select("name").eq("id", body!.childId!).single();
    const out = await generateWeeklyReport(db, {
      childId: body!.childId!,
      childName: child?.name ?? "아이",
      anthropicKey: c.env.ANTHROPIC_API_KEY,
    });
    return c.json(ok(out));
  } catch (e) {
    return c.json(
      fail({ code: "REPORT_FAILED", message: e instanceof Error ? e.message : "error", userMessage: "리포트 생성에 실패했어요." }),
      500,
    );
  }
});

// ── 주간 리포트: 코치 승인·발송 ──────────────────────────────────────
app.post("/v1/reports/weekly/:id/approve", async (c) => {
  const reportId = c.req.param("id");
  let db;
  try {
    db = serviceClient(c.env);
  } catch (e) {
    return c.json(fail({ code: "CONFIG", message: String(e), userMessage: "서버 설정 오류예요." }), 500);
  }
  const userId = await userIdFromAuthHeader(db, c.req.header("authorization"));
  if (!userId) return c.json(fail({ code: "UNAUTHORIZED", message: "invalid token", userMessage: "로그인이 만료됐어요." }), 401);

  const { data: report } = await db.from("weekly_report").select("id,child_id").eq("id", reportId).maybeSingle();
  if (!report) return c.json(fail({ code: "NOT_FOUND", message: "report not found", userMessage: "리포트를 찾을 수 없어요." }), 404);
  const role = await childAccessRole(db, report.child_id, userId);
  if (role !== "coach") {
    return c.json(fail({ code: "FORBIDDEN", message: "coach only", userMessage: "담당 코치만 승인할 수 있어요." }), 403);
  }
  const { data, error } = await db
    .from("weekly_report")
    .update({ coach_reviewed: true, sent_at: new Date().toISOString() })
    .eq("id", reportId)
    .select("id,coach_reviewed,sent_at")
    .single();
  if (error) return c.json(fail({ code: "PERSIST_FAILED", message: error.message, userMessage: "승인 처리에 실패했어요." }), 500);
  return c.json(ok(data));
});

// ── 주간 리포트: 엄마 열람 (성과지표③ opened_at) ────────────────────
app.post("/v1/reports/weekly/:id/open", async (c) => {
  const reportId = c.req.param("id");
  let db;
  try {
    db = serviceClient(c.env);
  } catch (e) {
    return c.json(fail({ code: "CONFIG", message: String(e), userMessage: "서버 설정 오류예요." }), 500);
  }
  const userId = await userIdFromAuthHeader(db, c.req.header("authorization"));
  if (!userId) return c.json(fail({ code: "UNAUTHORIZED", message: "invalid token", userMessage: "로그인이 만료됐어요." }), 401);

  const { data: report } = await db
    .from("weekly_report")
    .select("id,child_id,opened_at")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return c.json(fail({ code: "NOT_FOUND", message: "report not found", userMessage: "리포트를 찾을 수 없어요." }), 404);
  const role = await childAccessRole(db, report.child_id, userId);
  if (role !== "parent") {
    return c.json(fail({ code: "FORBIDDEN", message: "parent only", userMessage: "보호자만 열람 처리할 수 있어요." }), 403);
  }
  if (!report.opened_at) {
    await db.from("weekly_report").update({ opened_at: new Date().toISOString() }).eq("id", reportId);
  }
  return c.json(ok({ opened: true }));
});

// ── Word Bank: 카드 채점 (SRS lite) ──────────────────────────────────
app.post("/v1/word-cards/:id/grade", async (c) => {
  const cardId = c.req.param("id");
  const body = await c.req.json<{ childId?: string; correct?: boolean }>().catch(() => null);
  const auth = await authChild(c, body?.childId, (b, s) => c.json(b as object, s));
  if (auth instanceof Response) return auth;
  try {
    const out = await gradeWordCard(auth.db, {
      cardId,
      childId: body!.childId!,
      correct: !!body?.correct,
    });
    return c.json(ok(out));
  } catch (e) {
    return c.json(
      fail({ code: "GRADE_FAILED", message: e instanceof Error ? e.message : "error", userMessage: "카드 채점에 실패했어요." }),
      500,
    );
  }
});

// ── Word Bank: 복습 세션 완료 → 보상 ─────────────────────────────────
app.post("/v1/learning/words/complete", async (c) => {
  const body = await c.req.json<{ childId?: string; total?: number; correct?: number }>().catch(() => null);
  const auth = await authChild(c, body?.childId, (b, s) => c.json(b as object, s));
  if (auth instanceof Response) return auth;
  try {
    const reward = await completeWordReview(auth.db, {
      childId: body!.childId!,
      total: body?.total ?? 0,
      correct: body?.correct ?? 0,
    });
    return c.json(ok({ reward }));
  } catch (e) {
    return c.json(
      fail({ code: "PERSIST_FAILED", message: e instanceof Error ? e.message : "error", userMessage: "복습 결과 저장에 실패했어요." }),
      500,
    );
  }
});

// ── 진단(D0) → 레벨 산정 → children 갱신 ─────────────────────────────
app.post("/v1/children/:childId/diagnostic", async (c) => {
  const childId = c.req.param("childId");
  const body = await c.req.json<{ scores?: number[] }>().catch(() => null);
  if (!body?.scores || body.scores.length < 3) {
    return c.json(
      fail({ code: "BAD_REQUEST", message: "scores[3] required", userMessage: "진단 점수가 부족해요. 다시 시도해 주세요." }),
      400,
    );
  }
  const auth = await authChild(c, childId, (b, s) => c.json(b as object, s));
  if (auth instanceof Response) return auth;
  if (auth.role !== "parent") {
    return c.json(fail({ code: "FORBIDDEN", message: "parent only", userMessage: "보호자 계정으로 진행해 주세요." }), 403);
  }
  const level = mapDiagnostic(body.scores);
  const { error } = await auth.db
    .from("children")
    .update({ cefr_level: level.cefr, lexile: level.lexile })
    .eq("id", childId);
  if (error) {
    return c.json(fail({ code: "PERSIST_FAILED", message: error.message, userMessage: "레벨 저장에 실패했어요." }), 500);
  }
  return c.json(ok(level));
});

app.notFound((c) =>
  c.json(fail({ code: "NOT_FOUND", message: "route not found", userMessage: "요청한 경로를 찾을 수 없어요." }), 404),
);

export default app;
