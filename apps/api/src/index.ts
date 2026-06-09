import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ok, fail } from "@umc/types";
import type { DailyPlan, ReadAloudRequest } from "@umc/types";
import { mockReadAloud } from "./mock/score";
import { micoReply, coachDraft } from "./llm";
import { serviceClient, userIdFromAuthHeader, assertChildOwner } from "./db";
import { persistScoredActivity } from "./learning";

type Bindings = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ANTHROPIC_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use("*", logger());
app.use("*", cors());

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
    return c.json(ok({ result, reward }));
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

app.notFound((c) =>
  c.json(fail({ code: "NOT_FOUND", message: "route not found", userMessage: "요청한 경로를 찾을 수 없어요." }), 404),
);

export default app;
