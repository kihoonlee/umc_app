import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { notify, errorMessage } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

/** 엄마(보호자) 로그인/가입 — email+password. Google SSO 는 프로바이더 설정 후 활성화. */
export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      notify("입력 확인", "이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.replace("/profiles");
      } else {
        if (!name.trim()) {
          notify("입력 확인", "이름을 입력해 주세요.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/profiles");
        } else {
          notify(
            "이메일을 확인해 주세요",
            "인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.",
          );
          setMode("signin");
        }
      }
    } catch (e) {
      notify(mode === "signin" ? "로그인 실패" : "가입 실패", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <Text style={styles.mico}>🦊</Text>
          <Text style={styles.title}>UMC 엄마표 영어</Text>
          <Text style={styles.subtitle}>
            엄마가 선생님이 되지 않아도, AI가 함께 만드는 우리 집 영어 환경
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === "signin" ? "로그인" : "가입하기"}
          </Text>

          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="이름 (예: 지은)"
              placeholderTextColor="#9aa0a6"
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#9aa0a6"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호 (6자 이상)"
            placeholderTextColor="#9aa0a6"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable style={[styles.cta, busy && styles.ctaDisabled]} onPress={submit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>{mode === "signin" ? "로그인" : "가입하기"}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>
              {mode === "signin" ? "처음이세요? 가입하기" : "계정이 있어요. 로그인"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.googleBtn}
            onPress={() =>
              notify("준비 중", "Google 로그인은 곧 제공돼요. 이메일로 가입해 주세요.")
            }
          >
            <Text style={styles.googleText}>G  Google 로 계속하기 (준비 중)</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow },
  flex: { flex: 1, paddingHorizontal: space.lg, justifyContent: "center" },
  hero: { alignItems: "center", marginBottom: space.xl },
  mico: { fontSize: 64 },
  title: { fontSize: fontSize.heading, fontWeight: "800", color: color.dark, marginTop: space.sm },
  subtitle: {
    fontSize: fontSize.body,
    color: color.dark,
    opacity: 0.65,
    textAlign: "center",
    marginTop: space.xs,
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
  cardTitle: { fontSize: fontSize.title, fontWeight: "700", color: color.gray700 },
  input: {
    borderWidth: 1,
    borderColor: color.gray200,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    fontSize: fontSize.body + 1,
    color: color.gray700,
    backgroundColor: color.gray50,
  },
  cta: {
    marginTop: space.xs,
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  switchBtn: { alignItems: "center", paddingVertical: space.xs },
  switchText: { color: color.primary, fontWeight: "600" },
  googleBtn: {
    borderWidth: 1,
    borderColor: color.gray200,
    borderRadius: radius.full,
    paddingVertical: space.sm + 2,
    alignItems: "center",
  },
  googleText: { color: color.gray700, fontWeight: "600" },
});
