import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { useApp } from "@/lib/app-state";
import { callApi } from "@/lib/api";
import { notify, errorMessage } from "@/lib/notify";

interface OnboardOut {
  already: boolean;
  starsEarned: number;
  totalStars: number;
  sticker: string;
}

const CONFETTI = ["⭐", "🎉", "✨", "🌟", "🎊", "⭐", "✨", "🎉"];

/** 떨어지는 이모지 컨페티 (라이브러리 없이 RN Animated 플레이스홀더) */
function Confetti() {
  const vals = useRef(CONFETTI.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const anims = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(v, {
            toValue: 1,
            duration: 2200,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [vals]);

  return (
    <View pointerEvents="none" style={styles.confettiLayer}>
      {CONFETTI.map((e, i) => {
        const left = `${6 + (i * 88) / CONFETTI.length}%` as `${number}%`;
        const translateY = vals[i]!.interpolate({ inputRange: [0, 1], outputRange: [-40, 520] });
        const opacity = vals[i]!.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] });
        return (
          <Animated.Text key={i} style={[styles.confetti, { left, transform: [{ translateY }], opacity }]}>
            {e}
          </Animated.Text>
        );
      })}
    </View>
  );
}

/**
 * 온보딩 4 — 첫 보상 의식 (§3.2). 첫 별 + 첫 스티커 지급 + onboarded=true.
 * Worker /v1/onboarding/complete 멱등 호출.
 */
export default function OnboardingReward() {
  const { session, child, selectChild } = useApp();
  const [out, setOut] = useState<OnboardOut | null>(null);
  const pop = useRef(new Animated.Value(0.5)).current;
  const startedRef = useRef(false);

  useEffect(() => {
    if (!session || !child) {
      router.replace("/");
      return;
    }
    // selectChild 가 child 를 갱신해 effect 가 재실행되므로 1회만 보상 처리
    if (startedRef.current) return;
    startedRef.current = true;
    const childId = child.id;
    (async () => {
      try {
        const r = await callApi<OnboardOut>("/v1/onboarding/complete", {
          body: { childId },
        });
        setOut(r);
        await selectChild({ ...child, onboarded: true });
      } catch (e) {
        notify("보상 처리 실패", errorMessage(e));
        // 실패해도 홈 진입은 허용 — 단, onboarded 표시는 그대로(다음에 재시도)
        setOut({ already: false, starsEarned: 0, totalStars: 0, sticker: "welcome" });
      }
    })();
  }, [session, child]);

  useEffect(() => {
    if (out) {
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: false }).start();
    }
  }, [out, pop]);

  if (!child || !out) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Confetti />
      <View style={styles.center}>
        <Animated.Text style={[styles.party, { transform: [{ scale: pop }] }]}>🎉</Animated.Text>
        <Text style={styles.title}>축하해, {child.name}!</Text>
        <Text style={styles.sub}>첫 학습을 끝냈어! 🦊</Text>

        <View style={styles.rewardCard}>
          <Text style={styles.rewardStar}>⭐ +{out.starsEarned}</Text>
          <Text style={styles.rewardLabel}>첫 별 획득!</Text>
          <View style={styles.stickerRow}>
            <Text style={styles.sticker}>🏅</Text>
            <Text style={styles.stickerLabel}>첫 스티커 잠금 해제</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable style={styles.cta} onPress={() => router.replace("/home")}>
          <Text style={styles.ctaText}>매일 미코랑 놀기! 🦊</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow, paddingHorizontal: space.lg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.kidYellow },
  confettiLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  confetti: { position: "absolute", top: 0, fontSize: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm, zIndex: 2 },
  party: { fontSize: 96 },
  title: { fontSize: 34, fontWeight: "900", color: color.dark },
  sub: { fontSize: fontSize.heading, fontWeight: "700", color: color.dark },
  rewardCard: {
    marginTop: space.lg,
    backgroundColor: color.kidGreen,
    borderRadius: radius.xl,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    alignItems: "center",
    gap: space.xs,
  },
  rewardStar: { fontSize: 40, fontWeight: "900", color: color.dark },
  rewardLabel: { fontSize: fontSize.bodyKid, fontWeight: "800", color: color.dark },
  stickerRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  sticker: { fontSize: 28 },
  stickerLabel: { fontWeight: "700", color: color.dark, fontSize: fontSize.body },
  bottom: { paddingBottom: space.xl, zIndex: 2 },
  cta: {
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md + 4,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: fontSize.title },
});
