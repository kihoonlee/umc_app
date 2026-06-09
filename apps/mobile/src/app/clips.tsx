import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";
import { notify, errorMessage } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

interface ClipRow {
  id: string;
  title: string;
  cefr_level: string | null;
  body: { segments?: unknown[] } | null;
}

/** M2 연따 클립 목록 — 라이브 content(shadow_clip). */
export default function Clips() {
  const [clips, setClips] = useState<ClipRow[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("content")
          .select("id,title,cefr_level,body")
          .eq("type", "shadow_clip")
          .order("created_at", { ascending: true });
        if (error) throw error;
        setClips((data as unknown as ClipRow[]) ?? []);
      } catch (e) {
        setClips([]);
        notify("연따 목록 불러오기 실패", errorMessage(e));
      }
    })();
  }, []);

  if (clips === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 홈</Text>
        </Pressable>
        <Text style={styles.title}>🎤 오늘의 연따</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={clips}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ gap: space.sm, paddingBottom: space.lg }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: "/clip/[id]", params: { id: item.id } })}
          >
            <Text style={styles.emoji}>🎬</Text>
            <View style={styles.flex}>
              <Text style={styles.clipTitle}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.cefr_level ?? "-"} · {item.body?.segments?.length ?? 0}구간
              </Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>등록된 연따 클립이 아직 없어요.</Text>}
      />
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
  back: { color: color.primary, fontWeight: "700", fontSize: fontSize.bodyKid },
  title: { fontSize: fontSize.title, fontWeight: "800", color: color.dark },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: space.md,
  },
  emoji: { fontSize: 30 },
  clipTitle: { fontSize: fontSize.bodyKid, fontWeight: "700", color: color.gray700 },
  meta: { fontSize: fontSize.caption, color: color.gray700, opacity: 0.6 },
  chev: { fontSize: 24, color: color.primary, fontWeight: "700" },
  empty: { textAlign: "center", color: color.dark, opacity: 0.6, paddingVertical: space.xl },
});
