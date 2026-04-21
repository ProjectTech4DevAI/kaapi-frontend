"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { STORAGE_KEY } from "@/app/lib/constants/keystore";

type FeatureFlags = Record<string, boolean>;

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  isLoaded: boolean;
  isEnabled: (flag: string) => boolean;
  refresh: () => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: {},
  isLoaded: false,
  isEnabled: () => false,
  refresh: () => {},
});

interface FeatureFlagProviderProps {
  children: React.ReactNode;
  initialFlags?: FeatureFlags;
}

export function FeatureFlagProvider({
  children,
  initialFlags,
}: FeatureFlagProviderProps) {
  const hasServerSnapshot = initialFlags !== undefined;
  const [flags, setFlags] = useState<FeatureFlags>(initialFlags ?? {});
  const [isLoaded, setIsLoaded] = useState(hasServerSnapshot);
  const fetchingRef = useRef(false);

  const fetchFlags = useCallback(async () => {
    if (fetchingRef.current) return;

    let hasStoredKey = false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const keys = JSON.parse(stored);
        hasStoredKey = Array.isArray(keys) && keys.length > 0;
      }
    } catch {
      // no keys available
    }

    if (!hasStoredKey) {
      setFlags({});
      setIsLoaded(true);
      return;
    }

    fetchingRef.current = true;
    try {
      const response = await fetch("/api/features", {
        cache: "no-store",
      });
      if (response.ok) {
        const data: FeatureFlags = await response.json();
        setFlags(data);
      } else {
        setFlags({});
      }
    } catch {
      setFlags({});
    } finally {
      setIsLoaded(true);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Listen for localStorage changes (e.g. API key added/removed in another tab)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        fetchFlags();
      }
    };
    const handleAuthChanged = () => {
      fetchFlags();
    };
    const handleFocus = () => {
      fetchFlags();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchFlags();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("kaapi-auth-changed", handleAuthChanged);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("kaapi-auth-changed", handleAuthChanged);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (flag: string) => flags[flag] === true,
    [flags],
  );

  const refresh = useCallback(() => {
    fetchFlags();
  }, [fetchFlags]);

  return (
    <FeatureFlagContext.Provider
      value={{ flags, isLoaded, isEnabled, refresh }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagContextValue {
  return useContext(FeatureFlagContext);
}
