import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { useApp } from "@/lib/app-state";
import { callApi } from "@/lib/api";
import { notify, errorMessage } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

interface CardRow {
  id: string;
  word: string;
  interval_days: number;
  status: string;
}
interface RewardOut {
  reward: { starsEarned: number; totalStars: number; streakDays: number };
}

/**
 * Word Bank lite 복습 카드 (§6.5.1 단순화) — 오늘 due 카드 최대 5장.
 * 카드: 단어 + 🔊 발음 듣기 → 자가 채점(알아요/몰라요) → SRS 1→3→7→졸업.
 * 완료 시 word_review activity + 별 보상.
 */
export default function Words() {
  const { session, child } = useApp();
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState<RewardOut["reward"] | null>(null);

  useEffect(() => {
    if (!session || !child) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("word_card")
          .select("id,word,interval_days,status")
          .eq("child_id", child.id)
          .neq("status", "graduated")
          .lte("due_date", today)
          .order("due_date", { ascending: true })
          .limit(5);
        if (error) throw error;
        setCards((data as CardRow[]) ?? []);
      } catch (e) {
        setCards([]);
        notify("단어 카드 불러오기 실패", errorMessage(e));
      }
    })();
    return () => {
      void Speech.stop();
    };
  }, [session, child]);

  const card = cards?.[idx];

  async function grade(isCorrect: boolean) {
    if (!card || !child || busy) return;
    setBusy(true);
    try {
      await callApi(`/v1/word-cards/${card.id}/grade`, {
        body: { childId: child.id, correct: isCorrect },
      });
      const nextCorrect = correct + (isCorrect ? 1 : 0);
      setCorrect(nextCorrect);
      if (cards && idx < cards.length - 1) {
        setIdx((i) => i + 1);
      } else if (cards) {
        const out = await callApi<RewardOut>("/v1/learning/words/complete", {
          body: { childId: child.id, total: cards.length, correct: nextCorrect },
        });
        setReward(out.reward);
      }
    } catch (e) {
      notify("카드 채점 실패", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!cards) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  if (reward) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <Text style={styles.mico}>🎉</Text>
          <Text style={styles.title}>단어 복습 끝!</Text>
          <Text style={styles.desc}>
            {cards.length}장 중 {correct}장 기억했어요
          </Text>
          <View style={styles.rewardCard}>
            <Text style={styles.rewardText}>⭐ +{reward.starsEarned} (모두 {reward.totalStars}개)</Text>
            <Text style={styles.rewardSub}>🔥 연속 {reward.streakDays}일</Text>
          </View>
          <Pressable style={styles.cta} onPress={() => router.replace("/home")}>
            <Text style={styles.ctaText}>홈으로</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <Text style={styles.mico}>🦊</Text>
          <Text style={styles.title}>오늘 복습할 단어가 없어요!</Text>
          <Text style={styles.desc}>
            책을 읽으면 어려웠던 단어가 자동으로 단어장에 모여요. 내일 다시 만나요!
          </Text>
          <Pressable style={styles.cta} onPress={() => router.replace("/home")}>
            <Text style={styles.ctaText}>홈으로</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 홈</Text>
        </Pressable>
        <Text style={styles.headerTitle}>🃏 단어 복습</Text>
        <Text style={styles.count}>
          {idx + 1}/{cards.length}
        </Text>
      </View>

      <View style={styles.cardBox}>
        <Text style={styles.word}>{card?.word}</Text>
        <Pressable
          style={styles.listenBtn}
          onPress={() => card && Speech.speak(card.word, { language: "en-US", rate: 0.85 })}
        >
          <Text style={styles.listenText}>🔊 발음 듣기</Text>
        </Pressable>
        <Text style={styles.hint}>이 단어, 기억나요?</Text>
      </View>

      <View style={styles.gradeRow}>
        <Pressable
          style={[styles.gradeBtn, styles.noBtn, busy && { opacity: 0.5 }]}
          onPress={() => void grade(false)}
          disabled={busy}
        >
          <Text style={styles.gradeText}>🤔 몰라요</Text>
        </Pressable>
        <Pressable
          style={[styles.gradeBtn, styles.yesBtn, busy && { opacity: 0.5 }]}
          onPress={() => void grade(true)}
          disabled={busy}
        >
          <Text style={styles.gradeText}>😄 알아요!</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow, paddingHorizontal: space.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.kidYellow },
  centerBox: { flex: 1, justifyContent: "center", gap: space.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.md,
  },
  back: { color: color.primary, fontWeight: "700", fontSize: fontSize.bodyKid },
  headerTitle: { fontSize: fontSize.title, fontWeight: "800", color: color.dark },
  count: { color: color.dark, opacity: 0.6, fontWeight: "700" },
  cardBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
    marginBottom: space.lg,
  },
  word: { fontSize: 48, fontWeight: "900", color: color.gray700 },
  listenBtn: {
    backgroundColor: color.primary,
    borderRadius: radius.full,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm + 2,
  },
  listenText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  hint: { color: color.gray700, opacity: 0.5, fontSize: fontSize.body },
  gradeRow: { flexDirection: "row", gap: space.md, paddingBottom: space.xl },
  gradeBtn: {
    flex: 1,
    borderRadius: radius.xl,
    paddingVertical: space.lg,
    alignItems: "center",
  },
  noBtn: { backgroundColor: color.kidPink },
  yesBtn: { backgroundColor: color.kidGreen },
  gradeText: { fontWeight: "900", fontSize: fontSize.title, color: color.dark },
  mico: { fontSize: 72, textAlign: "center" },
  title: { fontSize: fontSize.heading, fontWeight: "800", color: color.dark, textAlign: "center" },
  desc: {
    textAlign: "center",
    color: color.dark,
    opacity: 0.7,
    fontSize: fontSize.bodyKid,
    lineHeight: 26,
  },
  rewardCard: {
    backgroundColor: color.kidGreen,
    borderRadius: radius.xl,
    padding: space.lg,
    alignItems: "center",
    gap: space.xs,
  },
  rewardText: { fontSize: fontSize.title, fontWeight: "900", color: color.dark },
  rewardSub: { fontSize: fontSize.bodyKid, fontWeight: "700", color: color.dark },
  cta: {
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
});
