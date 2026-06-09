import type { ActivityType, DailyPlanStatus } from "./domain";

/** 단어별 발음 점수 — 상세 기획서 §6.2.4 */
export interface WordScore {
  word: string;
  score: number; // 0~100
  status: "correct" | "mispronounced";
  phonemes?: { p: string; score: number }[];
}

/** M1 소리내어읽기 평가 결과 (Mock-first → 추후 SpeechAce/Azure) */
export interface ReadAloudResult {
  wcr: number; // 단어 정확도 %
  wcpm: number; // 분당 정확 단어 수
  prosody: number; // 운율
  confidence: number; // 자신감
  wordScores: WordScore[];
  /** mock 결과 여부 — 실연동 전 UI 가 표시할 수 있게 */
  mock: boolean;
}

export interface ReadAloudRequest {
  activityId?: string;
  childId: string;
  contentId?: string | null;
  /** Supabase Storage 의 녹음 파일 경로. 녹음/업로드 실패 시 null 허용(채점은 진행) */
  audioPath?: string | null;
  /** 정답 텍스트(해당 페이지/문장) */
  expectedText: string;
}

/** read-aloud 응답: 채점 결과 + 보상 */
export interface ReadAloudResponse {
  result: ReadAloudResult;
  reward: {
    starsEarned: number;
    totalStars: number;
    streakDays: number;
    streakExtended: boolean;
  };
}

/** 오늘의 학습 카드 (AI 일일 학습 계획) — Mock-first */
export interface DailyPlan {
  id: string;
  childId: string;
  planDate: string; // ISO date
  bookId: string | null;
  shadowClipId: string | null;
  wordCardIds: string[];
  status: DailyPlanStatus;
  estimatedMinutes: number;
}

export interface ActivityResult {
  id: string;
  sessionId: string;
  childId: string;
  contentId: string | null;
  type: ActivityType;
  pronunciationScore: number | null;
  wcpm: number | null;
  fluencyScore: number | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}
