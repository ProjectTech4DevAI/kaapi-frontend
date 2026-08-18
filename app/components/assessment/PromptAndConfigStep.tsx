"use client";

import { useState } from "react";
import { Button, Modal } from "@/app/components/ui";
import { ChevronLeftIcon, ExpandIcon } from "@/app/components/icons";
import { usePromptAndConfigStep } from "@/app/hooks/usePromptAndConfigStep";
import { ASSESSMENT_TAG } from "@/app/lib/assessment/constants";
import type { PromptAndConfigStepProps } from "@/app/lib/types/assessment";
import {
  AssessmentConfiguration,
  PromptPanel,
  ResponseSchema,
  SetupProgress,
} from "./prompt-config";

export default function PromptAndConfigStep(props: PromptAndConfigStepProps) {
  const {
    systemInstruction,
    setSystemInstruction,
    configs,
    outputSchema,
    setOutputSchema,
    onBack,
  } = props;

  const {
    promptStatus,
    responseSummary,
    hasConfiguredResponseFormat,
    currentProvider,
    currentModel,
    providerModels,
    currentParamDefs,
    draftParams,
    configName,
    commitMessage,
    isSaving,
    saveMode,
    setSaveMode,
    versionConfigId,
    setVersionConfigId,
    filteredConfigCards,
    setConfigName,
    setCommitMessage,
    handleProviderChange,
    handleModelChange,
    updateDraftParam,
    handleCreateAndAdd,
    configBlob,
  } = usePromptAndConfigStep(props);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isPromptFullOpen, setIsPromptFullOpen] = useState(false);

  const handleDownloadConfig = () => {
    // Shape matches the API body the save will use:
    // - new config  -> POST /configs        : { name, tag, commit_message, config_blob }
    // - new version -> POST /configs/{id}/versions : { config_blob, commit_message }
    // name/commit are left as skeleton placeholders for the user to fill.
    const payload =
      saveMode === "version"
        ? {
            config_blob: configBlob,
            commit_message: commitMessage.trim(),
          }
        : {
            name: configName.trim(),
            tag: ASSESSMENT_TAG,
            commit_message: commitMessage.trim(),
            config_blob: configBlob,
          };
    const baseName =
      saveMode === "version"
        ? configName.trim() || versionConfigId || "assessment-config-version"
        : configName.trim() || "assessment-config";
    const fileName = baseName.replace(/[^a-z0-9-_]+/gi, "-");
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileName}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 pb-20">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Assessment
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Edit the system prompt, response format, and model on the left —
              scroll to reach each. Live preview on the right.
            </p>
          </div>
          <SetupProgress
            promptStatus={promptStatus}
            selectedConfigCount={configs.length}
            responseSummary={responseSummary}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="min-w-0 space-y-5">
            <PromptPanel
              systemInstruction={systemInstruction}
              setSystemInstruction={setSystemInstruction}
            />

            <ResponseSchema
              schema={outputSchema}
              setSchema={setOutputSchema}
              summary={responseSummary}
              hasFields={hasConfiguredResponseFormat}
            />

            <AssessmentConfiguration
              currentProvider={currentProvider}
              currentModel={currentModel}
              providerModels={providerModels}
              currentParamDefs={currentParamDefs}
              draftParams={draftParams}
              configName={configName}
              commitMessage={commitMessage}
              isSaving={isSaving}
              isSaveModalOpen={isSaveModalOpen}
              setIsSaveModalOpen={setIsSaveModalOpen}
              saveMode={saveMode}
              setSaveMode={setSaveMode}
              versionConfigId={versionConfigId}
              setVersionConfigId={setVersionConfigId}
              existingConfigs={filteredConfigCards}
              setConfigName={setConfigName}
              setCommitMessage={setCommitMessage}
              onProviderChange={handleProviderChange}
              onModelChange={handleModelChange}
              onParamChange={updateDraftParam}
              onSaveConfig={handleCreateAndAdd}
            />
          </section>

          <aside className="self-start lg:sticky lg:top-6 lg:border-l lg:border-border lg:pl-8">
            <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary shadow-sm">
              <div className="border-b border-border bg-bg-secondary px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Preview
              </div>
              <div className="space-y-6 p-5 text-sm">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Model
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-primary">
                      {currentProvider}
                    </span>
                    <span className="rounded-md bg-bg-secondary px-2 py-1 font-mono text-xs text-text-primary">
                      {currentModel}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                      System prompt
                    </span>
                    {systemInstruction.trim() && (
                      <button
                        type="button"
                        onClick={() => setIsPromptFullOpen(true)}
                        aria-label="Expand system prompt"
                        title="Expand"
                        className="cursor-pointer rounded-md p-1 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                      >
                        <ExpandIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {systemInstruction.trim() ? (
                    <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-bg-secondary px-4 py-3 font-mono text-xs leading-6 text-text-primary">
                      {systemInstruction}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-text-secondary">
                      No system prompt yet
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    Response format
                  </div>
                  {hasConfiguredResponseFormat ? (
                    <ul className="flex flex-wrap gap-2">
                      {outputSchema
                        .filter((field) => field.name.trim())
                        .map((field) => (
                          <li
                            key={field.id}
                            className="inline-flex items-center rounded-full border border-border bg-bg-secondary px-2.5 py-1 font-mono text-[11px] text-text-primary"
                          >
                            {field.name}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-text-secondary">
                      Free text (no structured output)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Modal
        open={isPromptFullOpen}
        onClose={() => setIsPromptFullOpen(false)}
        title="System prompt"
        maxWidth="max-w-3xl"
        maxHeight="max-h-[90vh]"
      >
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words px-6 pb-6 font-mono text-sm leading-7 text-text-primary">
          {systemInstruction}
        </pre>
      </Modal>

      <div className="sticky bottom-0 z-10 mt-auto -mx-6 border-t border-border bg-bg-secondary px-6 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            className="!rounded-lg !px-6"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleDownloadConfig}
              className="!rounded-lg !px-6"
            >
              Download config JSON
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => setIsSaveModalOpen(true)}
              disabled={isSaving}
              className="!rounded-lg !px-6"
            >
              {isSaving ? "Saving..." : "Save behavior"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
