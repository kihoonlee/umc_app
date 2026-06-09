/**
 * 디자인 토큰 — 상세 기획서 §12.2 + MVP §4.1.
 * 플랫폼 무관(순수 값). Expo(RN) · Next(web) 양쪽에서 import.
 */

export const color = {
  // Brand
  primary: "#2E75B6", // 신뢰 블루
  primaryLight: "#5B9BD5",
  accent: "#ED7D31", // 따뜻 오렌지
  success: "#548235",
  warning: "#FFC000",
  danger: "#C00000",
  dark: "#1F3864",
  gray50: "#F7F8FA",
  gray200: "#E5E7EB",
  gray700: "#374151",
  // Kid 보조 (캐릭터·보상 UI)
  kidPink: "#FF9AA2",
  kidYellow: "#FFE39C",
  kidGreen: "#B8E0B4",
  kidPurple: "#C7B8EA",
  // 발음 점수 단어 색상 (시스템 수치 가이드)
  scoreRed: "#C00000", // <50
  scoreYellow: "#FFC000", // 50~75
  scoreGreen: "#548235", // >75
} as const;

/** 4px 그리드 */
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 } as const;

export const font = {
  kid: '"Cafe24Ssurround", "Pretendard"',
  mom: '"Pretendard"',
  en: '"Inter", "SF Pro"',
} as const;

export const fontSize = {
  // 접근성: 최소 14px(아이 UI 18px)
  caption: 12,
  body: 14,
  bodyKid: 18,
  title: 20,
  heading: 28,
} as const;

/** 발음 점수(0~100) → 색상. 시스템 수치 가이드 red<50 / yellow 50~75 / green>75 */
export function scoreColor(score: number): string {
  if (score < 50) return color.scoreRed;
  if (score <= 75) return color.scoreYellow;
  return color.scoreGreen;
}

export type ColorToken = keyof typeof color;
