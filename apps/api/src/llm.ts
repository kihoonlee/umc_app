/**
 * LLM 헬퍼 — 미코 대화 / 코치 메시지 초안.
 * ANTHROPIC_API_KEY 가 있으면 Anthropic Messages API 실연동, 없으면 mock 응답.
 * (MVP에서 유일하게 실연동되는 외부 AI. 발음·STT 는 Mock-first.)
 */

const MICO_MODEL = "claude-haiku-4-5-20251001"; // 저연령·실시간 → 저비용 mid/haiku

export interface MicoOpts {
  cefr?: string;
  userText: string;
}

export async function micoReply(
  apiKey: string | undefined,
  { cefr = "A1", userText }: MicoOpts,
): Promise<{ text: string; mock: boolean }> {
  const system =
    `You are Mico, a friendly bilingual learning buddy for a Korean child learning English ` +
    `(CEFR ${cefr}). Always reply in simple English at the child's level, under 2 sentences, ` +
    `warm and encouraging. Never discuss violence, scary topics, romance, politics, or religion. ` +
    `If asked about those, gently redirect: "Let's talk about animals instead!"`;

  if (!apiKey) {
    return { text: "Great job! Let's keep going! 🐾", mock: true };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MICO_MODEL,
        max_tokens: 120,
        system,
        messages: [{ role: "user", content: userText }],
      }),
    });
    if (!res.ok) return { text: "Oops! Let's try again. 🐾", mock: true };
    const data = (await res.json()) as { content?: { text?: string }[] };
    return { text: data.content?.[0]?.text ?? "...", mock: false };
  } catch {
    return { text: "Oops! Let's try again. 🐾", mock: true };
  }
}

export async function coachDraft(
  apiKey: string | undefined,
  opts: { childName: string; summary: string },
): Promise<{ text: string; mock: boolean }> {
  const prompt =
    `당신은 UMC 코치를 돕는 작성 보조입니다. 아이 "${opts.childName}"의 이번 주 학습 요약: ${opts.summary}. ` +
    `따뜻하고 구체적이며 200자 이내의 한국어 코치 메시지 초안을 작성하세요. ` +
    `(1) 구체적 칭찬 1개 (2) 개선 포인트 1개 (3) 다음 주 작은 행동 1개 포함. 단정·과장 금지.`;

  if (!apiKey) {
    return {
      text: `${opts.childName} 어머니, 이번 주도 꾸준히 잘했어요! 발음이 또렷해지고 있어요. 다음 주엔 하루 한 권 더 도전해볼까요? (mock 초안)`,
      mock: true,
    };
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MICO_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { text: "(초안 생성 실패 — 다시 시도해 주세요)", mock: true };
    const data = (await res.json()) as { content?: { text?: string }[] };
    return { text: data.content?.[0]?.text ?? "...", mock: false };
  } catch {
    return { text: "(초안 생성 실패 — 다시 시도해 주세요)", mock: true };
  }
}
