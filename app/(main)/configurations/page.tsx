/**
 * Config Library: View and manage configs with quick actions (edit/use),
 * showing usage count, and lazily loading version details on selection.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { Button, Loader } from "@/app/components/ui";
import ConfigCard from "@/app/components/ConfigCard";
import ConfigLibrarySkeleton from "@/app/components/ConfigLibrarySkeleton";
import { usePaginatedList, useInfiniteScroll } from "@/app/hooks";
import { EvalJob } from "@/app/lib/types/evaluation";
import {
  ConfigPublic,
  ConfigVersionItems,
  ConfigVersionResponse,
  SavedConfig,
} from "@/app/lib/types/configs";
import {
  configState,
  pendingVersionLoads,
  pendingSingleVersionLoads,
} from "@/app/lib/store/configStore";
import { flattenConfigVersion } from "@/app/lib/utils";
import {
  SearchIcon,
  RefreshIcon,
  PlusIcon,
  WarningTriangleIcon,
  GearIcon,
} from "@/app/components/icons";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import { apiFetch } from "@/app/lib/apiClient";

const SEARCH_DEBOUNCE_MS = 350;

export default function ConfigLibraryPage() {
  const router = useRouter();
  const [evaluationCounts, setEvaluationCounts] = useState<
    Record<string, number>
  >({});
  const { sidebarCollapsed } = useApp();
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [columnCount, setColumnCount] = useState(3);
  const {
    items: configs,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch,
  } = usePaginatedList<ConfigPublic>({
    endpoint: "/api/configs",
    query: debouncedQuery,
  });
  const scrollRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore,
  });

  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 1280) setColumnCount(3);
      else if (window.innerWidth >= 1024) setColumnCount(2);
      else setColumnCount(1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const columns = useMemo(() => {
    const cols: ConfigPublic[][] = Array.from(
      { length: columnCount },
      () => [],
    );
    configs.forEach((config, i) => cols[i % columnCount].push(config));
    return cols;
  }, [configs, columnCount]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!isAuthenticated || !apiKey) return;

    let cancelled = false;
    const fetchEvaluationCounts = async () => {
      try {
        const data = await apiFetch<EvalJob[] | { data: EvalJob[] }>(
          "/api/evaluations",
          apiKey,
        );
        if (cancelled) return;
        const jobs: EvalJob[] = Array.isArray(data) ? data : data.data || [];
        const counts: Record<string, number> = {};
        jobs.forEach((job) => {
          if (job.config_id) {
            counts[job.config_id] = (counts[job.config_id] || 0) + 1;
          }
        });
        setEvaluationCounts(counts);
      } catch (e) {
        if (!cancelled) {
          console.warn("Could not fetch evaluation counts:", e);
        }
      }
    };
    fetchEvaluationCounts();

    return () => {
      cancelled = true;
    };
  }, [apiKey, isAuthenticated]);

  const loadVersionsForConfig = useCallback(
    async (configId: string) => {
      if (configState.versionItemsCache[configId]) return;
      const existing = pendingVersionLoads.get(configId);
      if (existing) {
        await existing;
        return;
      }
      if (!isAuthenticated) return;

      const loadPromise = (async () => {
        const res = await apiFetch<{
          success: boolean;
          data: ConfigVersionItems[];
        }>(`/api/configs/${configId}/versions`, apiKey);
        if (res.success && res.data) {
          configState.versionItemsCache[configId] = res.data;
        }
      })().finally(() => pendingVersionLoads.delete(configId));

      pendingVersionLoads.set(configId, loadPromise);
      await loadPromise;
    },
    [apiKey, isAuthenticated],
  );

  const loadSingleVersion = useCallback(
    async (configId: string, version: number): Promise<SavedConfig | null> => {
      const key = `${configId}:${version}`;
      const existing = pendingSingleVersionLoads.get(key);
      if (existing) return existing;
      if (!isAuthenticated) return null;

      const configPublic =
        configs.find((c) => c.id === configId) ??
        configState.allConfigMeta?.find((m) => m.id === configId);
      if (!configPublic) return null;

      const loadPromise: Promise<SavedConfig | null> = (async () => {
        try {
          const res = await apiFetch<ConfigVersionResponse>(
            `/api/configs/${configId}/versions/${version}`,
            apiKey,
          );
          if (!res.success || !res.data) return null;
          return flattenConfigVersion(configPublic, res.data);
        } catch (e) {
          console.error(
            `Failed to fetch version ${version} for config ${configId}:`,
            e,
          );
          return null;
        }
      })().finally(() => pendingSingleVersionLoads.delete(key));

      pendingSingleVersionLoads.set(key, loadPromise);
      return loadPromise;
    },
    [apiKey, configs, isAuthenticated],
  );

  const handleCreateNew = () => {
    router.push("/configurations/prompt-editor?new=true");
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/configurations" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Configuration Library"
            subtitle="Browse, version, and edit your prompts and model setups"
          />

          <div className="px-6 py-4 flex items-center gap-2 bg-bg-primary">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search configs..."
                className="w-full pl-11 pr-4 py-3 rounded-full bg-bg-secondary text-text-primary text-sm placeholder:text-neutral focus:outline-none focus:ring-1 focus:ring-accent-primary focus:bg-bg-primary transition-colors"
              />
            </div>

            <button
              onClick={refetch}
              disabled={isLoading}
              className="p-2 rounded-full text-text-secondary hover:bg-neutral-100 hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Refresh from server"
              aria-label="Refresh"
            >
              <RefreshIcon
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>

            <Button variant="primary" size="md" onClick={handleCreateNew}>
              <PlusIcon className="w-4 h-4" />
              New Config
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-6"
          >
            {isLoading ? (
              <ConfigLibrarySkeleton columnCount={columnCount} />
            ) : error ? (
              <div className="rounded-lg p-8 text-center bg-status-error-bg border border-status-error-border">
                <WarningTriangleIcon className="w-12 h-12 mx-auto mb-3 text-status-error" />
                <p className="text-sm font-medium text-status-error-text">
                  {error}
                </p>
              </div>
            ) : configs.length === 0 ? (
              <div className="rounded-lg p-12 text-center bg-bg-primary border-2 border-dashed border-border">
                {debouncedQuery ? (
                  <>
                    <div className="mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-primary/10">
                      <SearchIcon className="w-7 h-7 text-accent-primary" />
                    </div>
                    <p className="text-base font-semibold text-text-primary mb-1">
                      No configs match &ldquo;{debouncedQuery}&rdquo;
                    </p>
                    <button
                      onClick={() => setSearchInput("")}
                      className="mt-2 text-sm text-accent-primary hover:underline cursor-pointer"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-primary/10">
                      <GearIcon className="w-7 h-7 text-accent-primary" />
                    </div>
                    <p className="text-base font-semibold text-text-primary mb-1">
                      No configurations yet
                    </p>
                    <p className="text-sm text-text-secondary mb-5">
                      Create your first configuration to start building prompts
                      and model setups.
                    </p>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleCreateNew}
                    >
                      <PlusIcon className="w-4 h-4" />
                      Create Configuration
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div
                  className="grid gap-4 items-start w-full"
                  style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  }}
                >
                  {columns.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-4 min-w-0">
                      {col.map((config) => (
                        <ConfigCard
                          key={config.id}
                          config={config}
                          evaluationCount={evaluationCounts[config.id] || 0}
                          onLoadVersions={loadVersionsForConfig}
                          onLoadSingleVersion={loadSingleVersion}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {isLoadingMore && (
                  <div className="flex justify-center mt-6">
                    <Loader message="Loading more..." size="sm" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
