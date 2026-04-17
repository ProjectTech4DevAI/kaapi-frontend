/**
 * Config Library: View and manage configs with quick actions (edit/use),
 * showing usage count, and lazily loading version details on selection.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { colors } from "@/app/lib/colors";
import { usePaginatedList, useInfiniteScroll } from "@/app/hooks";
import ConfigCard from "@/app/components/ConfigCard";
import Loader, { LoaderBox } from "@/app/components/Loader";
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

  // Responsive column count (matches Tailwind lg/xl breakpoints)
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

  // Distribute configs into fixed columns so items never shift between columns
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
    const fetchEvaluationCounts = async () => {
      if (!isAuthenticated) return;
      try {
        const data = await apiFetch<EvalJob[] | { data: EvalJob[] }>(
          "/api/evaluations",
          apiKey,
        );
        const jobs: EvalJob[] = Array.isArray(data) ? data : data.data || [];
        const counts: Record<string, number> = {};
        jobs.forEach((job) => {
          if (job.config_id) {
            counts[job.config_id] = (counts[job.config_id] || 0) + 1;
          }
        });
        setEvaluationCounts(counts);
      } catch (e) {
        console.error("Failed to fetch evaluation counts:", e);
      }
    };
    fetchEvaluationCounts();
  }, [activeKey]);

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
    <div
      className="w-full h-screen flex flex-col"
      style={{ backgroundColor: colors.bg.secondary }}
    >
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/configurations" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Configuration Library"
            subtitle="Manage your prompts and model configurations"
          />

          {/* Toolbar */}
          <div
            className="px-6 py-4 flex items-center gap-4"
            style={{
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: colors.bg.primary,
            }}
          >
            <div className="flex-1 relative">
              <SearchIcon
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: colors.text.secondary }}
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search configs..."
                className="w-full pl-10 pr-4 py-2 rounded-md text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: colors.bg.secondary,
                  border: `1px solid ${colors.border}`,
                  color: colors.text.primary,
                }}
              />
            </div>

            <button
              onClick={refetch}
              disabled={isLoading}
              className="p-2 rounded-md transition-colors flex items-center gap-1"
              style={{
                backgroundColor: colors.bg.primary,
                border: `1px solid ${colors.border}`,
                color: colors.text.secondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.bg.secondary;
                e.currentTarget.style.color = colors.text.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.bg.primary;
                e.currentTarget.style.color = colors.text.secondary;
              }}
              title="Force refresh from server"
            >
              <RefreshIcon
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={handleCreateNew}
              className="px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: colors.accent.primary,
                color: colors.bg.primary,
                border: "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = colors.accent.hover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = colors.accent.primary)
              }
            >
              <PlusIcon className="w-4 h-4" />
              New Config
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-6"
          >
            {isLoading ? (
              <LoaderBox message="Loading configurations..." size="md" />
            ) : error ? (
              <div className="rounded-lg p-6 text-center bg-[#fef2f2] border border-[#fecaca]">
                <WarningTriangleIcon className="w-12 h-12 mx-auto mb-3 text-[#dc2626]" />
                <p className="text-sm font-medium text-status-error">{error}</p>
              </div>
            ) : configs.length === 0 ? (
              <div
                className="rounded-lg p-8 text-center"
                style={{
                  backgroundColor: colors.bg.primary,
                  border: `2px dashed ${colors.border}`,
                }}
              >
                {debouncedQuery ? (
                  <>
                    <SearchIcon
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: colors.text.secondary }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: colors.text.primary }}
                    >
                      No configs match &quot;{debouncedQuery}&quot;
                    </p>
                    <button
                      onClick={() => setSearchInput("")}
                      className="mt-2 text-sm underline"
                      style={{ color: colors.text.secondary }}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <GearIcon
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: colors.text.secondary }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: colors.text.primary }}
                    >
                      No configurations yet
                    </p>
                    <p
                      className="text-sm mt-1"
                      style={{ color: colors.text.secondary }}
                    >
                      Create your first configuration to get started
                    </p>
                    <button
                      onClick={handleCreateNew}
                      className="mt-4 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: colors.accent.primary,
                        color: colors.bg.primary,
                      }}
                    >
                      Create Config
                    </button>
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
