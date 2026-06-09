import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReadAloudResponse } from "@umc/types";
import { color, fontSize, radius, space } from "@umc/ui";
import { useApp } from "@/lib/app-state";
import { callApi } from "@/lib/api";
import { setLastResult } from "@/lib/m1-store";
import { notify, errorMessage } from "@/lib/notify";
import { uploadRecording } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

interface BookBody {
  pages: { text: string }[];
}
type Phase = "reading" | "recording" | "scoring";

/**
 * M1 eBook 리더 + 소리내어읽기 (§6.2 F-M1-02/03).
 * 페이지를 넘기며 읽고, 마지막 페이지에서 전체 텍스트를 소리 내어 읽어 평가받는다.
 * (페이지별 평가 정밀화는 Phase 3+)
 */
export default function Reader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, child } = useApp();
  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<{ text: string }[] | null>(null);
  const [page, setPage] = useState(0);
  const [phase, setPhase] = useState<Phase>("reading");

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
        const body = data.body as unknown as BookBody | null;
        setPages(body?.pages ?? []);
      } catch (e) {
        notify("책 불러오기 실패", errorMessage(e));
        router.back();
      }
    })();
  }, [id, session, child]);

  async function startRecording() {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        notify(
          "마이크 권한이 필요해요",
          "소리 내어 읽기 평가를 하려면 설정에서 마이크를 허용해 주세요. 지금은 듣기 모드로 점수만 볼 수 있어요.",
        );
        await scoreAndGo(null);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase("recording");
    } catch (e) {
      notify("녹음 시작 실패", errorMessage(e));
    }
  }

  async function stopAndScore() {
    setPhase("scoring");
    let audioPath: string | null = null;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri && session && child) {
        try {
          audioPath = await uploadRecording({
            localUri: uri,
            userId: session.user.id,
            childId: child.id,
          });
        } catch (e) {
          // 업로드 실패해도 채점은 진행 — 단, 사용자에게 알림 (에러 UX 원칙)
          notify("녹음 저장 실패", `${errorMessage(e)}\n점수 평가는 계속 진행할게요.`);
        }
      }
    } catch (e) {
      notify("녹음 종료 실패", `${errorMessage(e)}\n점수 평가는 계속 진행할게요.`);
    }
    await scoreAndGo(audioPath);
  }

  async function scoreAndGo(audioPath: string | null) {
    if (!child || !pages) return;
    setPhase("scoring");
    try {
      const expectedText = pages.map((p) => p.text).join(" ");
      const data = await callApi<ReadAloudResponse>("/v1/learning/m1/read-aloud", {
        body: { childId: child.id, contentId: id, audioPath, expectedText },
      });
      setLastResult({ ...data, bookTitle: title });
      router.replace("/result");
    } catch (e) {
      setPhase("reading");
      notify("평가 실패", errorMessage(e));
    }
  }

  if (!pages) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  const isLast = page === pages.length - 1;
  const current = pages[page];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={phase !== "reading"}>
          <Text style={styles.back}>‹ 그만</Text>
        </Pressable>
        <Text style={styles.bookTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.pageNum}>
          {page + 1}/{pages.length}
        </Text>
      </View>

      <ScrollView style={styles.pageCard} contentContainerStyle={styles.pageInner}>
        <Text style={styles.pageText}>{current?.text}</Text>
      </ScrollView>

      {phase === "reading" && (
        <View style={styles.controls}>
          <Pressable
            style={[styles.navBtn, page === 0 && styles.navDisabled]}
            disabled={page === 0}
            onPress={() => setPage((p) => p - 1)}
          >
            <Text style={styles.navText}>‹ 이전</Text>
          </Pressable>
          {isLast ? (
            <Pressable style={styles.recordCta} onPress={startRecording}>
              <Text style={styles.recordCtaText}>🎤 소리 내어 읽기!</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.navBtnPrimary} onPress={() => setPage((p) => p + 1)}>
              <Text style={styles.navPrimaryText}>다음 ›</Text>
            </Pressable>
          )}
        </View>
      )}

      {phase === "recording" && (
        <View style={styles.controls}>
          <View style={styles.recordingPill}>
            <Text style={styles.recordingDot}>●</Text>
            <Text style={styles.recordingText}>처음부터 끝까지 읽어보세요!</Text>
          </View>
          <Pressable style={styles.stopCta} onPress={stopAndScore}>
            <Text style={styles.recordCtaText}>다 읽었어요 ✓</Text>
          </Pressable>
        </View>
      )}

      {phase === "scoring" && (
        <View style={styles.controls}>
          <ActivityIndicator size="large" color={color.accent} />
          <Text style={styles.scoringText}>미코가 듣고 있어요… 🦊</Text>
        </View>
      )}
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
  bookTitle: { flex: 1, textAlign: "center", fontWeight: "800", color: color.dark, fontSize: fontSize.body },
  pageNum: { color: color.dark, opacity: 0.6, fontWeight: "700" },
  pageCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    marginBottom: space.lg,
  },
  pageInner: { padding: space.xl, flexGrow: 1, justifyContent: "center" },
  pageText: {
    fontSize: 26,
    lineHeight: 40,
    fontWeight: "600",
    color: color.gray700,
    textAlign: "center",
  },
  controls: { paddingBottom: space.xl, gap: space.sm, alignItems: "stretch" },
  navBtn: {
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
    backgroundColor: "#ffffffaa",
  },
  navDisabled: { opacity: 0.4 },
  navText: { color: color.gray700, fontWeight: "700", fontSize: fontSize.bodyKid },
  navBtnPrimary: {
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
    backgroundColor: color.primary,
  },
  navPrimaryText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
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
  recordCtaText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  recordingPill: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.sm,
  },
  recordingDot: { color: color.danger, fontSize: 16 },
  recordingText: { color: color.dark, fontWeight: "700", fontSize: fontSize.body },
  scoringText: { textAlign: "center", color: color.dark, fontWeight: "700", marginTop: space.sm },
});
