import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { MicoHero } from "@/components/mico-hero";
import { useApp } from "@/lib/app-state";
import { notify, errorMessage } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

interface BookRow {
  id: string;
  title: string;
  cefr_level: string | null;
  lexile: number | null;
}

const WEEKS = [
  { w: "1주차", goal: "책 3권 + 연따 2세트", emoji: "📖" },
  { w: "2주차", goal: "책 4권 + 연따 3세트", emoji: "🎤" },
  { w: "3주차", goal: "책 5권 + 단어 20개", emoji: "🃏" },
  { w: "4주차", goal: "미코랑 자유 대화 도전!", emoji: "🦊" },
];

/**
 * 온보딩 2 — 레벨 산정 결과 + 추천 첫 책 + 4주 계획 미리보기 (§3.2).
 * 4주 계획은 현재 mock(정적). AI 일일 계획 실데이터화는 후속.
 */
export default function PlanPreview() {
  const { session, child } = useApp();
  const [level, setLevel] = useState<{ cefr: string | null; lexile: number | null } | null>(null);
  const [book, setBook] = useState<BookRow | null>(null);

  useEffect(() => {
    if (!session || !child) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const [cRes, bRes] = await Promise.all([
          supabase.from("children").select("cefr_level,lexile").eq("id", child.id).single(),
          supabase
            .from("content")
            .select("id,title,cefr_level,lexile")
            .eq("type", "ebook")
            .order("lexile", { ascending: true }),
        ]);
        if (cRes.error) throw cRes.error;
        setLevel({ cefr: cRes.data.cefr_level, lexile: cRes.data.lexile });
        const books = (bRes.data as BookRow[]) ?? [];
        const lex = cRes.data.lexile ?? 200;
        // 레벨 이하 중 가장 가까운 책, 없으면 첫 책
        const pick =
          [...books].reverse().find((b) => (b.lexile ?? 0) <= lex) ?? books[0] ?? null;
        setBook(pick);
      } catch (e) {
        notify("추천 불러오기 실패", errorMessage(e));
        setLevel({ cefr: null, lexile: null });
      }
    })();
  }, [session, child]);

  if (!child || level === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <MicoHero size={72} />
        <Text style={styles.title}>딱 맞는 걸 골랐어!</Text>
        {level.cefr && (
          <Text style={styles.levelLine}>
            {child.name}의 레벨: <Text style={styles.levelStrong}>{level.cefr}</Text>
            {level.lexile ? ` · ${level.lexile}L` : ""}
          </Text>
        )}

        {book && (
          <View style={styles.bookCard}>
            <Text style={styles.bookLabel}>📚 첫 번째 책</Text>
            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.bookMeta}>{book.cefr_level ?? ""}{book.lexile ? ` · ${book.lexile}L` : ""}</Text>
          </View>
        )}

        <Text style={styles.planTitle}>📅 4주 계획</Text>
        <View style={styles.weeks}>
          {WEEKS.map((w) => (
            <View key={w.w} style={styles.weekRow}>
              <Text style={styles.weekEmoji}>{w.emoji}</Text>
              <View style={styles.flex}>
                <Text style={styles.weekName}>{w.w}</Text>
                <Text style={styles.weekGoal}>{w.goal}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={styles.cta} onPress={() => router.replace("/tutorial")}>
          <Text style={styles.ctaText}>시작해볼래!</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.kidYellow },
  scroll: { padding: space.lg, gap: space.md, alignItems: "stretch" },
  title: { fontSize: fontSize.heading, fontWeight: "900", color: color.dark, textAlign: "center" },
  levelLine: { textAlign: "center", color: color.dark, fontSize: fontSize.bodyKid },
  levelStrong: { fontWeight: "900", color: color.primary },
  bookCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: space.lg,
    gap: 4,
    alignItems: "center",
  },
  bookLabel: { color: color.primary, fontWeight: "700" },
  bookTitle: { fontSize: fontSize.title, fontWeight: "800", color: color.gray700, textAlign: "center" },
  bookMeta: { color: color.gray700, opacity: 0.6, fontSize: fontSize.caption },
  planTitle: { fontSize: fontSize.title, fontWeight: "800", color: color.dark, marginTop: space.xs },
  weeks: { gap: space.sm },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: "#ffffffcc",
    borderRadius: radius.lg,
    padding: space.md,
  },
  weekEmoji: { fontSize: 28 },
  flex: { flex: 1 },
  weekName: { fontWeight: "800", color: color.gray700, fontSize: fontSize.body },
  weekGoal: { color: color.gray700, opacity: 0.7, fontSize: fontSize.body },
  cta: {
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md + 4,
    alignItems: "center",
    marginTop: space.sm,
  },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: fontSize.title },
});
