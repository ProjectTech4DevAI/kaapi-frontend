"use client";

// Experiment tab: pick a saved config version + a dataset, then dispatch a run.
// Reuses the config picker from useSavedConfigList and the dataset list from
// useAssessmentDatasetsTab so no run/selection logic is re-implemented here.
import { useEffect, useState } from "react";
import { Button, Loader, Modal, Select } from "@/app/components/ui";
import { ExpandIcon } from "@/app/components/icons";
import { useSavedConfigList } from "@/app/hooks/useSavedConfigList";
import { useAssessmentDatasetsTab } from "@/app/hooks/useAssessmentDatasetsTab";
import { useToast } from "@/app/hooks/useToast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { fetchAssessmentDatasetRows } from "@/app/lib/utils/assessmentFetcher";
import { fetchDatasetPreview } from "@/app/lib/utils/assessment";
import type { ExperimentTabProps } from "@/app/lib/types/assessment";
import { SavedConfigs, SelectedConfigs, UserPrompt } from "./prompt-config";
import ExperimentReview from "./review/ExperimentReview";

export default function ExperimentTab({
  onForbidden,
  promptTemplate,
  setPromptTemplate,
  configs,
  setConfigs,
  datasetId,
  datasetName,
  setDatasetId,
  setSelectedDatasetName,
  experimentName,
  setExperimentName,
  isSubmitting,
  canSubmit,
  submitBlockerMessage,
  onSubmit,
}: ExperimentTabProps) {
  const {
    removeSelection,
    filteredConfigCards,
    searchQuery,
    setSearchQuery,
    isLoadingConfigs,
    hasMoreConfigs,
    nextConfigSkip,
    expandedConfigId,
    versionStateByConfig,
    latestModelByConfig,
    loadingSelectionKeys,
    isSelected,
    loadConfigs,
    loadVersions,
    toggleConfigExpansion,
    toggleVersionSelection,
  } = useSavedConfigList({ configs, setConfigs });

  // Prefill the user prompt from the selected config's Submission template
  // (authored in the Config tab) when nothing has been typed here yet.
  const configTemplate = configs[0]?.query_template ?? "";
  useEffect(() => {
    if (configTemplate && !promptTemplate.trim()) {
      setPromptTemplate(configTemplate);
    }
     
  }, [configTemplate]);

  const { datasets, isLoading, handleDatasetSelect } = useAssessmentDatasetsTab(
    {
      onForbidden,
      datasetId,
      setDatasetId,
      setSelectedDatasetName,
    },
  );

  const datasetOptions = datasets.map((dataset) => ({
    value: dataset.dataset_id.toString(),
    label: dataset.dataset_name,
  }));

  const toast = useToast();
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";
  // The selected dataset's column names power the User prompt @-mention + chips.
  const [datasetColumns, setDatasetColumns] = useState<string[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPromptFullOpen, setIsPromptFullOpen] = useState(false);

  // Select a dataset, then load just its headers (limit 1 row) for the prompt.
  const handleSelectDataset = async (id: string) => {
    handleDatasetSelect(id);
    setDatasetColumns([]);
    if (!id) return;
    setIsLoadingColumns(true);
    try {
      const preview = await fetchDatasetPreview(id, apiKey, 1);
      setDatasetColumns(preview.headers.filter((col) => col.trim() !== ""));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load dataset columns",
      );
    } finally {
      setIsLoadingColumns(false);
    }
  };

  const hasPrompt = promptTemplate.trim().length > 0;
  const canDownload = !!datasetId && configs.length > 0 && hasPrompt;

  // Build a directly-usable single-config API batch body from all dataset rows.
  const handleDownloadInput = async () => {
    if (!canDownload || isDownloading) return;
    setIsDownloading(true);
    try {
      if (configs.length > 1) {
        toast.warning(
          "API batch input is single-config; used the first selected configuration.",
        );
      }
      // Rows come pre-cleaned from the backend (empty columns stripped).
      const { rows } = await fetchAssessmentDatasetRows(datasetId, apiKey);
      const primary = configs[0];
      const body = {
        config: { id: primary.config_id, version: primary.config_version },
        input: { query: promptTemplate, data: rows },
        callback_url: "",
        request_metadata: {},
      };
      const safeName = (datasetName || datasetId).replace(
        /[^a-z0-9-_]+/gi,
        "-",
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(body, null, 2)], {
          type: "application/json",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `assessment-batch-input-${safeName}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to download API input",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (isReviewOpen) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-auto px-6 pt-6">
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 pb-8">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-text-primary">
              Review &amp; Run
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Verify your experiment before running.
            </p>
          </div>

          <ExperimentReview
            experimentName={experimentName}
            setExperimentName={setExperimentName}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-bg-primary p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Dataset
              </div>
              {datasetName ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-status-success" />
                  <span className="truncate text-sm font-medium text-text-primary">
                    {datasetName}
                  </span>
                </div>
              ) : (
                <div className="mt-2 text-sm text-text-secondary">
                  Not selected
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-bg-primary p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Configuration{configs.length > 1 ? "s" : ""}
                {configs.length > 0 && (
                  <span className="ml-1 font-normal normal-case">
                    ({configs.length})
                  </span>
                )}
              </div>
              {configs.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {configs.map((config) => (
                    <li
                      key={`${config.config_id}-${config.config_version}`}
                      className="min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-text-primary">
                          {config.name ?? "Configuration"}
                        </span>
                        <span className="inline-flex shrink-0 items-center rounded-full bg-bg-secondary px-2 py-0.5 font-mono text-[10px] font-semibold text-text-secondary">
                          v{config.config_version}
                        </span>
                      </div>
                      <div className="truncate font-mono text-[11px] text-text-secondary">
                        {config.config_id}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-sm text-text-secondary">
                  None selected
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
            <div className="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                User prompt
              </span>
              {hasPrompt && (
                <button
                  type="button"
                  onClick={() => setIsPromptFullOpen(true)}
                  aria-label="Expand user prompt"
                  title="Expand"
                  className="cursor-pointer rounded-md p-1 text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                >
                  <ExpandIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {hasPrompt ? (
              <pre className="h-40 overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-6 text-text-primary">
                {promptTemplate}
              </pre>
            ) : (
              <div className="px-4 py-3 text-sm text-text-secondary">
                Not set
              </div>
            )}
          </div>

          <Modal
            open={isPromptFullOpen}
            onClose={() => setIsPromptFullOpen(false)}
            title="User prompt"
            maxWidth="max-w-3xl"
            maxHeight="max-h-[90vh]"
          >
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words px-6 pb-6 font-mono text-sm leading-7 text-text-primary">
              {promptTemplate}
            </pre>
          </Modal>
        </div>

        <div className="sticky bottom-0 z-10 mt-auto -mx-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg-secondary px-6 py-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setIsReviewOpen(false)}
            className="!rounded-lg !px-6"
          >
            Back
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            {!canSubmit && submitBlockerMessage && (
              <span className="text-xs text-text-secondary">
                {submitBlockerMessage}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void handleDownloadInput()}
              disabled={!canDownload || isDownloading}
              className="!rounded-lg !px-6"
            >
              {isDownloading ? "Preparing..." : "Download batch API input JSON"}
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              className="!rounded-lg !px-6"
            >
              {isSubmitting ? "Running..." : "Run experiment"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto px-6 pt-6">
      <div className="mx-auto w-full max-w-7xl flex-1 pb-24">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-text-primary">
            Experiment
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Pick a saved configuration and a dataset, then run the assessment.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(330px,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(360px,1.05fr)]">
          <section className="min-w-0 space-y-6">
            <div className="rounded-2xl border border-border bg-bg-primary p-4">
              <div className="mb-2 text-sm font-semibold text-text-primary">
                Dataset
              </div>
              {isLoading ? (
                <Loader size="sm" message="Loading datasets..." />
              ) : (
                <Select
                  value={datasetId}
                  placeholder="Select a dataset"
                  options={datasetOptions}
                  onChange={(event) =>
                    void handleSelectDataset(event.target.value)
                  }
                />
              )}
              {datasetName && (
                <p className="mt-2 text-xs text-text-secondary">
                  Selected: {datasetName}
                  {isLoadingColumns
                    ? " · loading columns…"
                    : datasetColumns.length > 0
                      ? ` · ${datasetColumns.length} columns`
                      : ""}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-bg-primary p-4">
              <div className="mb-2 text-sm font-semibold text-text-primary">
                User prompt
              </div>
              <UserPrompt
                textColumns={datasetColumns}
                promptTemplate={promptTemplate}
                setPromptTemplate={setPromptTemplate}
                previewMode={false}
              />
            </div>
          </section>

          <aside className="self-start space-y-5 lg:sticky lg:top-6 lg:min-w-[330px] xl:min-w-[360px]">
            <div className="rounded-2xl border border-border bg-bg-primary p-4">
              <div className="mb-3 text-sm font-semibold text-text-primary">
                Configuration
                <span className="ml-2 text-xs font-normal text-text-secondary">
                  {configs.length > 0
                    ? `${configs.length} selected`
                    : "Choose at least one saved configuration"}
                </span>
              </div>

              {configs.length > 0 && (
                <div className="mb-4">
                  <SelectedConfigs
                    configs={configs}
                    onRemove={removeSelection}
                  />
                </div>
              )}

              <SavedConfigs
                configCards={filteredConfigCards}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isLoadingConfigs={isLoadingConfigs}
                hasMoreConfigs={hasMoreConfigs}
                nextConfigSkip={nextConfigSkip}
                expandedConfigId={expandedConfigId}
                versionStateByConfig={versionStateByConfig}
                latestModelByConfig={latestModelByConfig}
                loadingSelectionKeys={loadingSelectionKeys}
                isSelected={isSelected}
                onLoadMoreConfigs={(skip) => loadConfigs(skip, false)}
                onLoadVersions={(configId, skip) =>
                  void loadVersions(configId, skip)
                }
                onToggleConfigExpansion={toggleConfigExpansion}
                onToggleVersionSelection={toggleVersionSelection}
              />
            </div>
          </aside>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-auto -mx-6 flex items-center justify-end gap-3 border-t border-border bg-bg-secondary px-6 py-3">
        <Button
          type="button"
          size="lg"
          onClick={() => setIsReviewOpen(true)}
          className="!rounded-lg !px-6"
        >
          Review
        </Button>
      </div>
    </div>
  );
}
