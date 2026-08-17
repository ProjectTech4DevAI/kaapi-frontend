"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Loader } from "@/app/components/ui";
import { VersionPill } from "@/app/components";
import {
  ChevronDownIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
} from "@/app/components/icons";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import {
  fetchConfigPage,
  fetchConfigVersionDetail,
  fetchConfigVersionsPage,
} from "@/app/lib/utils/assessmentFetcher";
import { handleForbiddenError } from "@/app/lib/utils/assessment";
import { formatRelativeTime } from "@/app/lib/utils";
import type { ConfigSelectStepProps } from "@/app/lib/types/assessment";
import type {
  AssessmentConfigBlob,
  ConfigPublic,
  ConfigVersionItems,
} from "@/app/lib/types/configs";

interface ConfigSelectCardProps {
  config: ConfigPublic;
  apiKey: string;
  tag: string;
  isLoadingId: string | null;
  onPick: (config: ConfigPublic, version: number) => void;
}

function ConfigSelectCard({
  config,
  apiKey,
  tag,
  isLoadingId,
  onPick,
}: ConfigSelectCardProps) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [versions, setVersions] = useState<ConfigVersionItems[] | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const toggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (versions) return;
    setIsLoadingVersions(true);
    try {
      const page = await fetchConfigVersionsPage(apiKey, config.id, {
        limit: 100,
        tag,
      });
      setVersions(page.items);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load versions",
      );
    } finally {
      setIsLoadingVersions(false);
    }
  };

  return (
    <div
      className={`rounded-lg bg-bg-primary transition-all min-w-0 ${
        expanded
          ? "shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          : "shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      }`}
    >
      <button
        type="button"
        onClick={() => void toggle()}
        className="w-full px-5 py-3 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-text-primary">
              {config.name}
            </h3>
            {config.description && (
              <p className="mt-0.5 truncate text-sm text-text-secondary">
                {config.description}
              </p>
            )}
            <p className="mt-2 text-xs text-text-secondary">
              Updated {formatRelativeTime(config.updated_at)}
            </p>
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-100 px-4 py-3">
          {isLoadingVersions ? (
            <Loader size="sm" message="Loading versions..." />
          ) : versions && versions.length > 0 ? (
            <ul className="space-y-1.5">
              {versions.map((item) => {
                const loadingKey = `${config.id}:${item.version}`;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onPick(config, item.version)}
                      disabled={isLoadingId !== null}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-secondary disabled:opacity-60"
                    >
                      <VersionPill version={item.version} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                        {item.commit_message || "No message"}
                      </span>
                      {isLoadingId === loadingKey ? (
                        <span className="text-xs text-text-secondary">
                          Loading…
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-accent-primary">
                          Load
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-2 text-center text-xs text-text-secondary">
              No versions found
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConfigSelectStep({
  onStartNew,
  onLoadExisting,
  onForbidden,
  onNext,
  tag = "ASSESSMENT",
}: ConfigSelectStepProps) {
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const toast = useToast();

  const [configs, setConfigs] = useState<ConfigPublic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingVersionKey, setLoadingVersionKey] = useState<string | null>(
    null,
  );

  const loadConfigs = () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    fetchConfigPage({ apiKey, limit: 100, tag })
      .then((page) => setConfigs(page.items))
      .catch((err) => {
        if (err instanceof Error && handleForbiddenError(err, onForbidden)) {
          return;
        }
        toast.error(
          err instanceof Error ? err.message : "Failed to load configurations",
        );
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadConfigs();
     
  }, [isAuthenticated, apiKey, tag]);

  const filtered = useMemo(() => {
    // The scope is enforced by the `tag` query param on the fetch.
    const query = search.trim().toLowerCase();
    if (!query) return configs;
    return configs.filter((config) =>
      config.name.toLowerCase().includes(query),
    );
  }, [configs, search]);

  const handleNewConfig = () => {
    onStartNew();
    onNext();
  };

  const handlePickVersion = async (config: ConfigPublic, version: number) => {
    if (loadingVersionKey) return;
    setLoadingVersionKey(`${config.id}:${version}`);
    try {
      const detail = await fetchConfigVersionDetail(
        apiKey,
        config.id,
        version,
        tag,
      );
      const blob = detail.config_blob as unknown as AssessmentConfigBlob;
      onLoadExisting(blob, config.id, config.name);
      onNext();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load configuration",
      );
    } finally {
      // This step stays mounted (ConfigPanel hides it via CSS), so always clear
      // the loading flag — otherwise it stays stuck on return to this step.
      setLoadingVersionKey(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-5 pb-16">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Configuration
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Start a new configuration, or load a saved one (and version) to edit
            into a new version.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search configs..."
              className="w-full rounded-full bg-bg-secondary py-3 pl-11 pr-4 text-sm text-text-primary placeholder:text-neutral focus:bg-bg-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
          <button
            type="button"
            onClick={loadConfigs}
            disabled={isLoading}
            title="Refresh"
            aria-label="Refresh"
            className="cursor-pointer rounded-full p-2 text-text-secondary transition-colors hover:bg-neutral-100 hover:text-text-primary disabled:opacity-50"
          >
            <RefreshIcon
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <Button variant="primary" size="md" onClick={handleNewConfig}>
            <PlusIcon className="h-4 w-4" />
            New Config
          </Button>
        </div>

        {isLoading ? (
          <Loader size="sm" message="Loading configurations..." />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-bg-primary p-10 text-center">
            <p className="text-sm font-semibold text-text-primary">
              {search.trim()
                ? `No configs match "${search.trim()}"`
                : "No configurations yet"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Use “New Config” to author one from scratch.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((config) => (
              <ConfigSelectCard
                key={config.id}
                config={config}
                apiKey={apiKey}
                tag={tag}
                isLoadingId={loadingVersionKey}
                onPick={(cfg, version) => void handlePickVersion(cfg, version)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
