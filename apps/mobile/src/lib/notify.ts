import { Alert, Platform } from "react-native";

/**
 * 크로스플랫폼 사용자 알림 — 에러 UX 원칙: 에러는 반드시 사용자에게 보이는 형태로.
 * RN 의 Alert.alert 는 web 에서 no-op 이므로 web 은 window.alert 사용.
 */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** 에러 객체 → 사용자용 한국어 메시지 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message;
    if (/invalid login credentials/i.test(m)) return "이메일 또는 비밀번호가 올바르지 않아요.";
    if (/email not confirmed/i.test(m)) return "이메일 인증이 아직 안 됐어요. 받은편지함을 확인해 주세요.";
    if (/user already registered/i.test(m)) return "이미 가입된 이메일이에요. 로그인해 주세요.";
    if (/network|fetch/i.test(m)) return "네트워크 연결을 확인해 주세요.";
    return m;
  }
  return "알 수 없는 오류가 발생했어요. 다시 시도해 주세요.";
}
