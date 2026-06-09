import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReadAloudResponse } from "@umc/types";
import { color, fontSize, radius, scoreColor, space } from "@umc/ui";
import { takeLastResult } from "@/lib/m1-store";

/**
 * M1 발음 결과 + 보상 (§5.3 "M1 발음 결과"/"완료·보상" 화면 결합).
 * 점수·WCPM + 단어별 색상 피드백(red<50/yellow≤75/green>75) + 별·Streak.
 */
export default function Result() {
  const [data] = useState<(ReadAloudResponse & { bookTitle: string }) | null>(() =>
    takeLastResult(),
  );

  useEffect(() => {
    if (!data) router.replace("/home");
  }, [data]);
  if (!data) return null;

  const { result, reward, bookTitle } = data;
  const praise =
    result.wcr >= 80 ? "정말 멋지게 읽었어!" : result.wcr >= 60 ? "잘했어! 점점 좋아지고 있어!" : "도전한 것만으로 최고야!";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.mico}>🦊</Text>
          <Text style={styles.praise}>{praise}</Text>
          <Text style={styles.book}>『{bookTitle}』</Text>
          {result.mock && <Text style={styles.mockBadge}>연습 채점 모드</Text>}
        </View>

        <View style={styles.scoreCard}>
          <Text style={styles.bigScore}>{result.wcr}점</Text>
          <View style={styles.metricsRow}>
            <Metric label="속도" value={`${result.wcpm} WPM`} />
            <Metric label="리듬" value={`${result.prosody}`} />
            <Metric label="자신감" value={`${result.confidence}`} />
          </View>
        </View>

        <View style={styles.wordsCard}>
          <Text style={styles.sectionTitle}>단어별 발음</Text>
          <View style={styles.wordsWrap}>
            {result.wordScores.map((w, i) => (
              <View key={`${w.word}-${i}`} style={[styles.chip, { borderColor: scoreColor(w.score) }]}>
                <Text style={[styles.chipText, { color: scoreColor(w.score) }]}>{w.word}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.rewardCard}>
          <Text style={styles.rewardTitle}>
            ⭐ +{reward.starsEarned}  (모두 {reward.totalStars}개)
          </Text>
          <Text style={styles.rewardStreak}>
            🔥 연속 {reward.streakDays}일{reward.streakExtended ? " — 이어가고 있어요!" : ""}
          </Text>
        </View>

        <Pressable style={styles.cta} onPress={() => router.replace("/home")}>
          <Text style={styles.ctaText}>홈으로</Text>
        </Pressable>
        <Pressable style={styles.again} onPress={() => router.replace("/books")}>
          <Text style={styles.againText}>다른 책 읽기</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow },
  scroll: { padding: space.lg, gap: space.md },
  hero: { alignItems: "center", marginTop: space.sm },
  mico: { fontSize: 72 },
  praise: { fontSize: fontSize.heading, fontWeight: "800", color: color.dark, marginTop: space.xs },
  book: { color: color.dark, opacity: 0.7, marginTop: 2 },
  mockBadge: {
    marginTop: space.xs,
    fontSize: fontSize.caption,
    color: color.gray700,
    backgroundColor: "#ffffffaa",
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    overflow: "hidden",
  },
  scoreCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: space.lg,
    alignItems: "center",
    gap: space.md,
  },
  bigScore: { fontSize: 56, fontWeight: "900", color: color.primary },
  metricsRow: { flexDirection: "row", gap: space.xl },
  metric: { alignItems: "center" },
  metricValue: { fontSize: fontSize.title, fontWeight: "800", color: color.gray700 },
  metricLabel: { fontSize: fontSize.caption, color: color.gray700, opacity: 0.6 },
  wordsCard: { backgroundColor: "#fff", borderRadius: radius.xl, padding: space.lg, gap: space.sm },
  sectionTitle: { fontWeight: "800", color: color.gray700, fontSize: fontSize.body },
  wordsWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs + 2 },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
  },
  chipText: { fontWeight: "700", fontSize: fontSize.body },
  rewardCard: {
    backgroundColor: color.kidGreen,
    borderRadius: radius.xl,
    padding: space.lg,
    alignItems: "center",
    gap: space.xs,
  },
  rewardTitle: { fontSize: fontSize.title, fontWeight: "900", color: color.dark },
  rewardStreak: { fontSize: fontSize.bodyKid, fontWeight: "700", color: color.dark },
  cta: {
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  again: { alignItems: "center", paddingVertical: space.xs },
  againText: { color: color.primary, fontWeight: "700" },
});
