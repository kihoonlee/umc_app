import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";

/** 선택된 자녀 (아이 App 은 보호자 계정 하위 프로필로 동작 — 상세 기획서 §4.3) */
export interface SelectedChild {
  id: string;
  name: string;
  /** 온보딩 완료 여부 (mico_state.onboarded). 미완료면 게이트가 /welcome 으로 보냄 */
  onboarded: boolean;
}

interface AppState {
  /** undefined = 세션 복원 중 */
  session: Session | null | undefined;
  child: SelectedChild | null;
  selectChild: (c: SelectedChild | null) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);
const CHILD_KEY = "umc.selectedChild";

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [child, setChild] = useState<SelectedChild | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data }, storedChild] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem(CHILD_KEY),
      ]);
      if (!mounted) return;
      setSession(data.session);
      if (storedChild) {
        try {
          setChild(JSON.parse(storedChild) as SelectedChild);
        } catch {
          await AsyncStorage.removeItem(CHILD_KEY);
        }
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const selectChild = useCallback(async (c: SelectedChild | null) => {
    setChild(c);
    if (c) await AsyncStorage.setItem(CHILD_KEY, JSON.stringify(c));
    else await AsyncStorage.removeItem(CHILD_KEY);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await selectChild(null);
  }, [selectChild]);

  const value = useMemo(
    () => ({ session, child, selectChild, signOut }),
    [session, child, selectChild, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
