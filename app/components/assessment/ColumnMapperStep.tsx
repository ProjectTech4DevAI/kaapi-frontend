"use client";

import { useEffect, useState } from "react";
import {
  ATTACHMENT_FORMATS,
  type Attachment,
  type ColumnMapping,
} from "@/app/lib/types/assessment";

interface ColumnMapperStepProps {
  columns: string[];
  columnMapping: ColumnMapping;
  setColumnMapping: (mapping: ColumnMapping) => void;
  onNext: () => void;
  onBack: () => void;
}

type ColumnRole = "unmapped" | "text" | "attachment" | "ground_truth";

interface ColumnConfig {
  role: ColumnRole;
  attachmentType?: "image" | "pdf";
  attachmentFormat?: string;
}

interface RoleOption {
  value: ColumnRole;
  label: string;
  accentClass: string;
  panelClass: string;
  buttonClass: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "text",
    label: "Text",
    accentClass: "bg-green-800",
    panelClass: "border-green-800/20 bg-green-900/[0.08]",
    buttonClass:
      "border-green-800/20 bg-green-900/[0.08] text-green-800 ring-1 ring-inset ring-green-800/30",
  },
  {
    value: "attachment",
    label: "Attachment",
    accentClass: "bg-orange-900",
    panelClass: "border-orange-900/25 bg-orange-950/[0.08]",
    buttonClass:
      "border-orange-900/25 bg-orange-950/[0.08] text-orange-900 ring-1 ring-inset ring-orange-900/35",
  },
  {
    value: "ground_truth",
    label: "Ground Truth",
    accentClass: "bg-blue-700",
    panelClass: "border-blue-700/25 bg-blue-700/[0.08]",
    buttonClass:
      "border-blue-700/25 bg-blue-700/[0.08] text-blue-700 ring-1 ring-inset ring-blue-700/35",
  },
  {
    value: "unmapped",
    label: "Skip",
    accentClass: "bg-neutral-200",
    panelClass: "border-neutral-200 bg-neutral-50",
    buttonClass:
      "border-neutral-200 bg-neutral-50 text-neutral-900 ring-1 ring-inset ring-neutral-200",
  },
];

function buildColumnConfigs(
  columns: string[],
  columnMapping: ColumnMapping,
): ColumnConfig[] {
  return columns.map((column) => {
    if (columnMapping.textColumns.includes(column)) {
      return { role: "text" };
    }

    if (columnMapping.groundTruthColumns.includes(column)) {
      return { role: "ground_truth" };
    }

    const attachment = columnMapping.attachments.find(
      (item) => item.column === column,
    );
    return attachment
      ? {
          role: "attachment",
          attachmentType: attachment.type,
          attachmentFormat: attachment.format,
        }
      : { role: "unmapped" };
  });
}

export default function ColumnMapperStep({
  columns,
  columnMapping,
  setColumnMapping,
  onNext,
  onBack,
}: ColumnMapperStepProps) {
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(() =>
    buildColumnConfigs(columns, columnMapping),
  );

  useEffect(() => {
    setColumnConfigs(buildColumnConfigs(columns, columnMapping));
  }, [columns, columnMapping]);

  const updateRole = (index: number, role: ColumnRole) => {
    setColumnConfigs((prev) => {
      const current = prev[index];
      const next = [...prev];

      if (role !== "attachment") {
        next[index] = { role };
        return next;
      }

      next[index] = {
        role,
        attachmentType: current?.attachmentType || "image",
        attachmentFormat: current?.attachmentFormat || "url",
      };
      return next;
    });
  };

  const updateAttachmentType = (index: number, type: "image" | "pdf") => {
    setColumnConfigs((prev) => {
      const next = [...prev];
      next[index] = {
        ...prev[index],
        role: "attachment",
        attachmentType: type,
        attachmentFormat: "url",
      };
      return next;
    });
  };

  const updateAttachmentFormat = (index: number, format: string) => {
    setColumnConfigs((prev) => {
      const next = [...prev];
      next[index] = {
        ...prev[index],
        role: "attachment",
        attachmentFormat: format,
      };
      return next;
    });
  };

  const handleNext = () => {
    const textColumns: string[] = [];
    const attachments: Attachment[] = [];
    const groundTruthColumns: string[] = [];

    columnConfigs.forEach((config, index) => {
      const column = columns[index];
      if (!column) return;

      if (config.role === "text") {
        textColumns.push(column);
      } else if (config.role === "ground_truth") {
        groundTruthColumns.push(column);
      } else if (
        config.role === "attachment" &&
        config.attachmentType &&
        config.attachmentFormat
      ) {
        attachments.push({
          column,
          type: config.attachmentType,
          format: config.attachmentFormat as Attachment["format"],
        });
      }
    });

    setColumnMapping({ textColumns, attachments, groundTruthColumns });
    onNext();
  };

  const mappedCount = columnConfigs.filter(
    (config) => config.role !== "unmapped",
  ).length;
  const hasText = columnConfigs.some((config) => config.role === "text");

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-5 pb-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Map Columns
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Choose a role for each column.
            </p>
          </div>
          <div className="rounded-full bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-500">
            {mappedCount}/{columns.length} mapped
          </div>
        </div>

        {columns.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-neutral-900">
              No columns found.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Go back and select a dataset first.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {columns.map((column, index) => {
              const config = columnConfigs[index] || {
                role: "unmapped" as ColumnRole,
              };
              const activeOption =
                ROLE_OPTIONS.find((option) => option.value === config.role) ||
                ROLE_OPTIONS[3];

              return (
                <div
                  key={index}
                  className={`bg-white px-4 py-4 sm:px-5 ${
                    index === 0 ? "" : "border-t border-neutral-200"
                  }`}
                >
                  <div
                    className={`flex flex-col gap-3 rounded-xl border px-3 py-3 ${
                      config.role === "unmapped"
                        ? "border-neutral-200 bg-white"
                        : activeOption.panelClass
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              config.role === "unmapped"
                                ? "bg-neutral-200"
                                : activeOption.accentClass
                            }`}
                          />
                          <span className="font-mono text-sm font-semibold text-neutral-900">
                            {column}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {ROLE_OPTIONS.map((option) => {
                          const isActive = config.role === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateRole(index, option.value)}
                              className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                isActive
                                  ? option.buttonClass
                                  : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {config.role === "attachment" && (
                      <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                        <label className="flex-1">
                          <span className="mb-1 block text-xs font-medium text-neutral-500">
                            Attachment Type
                          </span>
                          <select
                            value={config.attachmentType || "image"}
                            onChange={(event) =>
                              updateAttachmentType(
                                index,
                                event.target.value as "image" | "pdf",
                              )
                            }
                            className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none"
                          >
                            <option value="image">Image</option>
                            <option value="pdf">PDF</option>
                          </select>
                        </label>

                        <label className="flex-1">
                          <span className="mb-1 block text-xs font-medium text-neutral-500">
                            Source
                          </span>
                          <select
                            value={config.attachmentFormat || "url"}
                            onChange={(event) =>
                              updateAttachmentFormat(index, event.target.value)
                            }
                            className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none"
                          >
                            {ATTACHMENT_FORMATS[
                              config.attachmentType || "image"
                            ].map((format) => (
                              <option key={format} value={format}>
                                {format}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-auto sticky bottom-0 z-10 -mx-6 flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900"
          >
            Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span
              className={`text-xs ${
                hasText ? "text-neutral-500" : "text-amber-500"
              }`}
            >
              {hasText
                ? "Ready to continue."
                : "Select at least one Text column."}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasText}
              className={`rounded-lg border px-5 py-2.5 text-sm font-medium ${
                hasText
                  ? "cursor-pointer border-neutral-900 bg-neutral-900 text-white"
                  : "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-500"
              }`}
            >
              Next: Prompt Editor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
