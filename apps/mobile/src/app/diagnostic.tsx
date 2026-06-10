import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReadAloudResult } from "@umc/types";
import { color, fontSize, radius, space } from "@umc/ui";
import { useApp } from "@/lib/app-state";
import { callApi } from "@/lib/api";
import { notify, errorMessage } from "@/lib/notify";

/** 진단 문항 — 난이도 오름차순 3개 (파닉스 단어 → 짧은 문장 → 긴 문장). 베타 후 문항 세트 교체. */
const ITEMS = [
  { label: "단어 읽기", text: "cat dog sun big red" },
  { label: "짧은 문장", text: "I like my little dog." },
  { label: "긴 문장", text: "Today we go to the park and play together." },
];

type Phase = "intro" | "ready" | "recording" | "scoring" | "done";

/**
 * 레벨 진단 D0 (§3.2 온보딩) — 3문항 소리내어읽기 → mock 채점 → CEFR/Lexile 산정.
 * 읽기 전 아동 대응: 각 문항을 미코 음성(TTS)으로 먼저 들려줄 수 있음.
 */
export default function Diagnostic() {
  const { session, child, selectChild } = useApp();
  const [phase, setPhase] = useState<Phase>("intro");
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [level, setLevel] = useState<{ cefr: string; lexile: number } | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const item = ITEMS[idx];

  async function startRec() {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        notify("마이크 권한이 필요해요", "진단을 위해 마이크를 허용해 주세요.");
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

  async function stopAndNext() {
    if (!item || !child) return;
    setPhase("scoring");
    try {
      await recorder.stop();
    } catch {
      // 종료 실패해도 채점 진행
    }
    try {
      const r = await callApi<ReadAloudResult>("/v1/learning/m2/shadow/evaluate", {
        body: { segmentText: item.text },
      });
      const next = [...scores, r.wcr];
      setScores(next);
      if (idx < ITEMS.length - 1) {
        setIdx((i) => i + 1);
        setPhase("ready");
      } else {
        const result = await callApi<{ cefr: string; lexile: number }>(
          `/v1/children/${child.id}/diagnostic`,
          { body: { scores: next } },
        );
        setLevel(result);
        setPhase("done");
        // 선택 자녀 정보 유지(onboarded 플래그 보존 — 완료는 보상 단계에서)
        await selectChild({ ...child });
      }
    } catch (e) {
      setPhase("ready");
      notify("진단 평가 실패", errorMessage(e));
    }
  }

  if (!child) {
    router.replace("/");
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      {phase === "intro" && (
        <View style={styles.centerBox}>
          <Text style={styles.mico}>🦊</Text>
          <Text style={styles.title}>{child.name}의 영어 레벨을 알아볼까?</Text>
          <Text style={styles.desc}>
            3개만 소리 내어 읽으면 끝! 미코가 듣고 딱 맞는 책을 골라줄게요. (약 2분)
          </Text>
          <Pressable style={styles.cta} onPress={() => setPhase("ready")}>
            <Text style={styles.ctaText}>시작!</Text>
          </Pressable>
          <Pressable
            style={styles.skip}
            onPress={() => router.replace(child.onboarded ? "/home" : "/plan-preview")}
          >
            <Text style={styles.skipText}>나중에 할래요</Text>
          </Pressable>
        </View>
      )}

      {(phase === "ready" || phase === "recording" || phase === "scoring") && item && (
        <View style={styles.centerBox}>
          <Text style={styles.step}>
            {idx + 1} / {ITEMS.length} — {item.label}
          </Text>
          <View style={styles.itemCard}>
            <Text style={styles.itemText}>{item.text}</Text>
          </View>

          {phase === "ready" && (
            <>
              <Pressable
                style={styles.listenBtn}
                onPress={() => Speech.speak(item.text, { language: "en-US", rate: 0.85 })}
              >
                <Text style={styles.listenText}>▶ 먼저 들어보기</Text>
              </Pressable>
              <Pressable style={styles.cta} onPress={startRec}>
                <Text style={styles.ctaText}>🎤 읽기 시작</Text>
              </Pressable>
            </>
          )}
          {phase === "recording" && (
            <Pressable style={styles.stopCta} onPress={stopAndNext}>
              <Text style={styles.ctaText}>다 읽었어요 ✓</Text>
            </Pressable>
          )}
          {phase === "scoring" && (
            <View style={{ alignItems: "center", gap: space.sm }}>
              <ActivityIndicator size="large" color={color.accent} />
              <Text style={styles.desc}>미코가 듣고 있어요…</Text>
            </View>
          )}
        </View>
      )}

      {phase === "done" && level && (
        <View style={styles.centerBox}>
          <Text style={styles.mico}>🎉</Text>
          <Text style={styles.title}>진단 완료!</Text>
          <View style={styles.levelCard}>
            <Text style={styles.levelText}>{level.cefr}</Text>
            <Text style={styles.lexileText}>Lexile {level.lexile}L</Text>
          </View>
          <Text style={styles.desc}>
            이제 {child.name}에게 딱 맞는 책과 연따를 추천해줄게요!
          </Text>
          <Pressable
            style={styles.cta}
            onPress={() => router.replace(child.onboarded ? "/home" : "/plan-preview")}
          >
            <Text style={styles.ctaText}>{child.onboarded ? "학습 시작하기" : "다음"}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow, paddingHorizontal: space.lg },
  centerBox: { flex: 1, justifyContent: "center", gap: space.md },
  mico: { fontSize: 72, textAlign: "center" },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "800",
    color: color.dark,
    textAlign: "center",
  },
  desc: { textAlign: "center", color: color.dark, opacity: 0.7, fontSize: fontSize.bodyKid, lineHeight: 26 },
  step: { textAlign: "center", color: color.primary, fontWeight: "800", fontSize: fontSize.body },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: space.xl,
    minHeight: 140,
    justifyContent: "center",
  },
  itemText: { fontSize: 26, lineHeight: 40, fontWeight: "700", color: color.gray700, textAlign: "center" },
  listenBtn: {
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
    backgroundColor: color.primary,
  },
  listenText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  cta: {
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md + 2,
    alignItems: "center",
  },
  stopCta: {
    backgroundColor: color.danger,
    borderRadius: radius.full,
    paddingVertical: space.md + 2,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  skip: { alignItems: "center", paddingVertical: space.xs },
  skipText: { color: color.gray700, opacity: 0.6 },
  levelCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    paddingVertical: space.lg,
    alignItems: "center",
    gap: space.xs,
  },
  levelText: { fontSize: 44, fontWeight: "900", color: color.primary },
  lexileText: { fontSize: fontSize.title, fontWeight: "700", color: color.gray700, opacity: 0.8 },
});
