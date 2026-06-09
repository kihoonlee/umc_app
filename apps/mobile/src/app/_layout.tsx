import { Stack } from "expo-router";
import { AppProvider } from "@/lib/app-state";

/** 루트 레이아웃 — 세션/선택자녀 Provider + 미니멀 Stack. */
export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProvider>
  );
}
