"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { APIKey } from "@/app/keystore/page";

const STORAGE_KEY = "kaapi_api_keys";

interface AuthContextValue {
  apiKeys: APIKey[];
  activeKey: APIKey | null;
  addKey: (key: APIKey) => void;
  removeKey: (id: string) => void;
  setKeys: (keys: APIKey[]) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      /* ignore malformed data */
    }
    return [];
  });

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
