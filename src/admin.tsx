import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { restoreAdmin, signInAdmin, signOutAdmin } from "./lib/api";

interface AdminState {
  /** 관리자 목록(admins)에 있는 계정으로 로그인했어요. 실제 권한은 Firestore 보안 규칙이 요청마다 확인해요. */
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminContext = createContext<AdminState>({ isAdmin: false, signIn: async () => undefined, signOut: async () => undefined });

/** 관리자는 더보기 > 관리자에서 운영자 계정(이메일·비밀번호)으로 로그인해요. 안드로이드 퓨처셀프와 같은 계정이에요. */
export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  // 앱을 다시 켜면 지난 로그인이 아직 관리자인지 확인해요.
  useEffect(() => {
    restoreAdmin()
      .then(setIsAdmin)
      .catch(() => undefined);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInAdmin(email, password);
    setIsAdmin(true);
  }, []);

  const signOut = useCallback(async () => {
    await signOutAdmin();
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({ isAdmin, signIn, signOut }), [isAdmin, signIn, signOut]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminState {
  return useContext(AdminContext);
}
