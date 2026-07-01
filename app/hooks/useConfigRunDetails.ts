"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import {
  getConfigDetailErrorMessage,
  isAbortError,
} from "@/app/lib/utils/assessment";
import { ASSESSMENT_TAG } from "@/app/lib/assessment/constants";
import type {
  ConfigResponse,
  ConfigVersionResponse,
} from "@/app/lib/types/configs";
import type { ConfigRunDetail } from "@/app/lib/types/assessment";

interface UseConfigRunDetailsParams {
  apiKey: string;
  isAuthenticated: boolean;
}

export default function useConfigRunDetails({
  apiKey,
  isAuthenticated,
}: UseConfigRunDetailsParams) {
  const [configDetailsByKey, setConfigDetailsByKey] = useState<
    Record<string, ConfigRunDetail>
  >({});
  const [configLoadingKeys, setConfigLoadingKeys] = useState<
    Record<string, boolean>
  >({});
  const [configErrorKeys, setConfigErrorKeys] = useState<
    Record<string, string>
  >({});
  const configDetailControllersRef = useRef<Record<string, AbortController>>(
    {},
  );
  const configDetailFetchedRef = useRef<Record<string, boolean>>({});

  const loadConfigDetail = useCallback(
    async (configId: string, version: number) => {
      if (!isAuthenticated) return;

      const key = `${configId}:${version}`;
      if (configDetailFetchedRef.current[key]) return;
      configDetailFetchedRef.current[key] = true;

      setConfigLoadingKeys((prev) => ({ ...prev, [key]: true }));
      setConfigErrorKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      configDetailControllersRef.current[key]?.abort();
      const controller = new AbortController();
      configDetailControllersRef.current[key] = controller;

      try {
        const query = new URLSearchParams({ tag: ASSESSMENT_TAG });
        const [configResponse, versionResponse] = await Promise.all([
          apiFetch<ConfigResponse>(
            `/api/configs/${configId}?${query.toString()}`,
            apiKey,
            { signal: controller.signal },
          ),
          apiFetch<ConfigVersionResponse>(
            `/api/configs/${configId}/versions/${version}?${query.toString()}`,
            apiKey,
            { signal: controller.signal },
          ),
        ]);

        if (
          !configResponse.success ||
          !configResponse.data ||
          !versionResponse.success ||
          !versionResponse.data
        ) {
          throw new Error(
            configResponse.error ||
              versionResponse.error ||
              "Configuration details unavailable",
          );
        }

        const detail: ConfigRunDetail = {
          configId,
          version,
          name: configResponse.data.name,
          description: configResponse.data.description,
          commitMessage: versionResponse.data.commit_message,
          provider:
            versionResponse.data.config_blob?.completion?.provider || null,
          model:
            versionResponse.data.config_blob?.completion?.params?.model || null,
        };

        setConfigDetailsByKey((prev) => ({ ...prev, [key]: detail }));
      } catch (error) {
        if (isAbortError(error)) return;
        setConfigErrorKeys((prev) => ({
          ...prev,
          [key]: getConfigDetailErrorMessage(error),
        }));
      } finally {
        if (configDetailControllersRef.current[key] === controller) {
          delete configDetailControllersRef.current[key];
        }
        setConfigLoadingKeys((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [apiKey, isAuthenticated],
  );

  useEffect(() => {
    const controllers = configDetailControllersRef.current;
    return () => {
      Object.values(controllers).forEach((controller) => controller.abort());
    };
  }, []);

  return {
    configDetailsByKey,
    configLoadingKeys,
    configErrorKeys,
    loadConfigDetail,
  };
}
