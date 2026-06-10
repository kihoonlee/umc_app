/**
 * 진단(D0) 점수 → CEFR/Lexile 매핑 (시스템 수치 가이드 — 초기 권장값, 베타 후 보정).
 * 3문항(난이도 오름차순) 평균/통과 기반 단순 룰. 통과 임계 60.
 */
export interface DiagnosticResult {
  cefr: "Pre-A1" | "A1" | "A2";
  lexile: number;
}

export function mapDiagnostic(scores: number[]): DiagnosticResult {
  const [s1 = 0, s2 = 0, s3 = 0] = scores;
  const PASS = 60;
  if (s1 < PASS) return { cefr: "Pre-A1", lexile: 150 };
  if (s2 < PASS) return { cefr: "Pre-A1", lexile: 250 };
  if (s3 < PASS) return { cefr: "A1", lexile: 350 };
  // 전부 통과 — 평균으로 상단 구간
  const avg = (s1 + s2 + s3) / 3;
  return avg >= 80 ? { cefr: "A2", lexile: 550 } : { cefr: "A1", lexile: 450 };
}
