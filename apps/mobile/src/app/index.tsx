import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { color } from "@umc/ui";
import { useApp } from "@/lib/app-state";

/** 진입 게이트 — 세션 복원 중 스피너 → 로그인/프로필선택/홈 으로 분기. */
export default function Gate() {
  const { session, child } = useApp();

  if (session === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;
  if (!child) return <Redirect href="/profiles" />;
  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.kidYellow },
});
