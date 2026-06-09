import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReadAloudResponse, ReadAloudResult } from "@umc/types";
import { color, fontSize, radius, scoreColor, space } from "@umc/ui";
import { useApp } from "@/lib/app-state";
import { callApi } from "@/lib/api";
import { setLastResult } from "@/lib/m1-store";
import { notify, errorMessage } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

interface Segment {
  start: number;
  end: number;
  text: string;
}
type SegPhase = "idle" | "recording" | "scoring" | "scored";

/**
 * M2 Shadow Player (§6.3 F-M2-01) — 구간별: ▶ 듣기(TTS) → 🎤 따라말하기 → 즉시 점수.
 * 원어민 음성 에셋 등록 전까지 expo-speech TTS 가 원본 음성을 대신한다 (Mock-first).
 * 모든 구간 완료 시 1회 제출 → activity(m2_shadow) 영속 + 별·Streak 보상.
 */
export default function ShadowPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, child } = useApp();
  const [title, setTitle] = useState("");
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<SegPhase>("idle");
  const [segScore, setSegScore] = useState<ReadAloudResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    if (!session || !child) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("content")
          .select("title,body")
          .eq("id", id)
          .single();
        if (error) throw error;
        setTitle(data.title);
        const body = data.body as unknown as { segments?: Segment[] } | null;
        setSegments(body?.segments ?? []);
      } catch (e) {
        notify("클립 불러오기 실패", errorMessage(e));
        router.back();
      }
    })();
    return () => {
      Speech.stop();
    };
  }, [id, session, child]);

  const seg = segments?.[idx];

  function listen() {
    if (!seg) return;
    Speech.stop();
    Speech.speak(seg.text, { language: "en-US", rate: 0.9 });
  }

  async function startShadow() {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        notify("마이크 권한이 필요해요", "따라말하기 평가를 하려면 마이크를 허용해 주세요.");
        return;
      }
      Speech.stop();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase("recording");
    } catch (e) {
      notify("녹음 시작 실패", errorMessage(e));
    }
  }

  async function stopShadow() {
    if (!seg) return;
    setPhase("scoring");
    try {
      await recorder.stop();
    } catch {
      // 녹음 종료 실패해도 채점 진행
    }
    try {
      const r = await callApi<ReadAloudResult>("/v1/learning/m2/shadow/evaluate", {
        body: { segmentText: seg.text },
      });
      setSegScore(r);
      setPhase("scored");
    } catch (e) {
      setPhase("idle");
      notify("평가 실패", errorMessage(e));
    }
  }

  async function nextOrFinish() {
    if (!segments || !child) return;
    if (idx < segments.length - 1) {
      setIdx((i) => i + 1);
      setSegScore(null);
      setPhase("idle");
      return;
    }
    // 마지막 구간 → 클립 완료 제출 (보상 1회)
    setSubmitting(true);
    try {
      const fullText = segments.map((s) => s.text).join(" ");
      const data = await callApi<ReadAloudResponse>("/v1/learning/m2/shadow", {
        body: { childId: child.id, contentId: id, audioPath: null, fullText },
      });
      setLastResult({ ...data, bookTitle: title });
      router.replace("/result");
    } catch (e) {
      setSubmitting(false);
      notify("결과 저장 실패", errorMessage(e));
    }
  }

  if (!segments) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={submitting}>
          <Text style={styles.back}>‹ 그만</Text>
        </Pressable>
        <Text style={styles.clipTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.segNum}>
          {idx + 1}/{segments.length}
        </Text>
      </View>

      <ScrollView style={styles.segCard} contentContainerStyle={styles.segInner}>
        <Text style={styles.micoSmall}>🦊 따라 말해볼까?</Text>
        <Text style={styles.segText}>{seg?.text}</Text>

        {phase === "scored" && segScore && (
          <View style={styles.scoreBox}>
            <Text style={[styles.segScoreText, { color: scoreColor(segScore.wcr) }]}>
              {segScore.wcr}점
            </Text>
            <View style={styles.wordsWrap}>
              {segScore.wordScores.map((w, i) => (
                <Text key={`${w.word}-${i}`} style={[styles.word, { color: scoreColor(w.score) }]}>
                  {w.word}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.controls}>
        {phase === "idle" && (
          <>
            <Pressable style={styles.listenBtn} onPress={listen}>
              <Text style={styles.listenText}>▶ 듣기</Text>
            </Pressable>
            <Pressable style={styles.recordCta} onPress={startShadow}>
              <Text style={styles.ctaText}>🎤 따라말하기</Text>
            </Pressable>
          </>
        )}

        {phase === "recording" && (
          <Pressable style={styles.stopCta} onPress={stopShadow}>
            <Text style={styles.ctaText}>다 했어요 ✓</Text>
          </Pressable>
        )}

        {phase === "scoring" && (
          <View style={styles.scoringRow}>
            <ActivityIndicator size="large" color={color.accent} />
            <Text style={styles.scoringText}>미코가 듣고 있어요… 🦊</Text>
          </View>
        )}

        {phase === "scored" && (
          <>
            <Pressable
              style={styles.listenBtn}
              onPress={() => {
                setSegScore(null);
                setPhase("idle");
              }}
            >
              <Text style={styles.listenText}>↻ 다시 해보기</Text>
            </Pressable>
            <Pressable style={styles.recordCta} onPress={nextOrFinish} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>
                  {idx < segments.length - 1 ? "다음 구간 ›" : "🎉 완료!"}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow, paddingHorizontal: space.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.kidYellow },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.md,
    gap: space.sm,
  },
  back: { color: color.primary, fontWeight: "700", fontSize: fontSize.bodyKid },
  clipTitle: { flex: 1, textAlign: "center", fontWeight: "800", color: color.dark, fontSize: fontSize.body },
  segNum: { color: color.dark, opacity: 0.6, fontWeight: "700" },
  segCard: { flex: 1, backgroundColor: "#fff", borderRadius: radius.xl, marginBottom: space.lg },
  segInner: { padding: space.xl, flexGrow: 1, justifyContent: "center", gap: space.md },
  micoSmall: { textAlign: "center", color: color.gray700, opacity: 0.7, fontWeight: "700" },
  segText: {
    fontSize: 28,
    lineHeight: 42,
    fontWeight: "700",
    color: color.gray700,
    textAlign: "center",
  },
  scoreBox: { alignItems: "center", gap: space.sm, marginTop: space.sm },
  segScoreText: { fontSize: 44, fontWeight: "900" },
  wordsWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" },
  word: { fontWeight: "800", fontSize: fontSize.bodyKid },
  controls: { paddingBottom: space.xl, gap: space.sm },
  listenBtn: {
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
    backgroundColor: color.primary,
  },
  listenText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  recordCta: {
    borderRadius: radius.full,
    paddingVertical: space.md + 2,
    alignItems: "center",
    backgroundColor: color.accent,
  },
  stopCta: {
    borderRadius: radius.full,
    paddingVertical: space.md + 2,
    alignItems: "center",
    backgroundColor: color.danger,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  scoringRow: { alignItems: "center", gap: space.sm, paddingVertical: space.sm },
  scoringText: { color: color.dark, fontWeight: "700" },
});
