import { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * 미코 캐릭터 플레이스홀더 — 🦊 이모지 + bounce 애니메이션 (RN Animated, web 안전).
 * 실제 미코 아트(표정 5~8종)는 콘텐츠 의존. 지금은 공용 등장 연출용.
 */
export function MicoHero({ size = 88, emoji = "🦊" }: { size?: number; emoji?: string }) {
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 650, useNativeDriver: false }),
        Animated.timing(scale, { toValue: 0.94, duration: 650, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.Text style={{ fontSize: size, textAlign: "center", transform: [{ scale }] }}>
      {emoji}
    </Animated.Text>
  );
}
