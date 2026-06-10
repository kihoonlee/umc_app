import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { MicoHero } from "@/components/mico-hero";
import { useApp } from "@/lib/app-state";
import { notify, errorMessage } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

/**
 * 온보딩 3 — 미니 첫 학습(튜토리얼). 추천 책 1페이지를 "같이 읽고" 탭으로 완료.
 * 마이크/채점 없음 — 첫 성공 경험만 보장 (실제 녹음은 정식 M1에서).
 */
export default function Tutorial() {
  const { session, child } = useApp();
  const [pageText, setPageText] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !child) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("content")
          .select("body")
          .eq("type", "ebook")
          .order("lexile", { ascending: true })
          .limit(1)
          .single();
        if (error) throw error;
        const body = data.body as unknown as { pages?: { text: string }[] } | null;
        setPageText(body?.pages?.[0]?.text ?? "I can read English!");
      } catch (e) {
        notify("튜토리얼 준비 실패", errorMessage(e));
        setPageText("I can read English!");
      }
    })();
  }, [session, child]);

  if (!child || pageText === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <MicoHero size={56} />
        <Text style={styles.guide}>미코랑 같이 읽어볼까? 큰 소리로 따라 읽어 봐!</Text>
      </View>

      <View style={styles.pageCard}>
        <Text style={styles.pageText}>{pageText}</Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.hint}>다 읽었으면 아래 버튼을 눌러줘 👇</Text>
        <Pressable style={styles.cta} onPress={() => router.replace("/onboarding-reward")}>
          <Text style={styles.ctaText}>나도 읽었어! ✓</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow, paddingHorizontal: space.lg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.kidYellow },
  header: { alignItems: "center", paddingTop: space.lg, gap: space.sm },
  guide: { fontSize: fontSize.bodyKid, fontWeight: "700", color: color.dark, textAlign: "center" },
  pageCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    marginVertical: space.lg,
    padding: space.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  pageText: {
    fontSize: 30,
    lineHeight: 46,
    fontWeight: "700",
    color: color.gray700,
    textAlign: "center",
  },
  bottom: { paddingBottom: space.xl, gap: space.sm },
  hint: { textAlign: "center", color: color.dark, opacity: 0.6, fontSize: fontSize.body },
  cta: {
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md + 4,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: fontSize.title },
});
