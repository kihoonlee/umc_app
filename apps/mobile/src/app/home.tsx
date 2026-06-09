import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { useApp } from "@/lib/app-state";
import { notify, errorMessage } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

/**
 * 아이 홈 — 미코 + 별·Streak(라이브 progress) + 오늘의 학습 카드 (§5.1).
 * 학습 카드 → M1 루프는 Phase 2 에서 연결.
 */
export default function KidHome() {
  const { session, child } = useApp();
  const [stars, setStars] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!child) {
      router.replace("/profiles");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("progress")
          .select("total_stars,streak_days")
          .eq("child_id", child.id)
          .single();
        if (error) throw error;
        setStars(data.total_stars);
        setStreak(data.streak_days);
      } catch (e) {
        setStars(0);
        setStreak(0);
        notify("진척 불러오기 실패", errorMessage(e));
      }
    })();
  }, [session, child]);

  if (!child) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace("/profiles")}>
          <Text style={styles.profileChip}>🧒 {child.name} ▾</Text>
        </Pressable>
        <View style={styles.statRow}>
          <Text style={styles.stat}>🔥 {streak ?? "…"}일</Text>
          <Text style={styles.stat}>⭐ {stars ?? "…"}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.mico}>🦊</Text>
        <Text style={styles.greeting}>{child.name}야, 오늘은 뭐 할까?</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>오늘의 학습 카드</Text>
        <Text style={styles.cardMain}>📖 책 1권 · 🎤 연따 1세트 · 🃏 단어 5장</Text>
        <Text style={styles.cardSub}>약 18분이면 끝나요</Text>
        <Pressable style={styles.cta} onPress={() => router.push("/books")}>
          <Text style={styles.ctaText}>시작하기</Text>
        </Pressable>
      </View>

      <Text style={styles.note}>M1 Reading Quest 열림 — 연따(M2)·단어 카드는 다음 업데이트!</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow, paddingHorizontal: space.lg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: space.md,
  },
  profileChip: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: color.dark,
    backgroundColor: "#ffffffaa",
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    overflow: "hidden",
  },
  statRow: { flexDirection: "row", gap: space.md },
  stat: { fontSize: fontSize.bodyKid, fontWeight: "700", color: color.dark },
  hero: { alignItems: "center", marginTop: space.lg, marginBottom: space.xl },
  mico: { fontSize: 88 },
  greeting: {
    fontSize: fontSize.heading,
    fontWeight: "800",
    color: color.dark,
    marginTop: space.sm,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.sm,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardLabel: { color: color.primary, fontWeight: "700", fontSize: fontSize.body },
  cardMain: { fontSize: fontSize.title, fontWeight: "700", color: color.gray700 },
  cardSub: { color: color.gray700, opacity: 0.6 },
  cta: {
    marginTop: space.sm,
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  note: {
    textAlign: "center",
    color: color.dark,
    opacity: 0.5,
    marginTop: space.xl,
    fontSize: fontSize.caption,
  },
});
