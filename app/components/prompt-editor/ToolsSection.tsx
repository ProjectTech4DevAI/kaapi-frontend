"use client";

import { useState } from "react";
import { Field } from "@/app/components/ui";
import { InfoIcon } from "@/app/components/icons";
import { Tool } from "@/app/lib/types/promptEditor";

interface ToolsSectionProps {
  tools: Tool[];
  isGpt5: boolean;
  onAddTool: () => void;
  onRemoveTool: (index: number) => void;
  onUpdateTool: <K extends keyof Tool>(
    index: number,
    field: K,
    value: Tool[K],
  ) => void;
}

export default function ToolsSection({
  tools,
  isGpt5,
  onAddTool,
  onRemoveTool,
  onUpdateTool,
}: ToolsSectionProps) {
  const [showTooltip, setShowTooltip] = useState<number | null>(null);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-semibold text-text-primary">Tools</label>
        <button
          onClick={onAddTool}
          className="px-2 py-1 rounded text-xs font-medium bg-accent-primary text-bg-primary cursor-pointer"
        >
          + Add Tool
        </button>
      </div>
      {tools.map((tool, index) => (
        <div
          key={index}
          className="p-3 rounded mb-2 border border-border bg-bg-secondary"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-text-primary">
              File Search
            </span>
            <button
              onClick={() => onRemoveTool(index)}
              className="text-xs bg-transparent border-0 text-status-error cursor-pointer"
            >
              Remove
            </button>
          </div>
          <div className="mb-3">
            <Field
              label="Knowledge Base ID"
              value={tool.knowledge_base_ids[0] || ""}
              onChange={(v) => onUpdateTool(index, "knowledge_base_ids", [v])}
              placeholder="vs_abc123"
            />
          </div>

          {!isGpt5 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-text-secondary">
                  Max Results
                </label>
                <div
                  className="relative inline-flex items-center justify-center cursor-help w-3.5 h-3.5"
                  onMouseEnter={() => setShowTooltip(index)}
                  onMouseLeave={() => setShowTooltip(null)}
                >
                  <InfoIcon className="w-3.5 h-3.5 text-text-secondary" />
                  {showTooltip === index && (
                    <div className="absolute left-full ml-2 px-2 py-1.5 rounded text-xs z-50 bg-text-primary text-bg-primary top-1/2 -translate-y-1/2 shadow-lg whitespace-nowrap leading-snug">
                      Controls how many matching results are returned
                      <br />
                      from the search
                      <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-text-primary" />
                    </div>
                  )}
                </div>
              </div>
              <input
                type="number"
                value={tool.max_num_results}
                onChange={(e) =>
                  onUpdateTool(
                    index,
                    "max_num_results",
                    parseInt(e.target.value) || 20,
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-accent-primary/20 focus:border-accent-primary transition-colors"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
