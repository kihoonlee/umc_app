import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { useApp } from "@/lib/app-state";
import { notify, errorMessage } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

interface ChildRow {
  id: string;
  name: string;
  birth_date: string;
  cefr_level: string | null;
  mico_state: { onboarded?: boolean } | null;
}

/** 자녀 프로필 선택/생성 — 아이는 별도 로그인 없이 보호자 계정 하위 프로필로 진입 (§4.3). */
export default function Profiles() {
  const { session, selectChild, signOut } = useApp();
  const [childrenRows, setChildrenRows] = useState<ChildRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("children")
        .select("id,name,birth_date,cefr_level,mico_state")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setChildrenRows((data as unknown as ChildRow[]) ?? []);
    } catch (e) {
      setChildrenRows([]);
      notify("프로필 불러오기 실패", errorMessage(e));
    }
  }, []);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    void load();
  }, [session, load]);

  async function create() {
    const yr = Number(birthYear);
    const now = new Date().getFullYear();
    if (!name.trim()) {
      notify("입력 확인", "아이 이름을 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(yr) || yr < now - 13 || yr > now - 4) {
      notify("입력 확인", `출생연도를 확인해 주세요. (만 5~13세: ${now - 13}~${now - 5}년생)`);
      return;
    }
    setBusy(true);
    try {
      const parentId = session?.user.id;
      if (!parentId) throw new Error("세션이 만료됐어요. 다시 로그인해 주세요.");
      const { data, error } = await supabase
        .from("children")
        .insert({ parent_id: parentId, name: name.trim(), birth_date: `${yr}-01-01` })
        .select("id,name")
        .single();
      if (error) throw error;
      await selectChild({ id: data.id, name: data.name, onboarded: false });
      router.replace("/welcome"); // 새 프로필 → 온보딩 시작 (미코 인사부터)
    } catch (e) {
      notify("프로필 생성 실패", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function pick(c: ChildRow) {
    const onboarded = c.mico_state?.onboarded === true;
    await selectChild({ id: c.id, name: c.name, onboarded });
    router.replace(onboarded ? "/home" : "/welcome");
  }

  if (childrenRows === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>누가 학습할까요?</Text>
        <Pressable onPress={() => void signOut().then(() => router.replace("/login"))}>
          <Text style={styles.signout}>로그아웃</Text>
        </Pressable>
      </View>

      <FlatList
        data={childrenRows}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}
        renderItem={({ item }) => (
          <Pressable style={styles.childCard} onPress={() => void pick(item)}>
            <Text style={styles.childEmoji}>🧒</Text>
            <View style={styles.flex}>
              <Text style={styles.childName}>{item.name}</Text>
              <Text style={styles.childMeta}>
                {item.birth_date.slice(0, 4)}년생
                {item.cefr_level ? ` · ${item.cefr_level}` : " · 진단 전"}
              </Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            아직 프로필이 없어요. 아래에서 첫 프로필을 만들어 주세요! 🦊
          </Text>
        }
      />

      {creating ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>새 프로필</Text>
          <TextInput
            style={styles.input}
            placeholder="아이 이름 (예: 윤서)"
            placeholderTextColor="#9aa0a6"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder={`출생연도 (예: ${new Date().getFullYear() - 7})`}
            placeholderTextColor="#9aa0a6"
            value={birthYear}
            onChangeText={setBirthYear}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={create} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>만들기</Text>}
          </Pressable>
          <Pressable onPress={() => setCreating(false)} style={styles.cancel}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.cta} onPress={() => setCreating(true)}>
          <Text style={styles.ctaText}>＋ 자녀 프로필 추가</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.kidYellow, paddingHorizontal: space.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.kidYellow },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.md,
  },
  title: { fontSize: fontSize.heading, fontWeight: "800", color: color.dark },
  signout: { color: color.gray700, opacity: 0.6, fontSize: fontSize.body },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: space.md,
  },
  childEmoji: { fontSize: 32 },
  childName: { fontSize: fontSize.bodyKid, fontWeight: "700", color: color.gray700 },
  childMeta: { fontSize: fontSize.caption, color: color.gray700, opacity: 0.6 },
  chev: { fontSize: 24, color: color.primary, fontWeight: "700" },
  empty: {
    textAlign: "center",
    color: color.dark,
    opacity: 0.6,
    paddingVertical: space.xl,
    fontSize: fontSize.body,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.sm,
    marginBottom: space.lg,
  },
  formTitle: { fontSize: fontSize.title, fontWeight: "700", color: color.gray700 },
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
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
    marginBottom: space.lg,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  cancel: { alignItems: "center", paddingVertical: space.xs },
  cancelText: { color: color.gray700, opacity: 0.6 },
});
