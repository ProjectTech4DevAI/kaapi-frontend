"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { APIKey } from "@/app/lib/types/credentials";
import {
  User,
  GoogleProfile,
  Session,
  AuthContextValue,
} from "@/app/lib/types/auth";
import { apiFetch } from "@/app/lib/apiClient";
import { AUTH_EXPIRED_EVENT, STORAGE_KEYS } from "@/app/lib/constants";
import { useChatStore } from "@/app/lib/store/chat";
import { clearAllStorage } from "@/app/lib/utils";
export type { User, GoogleProfile, Session } from "@/app/lib/types/auth";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Initialize from localStorage after hydration
  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem(STORAGE_KEYS.API_KEYS);
      if (storedKeys) setApiKeys(JSON.parse(storedKeys));

      const storedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (storedSession) {
        const parsed = JSON.parse(storedSession) as Session;
        setSession(parsed);
        if (parsed.user) setCurrentUser(parsed.user);
      }
    } catch {
      /* ignore malformed data */
    }
    setIsHydrated(true);
  }, []);

  // Always fetch the latest user profile on hydration.
  useEffect(() => {
    if (!isHydrated) return;
    const hasApiKey = !!apiKeys[0]?.key;
    const hasSession = !!session;
    if (!hasApiKey && !hasSession) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; data: User } | User>(
          "/api/users/me",
          apiKeys[0]?.key ?? "",
        );
        const userData =
          "success" in res && res.data ? res.data : (res as User);
        if (!cancelled) {
          setCurrentUser(userData);
          const storedRaw = localStorage.getItem(STORAGE_KEYS.SESSION);
          if (storedRaw) {
            try {
              const stored = JSON.parse(storedRaw);
              stored.user = userData;
              localStorage.setItem(
                STORAGE_KEYS.SESSION,
                JSON.stringify(stored),
              );
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        // silently ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKeys, session, isHydrated]);

  const persist = useCallback((keys: APIKey[]) => {
    setApiKeys(keys);
    if (keys.length > 0) {
      localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEYS);
    }
  }, []);

  const addKey = useCallback(
    (key: APIKey) => persist([...apiKeys, key]),
    [apiKeys, persist],
  );
  const removeKey = useCallback(
    (id: string) => persist(apiKeys.filter((k) => k.id !== id)),
    [apiKeys, persist],
  );
  const setKeys = useCallback((keys: APIKey[]) => persist(keys), [persist]);

  const loginWithToken = useCallback(
    (accessToken: string, user?: User, googleProfile?: GoogleProfile) => {
      const newSession: Session = {
        accessToken,
        user: user ?? null,
        googleProfile: googleProfile ?? null,
      };
      setSession(newSession);
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newSession));

      if (user) setCurrentUser(user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Clear local state even if the backend call fails
    }
    setSession(null);
    setCurrentUser(null);
    clearAllStorage();
    useChatStore.getState().reset();
    setApiKeys([]);
  }, [persist]);

  // logout when both access + refresh tokens are expired
  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [logout]);

  const activeKey = apiKeys[0] ?? null;
  const isAuthenticated = !!activeKey || !!session;

  return (
    <AuthContext.Provider
      value={{
        apiKeys,
        activeKey,
        isHydrated,
        currentUser,
        googleProfile: session?.googleProfile ?? null,
        session,
        isAuthenticated,
        addKey,
        removeKey,
        setKeys,
        loginWithToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
