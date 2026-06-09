import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ok, fail } from "@umc/types";
import type { DailyPlan, ReadAloudRequest } from "@umc/types";
import { mockReadAloud } from "./mock/score";
import { micoReply, coachDraft } from "./llm";

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

// ── M1 소리내어읽기 평가 (Mock-first) ────────────────────────────────
app.post("/v1/learning/m1/read-aloud", async (c) => {
  const body = await c.req.json<ReadAloudRequest>().catch(() => null);
  if (!body?.expectedText) {
    return c.json(
      fail({
        code: "BAD_REQUEST",
        message: "expectedText is required",
        userMessage: "읽을 문장을 찾지 못했어요. 다시 시도해 주세요.",
      }),
      400,
    );
  }
  return c.json(ok(mockReadAloud(body.expectedText)));
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
