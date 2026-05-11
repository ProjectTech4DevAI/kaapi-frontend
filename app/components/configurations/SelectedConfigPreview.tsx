"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "@/app/components/icons";
import { SavedConfig } from "@/app/lib/types/configs";

interface SelectedConfigPreviewProps {
  config: SavedConfig;
}

export default function SelectedConfigPreview({
  config,
}: SelectedConfigPreviewProps) {
  const promptRef = useRef<HTMLDivElement>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [isPromptOverflowing, setIsPromptOverflowing] = useState(false);

  useLayoutEffect(() => {
    setPromptExpanded(false);
    const el = promptRef.current;
    if (!el) return;
    setIsPromptOverflowing(el.scrollHeight > el.clientHeight);
  }, [config.config_id, config.version]);

  const knowledgeBaseIds = config.tools
    ?.map((tool) => tool.knowledge_base_ids)
    .flat()
    .join(", ");

  return (
    <div className="mt-4 rounded-md p-4 bg-bg-secondary">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <PreviewField
          label="Provider & Model"
          value={`${config.provider}/${config.modelName}`}
        />

        {config.temperature !== undefined && (
          <PreviewField
            label="Temperature"
            value={config.temperature.toFixed(2)}
          />
        )}

        {config.tools && config.tools.length > 0 && (
          <>
            <div className="col-span-2">
              <PreviewLabel>Knowledge Base IDs</PreviewLabel>
              <div className="text-xs font-mono break-all text-text-primary">
                {knowledgeBaseIds || "None"}
              </div>
            </div>
            <PreviewField
              label="Max Results"
              value={String(config.tools[0].max_num_results)}
            />
          </>
        )}
      </div>

      <div className="border-t pt-3 border-border">
        <div className="flex items-center justify-between mb-2">
          <PreviewLabel>Prompt Preview</PreviewLabel>
          {config.instructions && isPromptOverflowing && (
            <button
              onClick={() => setPromptExpanded((p) => !p)}
              className="rounded p-0.5 transition-colors text-text-secondary hover:text-text-primary cursor-pointer"
              title={promptExpanded ? "Collapse" : "Expand"}
            >
              {promptExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
          )}
        </div>
        <div
          ref={promptRef}
          className={`text-xs font-mono overflow-y-auto transition-all text-text-primary ${
            promptExpanded ? "max-h-48" : "max-h-12 line-clamp-3"
          }`}
        >
          {config.instructions || "No instructions set"}
        </div>
      </div>
    </div>
  );
}

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium mb-1 text-text-secondary">
      {children}
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <PreviewLabel>{label}</PreviewLabel>
      <div className="text-sm font-mono text-text-primary">{value}</div>
    </div>
  );
}
