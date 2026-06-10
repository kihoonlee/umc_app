import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { MicoHero } from "@/components/mico-hero";
import { useApp } from "@/lib/app-state";
import { callApi } from "@/lib/api";
import { notify, errorMessage } from "@/lib/notify";

/**
 * 온보딩 1 — 미코 첫 인사 + 무료 체험 시작 (§3.2). 텍스트 전용(음성 없음).
 * 마이크 권한은 요구하지 않음 — 따뜻한 환영만.
 */
export default function Welcome() {
  const { session, child } = useApp();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) router.replace("/login");
    else if (!child) router.replace("/profiles");
  }, [session, child]);

  if (!child) return null;

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      // 무료 체험 시작 (멱등). 실패해도 온보딩은 계속 — 알림만.
      await callApi("/v1/subscriptions/trial", { body: {} }).catch((e) => {
        notify("체험 시작 안내", `${errorMessage(e)}\n그래도 학습은 계속할 수 있어요.`);
      });
      router.replace("/diagnostic");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <MicoHero size={120} />
        <Text style={styles.greeting}>안녕, {child.name}!</Text>
        <Text style={styles.body}>
          나는 미코야. 🦊{"\n"}우리 매일 영어로 같이 놀자!
        </Text>

        <View style={styles.freeBadge}>
          <Text style={styles.freeText}>🎁 지금 무료로 시작해요</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable style={styles.cta} onPress={start} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>좋아! 시작하자</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow, paddingHorizontal: space.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
  greeting: { fontSize: 36, fontWeight: "900", color: color.dark },
  body: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: color.dark,
    textAlign: "center",
    lineHeight: 38,
  },
  freeBadge: {
    marginTop: space.md,
    backgroundColor: color.kidGreen,
    borderRadius: radius.full,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  freeText: { fontWeight: "800", color: color.dark, fontSize: fontSize.bodyKid },
  bottom: { paddingBottom: space.xl },
  cta: {
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md + 4,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: fontSize.title },
});
