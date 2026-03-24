"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
} from "react";
import type { APIKey } from "@/app/keystore/page";

const STORAGE_KEY = "kaapi_api_keys";
const STORAGE_EVENT = "kaapi_api_keys_changed";
const EMPTY_KEYS: APIKey[] = [];

let cachedRaw: string | null = null;
let cachedKeys: APIKey[] = EMPTY_KEYS;

interface AuthContextValue {
  apiKeys: APIKey[];
  activeKey: APIKey | null;
  addKey: (key: APIKey) => void;
  removeKey: (id: string) => void;
  setKeys: (keys: APIKey[]) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const readStoredKeys = (): APIKey[] => {
  if (typeof window === "undefined") return EMPTY_KEYS;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedKeys;
  }

  try {
    cachedRaw = raw;
    cachedKeys = raw ? JSON.parse(raw) : EMPTY_KEYS;
    return cachedKeys;
  } catch {
    cachedRaw = raw;
    cachedKeys = EMPTY_KEYS;
    return cachedKeys;
  }
};

const getServerSnapshot = () => EMPTY_KEYS;

const subscribeToKeyChanges = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleCustomChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleCustomChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleCustomChange);
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const apiKeys = useSyncExternalStore(
    subscribeToKeyChanges,
    readStoredKeys,
    getServerSnapshot,
  );

  const persist = useCallback((keys: APIKey[]) => {
    if (keys.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
      cachedRaw = localStorage.getItem(STORAGE_KEY);
      cachedKeys = keys;
    } else {
      localStorage.removeItem(STORAGE_KEY);
      cachedRaw = null;
      cachedKeys = EMPTY_KEYS;
    }
    window.dispatchEvent(new Event(STORAGE_EVENT));
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
