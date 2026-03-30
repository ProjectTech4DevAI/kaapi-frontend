"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { APIKey } from "@/app/lib/types/credentials";
import { apiFetch } from "../apiClient";

const STORAGE_KEY = "kaapi_api_keys";

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

interface AuthContextValue {
  apiKeys: APIKey[];
  activeKey: APIKey | null;
  isHydrated: boolean;
  currentUser: User | null;
  addKey: (key: APIKey) => void;
  removeKey: (id: string) => void;
  setKeys: (keys: APIKey[]) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize from localStorage after hydration to avoid SSR mismatch.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setApiKeys(JSON.parse(stored));
    } catch {
      /* ignore malformed data */
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const apiKey = apiKeys[0]?.key;
    if (!apiKey || !isHydrated) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch<User>("/api/users/me", apiKey);
        if (!cancelled) setCurrentUser(data);
      } catch {
        // silently ignore — user info is non-critical
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKeys, isHydrated]);

  const persist = useCallback((keys: APIKey[]) => {
    setApiKeys(keys);
    if (keys.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } else {
      localStorage.removeItem(STORAGE_KEY);
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

  return (
    <AuthContext.Provider
      value={{
        apiKeys,
        activeKey: apiKeys[0] ?? null,
        isHydrated,
        currentUser,
        addKey,
        removeKey,
        setKeys,
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
