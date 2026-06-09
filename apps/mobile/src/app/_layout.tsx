import { Stack } from "expo-router";

/** 루트 레이아웃 — Phase 0 최소 Stack. 아이/엄마 탭·인증 가드는 Phase 1~2 에서 구성. */
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
