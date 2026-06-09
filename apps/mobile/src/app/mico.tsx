import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { useApp } from "@/lib/app-state";
import { callApi } from "@/lib/api";
import { notify, errorMessage } from "@/lib/notify";

interface Msg {
  id: string;
  role: "user" | "mico";
  text: string;
  mock?: boolean;
}

const MAX_TURNS = 10; // 1세션 최대 10턴 (상세 기획서 F-M2-03)

/** 미코와 자유 대화 — LLM(워커 프록시). 키 미설정 시 mock 응답. 미코 답변은 TTS 로 읽어줌. */
export default function MicoChat() {
  const { session, child } = useApp();
  const [messages, setMessages] = useState<Msg[]>([
    { id: "hello", role: "mico", text: "Hi! I'm Mico! 🦊 Let's talk in English!" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const turnsLeft = MAX_TURNS - userTurns;

  useEffect(() => {
    if (!session || !child) router.replace("/");
    return () => {
      Speech.stop();
    };
  }, [session, child]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (turnsLeft <= 0) {
      notify("오늘은 여기까지!", "미코랑은 한 번에 10마디까지 이야기할 수 있어요. 내일 또 만나요! 🦊");
      return;
    }
    setInput("");
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", text }]);
    setBusy(true);
    try {
      const reply = await callApi<{ text: string; mock: boolean }>("/v1/learning/m2/dialog", {
        body: { userText: text, cefr: "Pre-A1" },
      });
      setMessages((m) => [
        ...m,
        { id: `a${Date.now()}`, role: "mico", text: reply.text, mock: reply.mock },
      ]);
      Speech.stop();
      Speech.speak(reply.text.replace(/[^\p{L}\p{N}\s.,!?'"-]/gu, ""), {
        language: "en-US",
        rate: 0.9,
      });
    } catch (e) {
      notify("미코가 잠깐 못 들었어요", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 홈</Text>
        </Pressable>
        <Text style={styles.title}>🦊 미코와 대화</Text>
        <Text style={styles.turns}>{turnsLeft}턴 남음</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.micoBubble]}>
              <Text style={item.role === "user" ? styles.userText : styles.micoText}>
                {item.role === "mico" ? "🦊 " : ""}
                {item.text}
              </Text>
              {item.mock && <Text style={styles.mockTag}>연습 모드</Text>}
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="영어로 말해보세요! (예: I like apples)"
            placeholderTextColor="#9aa0a6"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            editable={!busy}
            returnKeyType="send"
          />
          <Pressable style={[styles.sendBtn, busy && { opacity: 0.5 }]} onPress={send} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>보내기</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  back: { color: color.primary, fontWeight: "700", fontSize: fontSize.bodyKid },
  title: { fontSize: fontSize.title, fontWeight: "800", color: color.dark },
  turns: { color: color.dark, opacity: 0.6, fontWeight: "700", fontSize: fontSize.caption },
  list: { padding: space.lg, gap: space.sm },
  bubble: {
    maxWidth: "82%",
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  userBubble: { alignSelf: "flex-end", backgroundColor: color.primary },
  micoBubble: { alignSelf: "flex-start", backgroundColor: "#fff" },
  userText: { color: "#fff", fontSize: fontSize.bodyKid, fontWeight: "600" },
  micoText: { color: color.gray700, fontSize: fontSize.bodyKid, fontWeight: "600" },
  mockTag: { fontSize: 10, color: color.gray700, opacity: 0.5, marginTop: 2 },
  inputRow: {
    flexDirection: "row",
    gap: space.sm,
    padding: space.lg,
    paddingTop: space.xs,
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    fontSize: fontSize.body + 1,
    color: color.gray700,
  },
  sendBtn: {
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingHorizontal: space.lg,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "800" },
});
