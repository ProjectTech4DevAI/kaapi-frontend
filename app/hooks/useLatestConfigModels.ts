"use client";

import { useEffect, useState } from "react";
import {
  fetchConfigSelection,
  fetchConfigVersionsPage,
} from "@/app/lib/utils/assessmentFetcher";
import type { ConfigPublic } from "@/app/lib/types/configs";
import type { LatestConfigModel } from "@/app/lib/types/assessment";

/**
 * Resolves the provider/model of each config's latest version, lazily and once
 * per config. Entries are `null` while loading or when unavailable so the UI
 * can hide the model badge without a separate loading flag.
 */
export default function useLatestConfigModels(
  configCards: ConfigPublic[],
  apiKey: string,
  isAuthenticated: boolean,
): Record<string, LatestConfigModel> {
  const [latestModelByConfig, setLatestModelByConfig] = useState<
    Record<string, LatestConfigModel>
  >({});

  useEffect(() => {
    if (!isAuthenticated || configCards.length === 0) return;
    configCards.forEach((card) => {
      if (latestModelByConfig[card.id] !== undefined) return;
      setLatestModelByConfig((prev) =>
        prev[card.id] !== undefined ? prev : { ...prev, [card.id]: null },
      );
      void (async () => {
        try {
          const versions = await fetchConfigVersionsPage(apiKey, card.id, {
            skip: 0,
            limit: 1,
          });
          const latest = versions.items[0];
          if (!latest) return;
          const selection = await fetchConfigSelection(
            apiKey,
            { id: card.id, name: card.name },
            latest.version,
          );
          setLatestModelByConfig((prev) => ({
            ...prev,
            [card.id]: {
              provider: selection.provider,
              model: selection.model,
            },
          }));
        } catch {
          // leave entry as null; UI hides model when unavailable
        }
      })();
    });
  }, [apiKey, configCards, isAuthenticated, latestModelByConfig]);

  return latestModelByConfig;
}
