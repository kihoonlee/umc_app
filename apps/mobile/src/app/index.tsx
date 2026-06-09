import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, fontSize, radius, space } from "@umc/ui";

/**
 * 아이 홈 (Phase 0 스캐폴드) — 상세 기획서 §5.1: 미코 + 별·Streak + 오늘의 학습 카드.
 * @umc/ui 디자인 토큰을 사용해 모노레포 워크스페이스 해석을 검증한다.
 * 실제 M1/M2 루프는 Phase 2 수직 슬라이스에서 연결.
 */
export default function KidHome() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.streak}>🔥 0일</Text>
        <Text style={styles.stars}>⭐ 0</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.mico}>🦊</Text>
        <Text style={styles.greeting}>오늘은 뭐 할까?</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>오늘의 학습 카드</Text>
        <Text style={styles.cardMain}>📖 책 1권 · 🎤 연따 1세트 · 🃏 단어 5장</Text>
        <Text style={styles.cardSub}>약 18분이면 끝나요</Text>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>시작하기</Text>
        </Pressable>
      </View>

      <Text style={styles.note}>Phase 0 스캐폴드 — Core Loop 는 Phase 2에서 연결됩니다</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.kidYellow,
    paddingHorizontal: space.lg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: space.md,
  },
  streak: { fontSize: fontSize.bodyKid, fontWeight: "700", color: color.dark },
  stars: { fontSize: fontSize.bodyKid, fontWeight: "700", color: color.dark },
  hero: { alignItems: "center", marginTop: space.lg, marginBottom: space.xl },
  mico: { fontSize: 88 },
  greeting: {
    fontSize: fontSize.heading,
    fontWeight: "800",
    color: color.dark,
    marginTop: space.sm,
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
  cardLabel: { color: color.primary, fontWeight: "700", fontSize: fontSize.body },
  cardMain: { fontSize: fontSize.title, fontWeight: "700", color: color.gray700 },
  cardSub: { color: color.gray700, opacity: 0.6 },
  cta: {
    marginTop: space.sm,
    backgroundColor: color.accent,
    borderRadius: radius.full,
    paddingVertical: space.md,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: fontSize.bodyKid },
  note: {
    textAlign: "center",
    color: color.dark,
    opacity: 0.5,
    marginTop: space.xl,
    fontSize: fontSize.caption,
  },
});
