import { Platform } from "react-native";
import { supabase } from "./supabase";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 녹음 파일을 audio 버킷에 업로드. 경로 규약: {userId}/{childId}/{ts}.m4a (storage RLS 와 일치)
 * - web: blob URL → Blob → supabase-js 업로드
 * - native: RN FormData(file uri) → Storage REST 직접 업로드 (RN fetch 의 file:// 제약 회피)
 * @returns 업로드된 storage 경로
 */
export async function uploadRecording(args: {
  localUri: string;
  userId: string;
  childId: string;
}): Promise<string> {
  const path = `${args.userId}/${args.childId}/${Date.now()}.m4a`;

  if (Platform.OS === "web") {
    const blob = await (await fetch(args.localUri)).blob();
    const { error } = await supabase.storage.from("audio").upload(path, blob, {
      contentType: blob.type || "audio/mp4",
    });
    if (error) throw new Error(error.message);
    return path;
  }

  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("세션이 만료됐어요. 다시 로그인해 주세요.");

  const form = new FormData();
  // RN 전용 FormData 파일 파트 (uri/name/type)
  form.append("file", {
    uri: args.localUri,
    name: "recording.m4a",
    type: "audio/mp4",
  } as unknown as Blob);

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/audio/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, apikey: ANON_KEY },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`녹음 업로드 실패 (HTTP ${res.status}) ${text.slice(0, 80)}`);
  }
  return path;
}
