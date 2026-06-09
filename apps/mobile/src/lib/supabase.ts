import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createUmcClient } from "@umc/db";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 가 없습니다. apps/mobile/.env.local 을 확인하세요.",
  );
}

/**
 * 라이브 Supabase 클라이언트 (아이/엄마 App 공용).
 * - native: AsyncStorage 에 세션 영속
 * - web: 기본(localStorage)
 */
export const supabase = createUmcClient(url, anonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
