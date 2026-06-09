import type { ReadAloudResponse } from "@umc/types";

/**
 * M1 결과 전달용 초경량 스토어 — 리더 → 결과 화면 간 라우터 파라미터로
 * 큰 JSON 을 넘기지 않기 위한 모듈 변수. (Phase 3+ 에서 상태관리 도입 시 대체)
 */
let lastResult: (ReadAloudResponse & { bookTitle: string }) | null = null;

export function setLastResult(r: ReadAloudResponse & { bookTitle: string }) {
  lastResult = r;
}

export function takeLastResult() {
  const r = lastResult;
  return r;
}
