import type { ReadAloudResult, WordScore } from "@umc/types";

/** 결정적 해시 — 같은 단어는 항상 같은 mock 점수 (데모/테스트 안정성) */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * M1 소리내어읽기 Mock 채점기.
 * 실연동 전(SpeechAce/Azure)까지 사용. 입력 텍스트만으로 그럴듯한 점수를 결정적으로 생성.
 */
export function mockReadAloud(expectedText: string): ReadAloudResult {
  const words = expectedText
    .replace(/[^A-Za-z' ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const wordScores: WordScore[] = words.map((w) => {
    const score = 40 + (hash(w.toLowerCase()) % 61); // 40~100, 결정적 (red<50 구간 포함)
    if (score >= 70) return { word: w, score, status: "correct" };
    return {
      word: w,
      score,
      status: "mispronounced",
      phonemes: [{ p: (w[0] ?? "?").toLowerCase(), score: Math.max(20, score - 20) }],
    };
  });

  const total = wordScores.reduce((a, b) => a + b.score, 0);
  const avg = wordScores.length ? Math.round(total / wordScores.length) : 0;
  const correct = wordScores.filter((w) => w.status === "correct").length;
  const wcr = wordScores.length ? Math.round((correct / wordScores.length) * 100) : 0;

  return {
    wcr,
    wcpm: Math.min(120, 40 + words.length * 4),
    prosody: Math.max(50, avg - 8),
    confidence: Math.max(55, avg - 4),
    wordScores,
    mock: true,
  };
}
