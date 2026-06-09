/**
 * 도메인 enum / 엔티티 — 데이터 모델은 두 기획서 reconcile 결과 (supabase/migrations 와 일치 유지).
 */

export type UserRole = "parent" | "coach" | "admin";

export type ContentType = "ebook" | "shadow_clip"; // movie_book 은 2차

export type ActivityType = "m1_read" | "m2_shadow" | "m2_dialog" | "word_review";

export type DailyPlanStatus = "pending" | "in_progress" | "done";

export type WordCardStatus = "learning" | "review" | "graduated";

export type SubscriptionStatus = "trialing" | "active" | "canceled" | "past_due";

export type CefrLevel = "Pre-A1" | "A1" | "A2" | "B1";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: string;
}

export interface Child {
  id: string;
  parentId: string;
  coachId: string | null;
  name: string;
  birthDate: string; // ISO date
  cefrLevel: CefrLevel | null;
  lexile: number | null;
  /** 미코 표정·꾸미기 상태 */
  micoState: Record<string, unknown>;
  createdAt: string;
}

export interface Content {
  id: string;
  type: ContentType;
  title: string;
  cefrLevel: CefrLevel | null;
  lexile: number | null;
  /** 본문/스크립트/구간 타임스탬프 */
  body: Record<string, unknown> | null;
  createdAt: string;
}

export interface Progress {
  childId: string;
  totalStars: number;
  streakDays: number;
  lastActive: string | null;
  stickers: string[];
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string; // 'standard'
  status: SubscriptionStatus;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}
