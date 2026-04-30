"use client";

import { useEffect, useState } from "react";
import { colors } from "@/app/lib/colors";
import { Attachment, ColumnMapping, ATTACHMENT_FORMATS } from "../types";

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
  accent: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "text",
    label: "Text",
    accent: "#166534",
    activeBg: "rgba(22, 101, 52, 0.08)",
    activeBorder: "rgba(22, 101, 52, 0.2)",
    activeText: "#166534",
  },
  {
    value: "attachment",
    label: "Attachment",
    accent: "#7c2d12",
    activeBg: "rgba(124, 45, 18, 0.08)",
    activeBorder: "rgba(124, 45, 18, 0.24)",
    activeText: "#7c2d12",
  },
  {
    value: "ground_truth",
    label: "Ground Truth",
    accent: "#1d4ed8",
    activeBg: "rgba(29, 78, 216, 0.08)",
    activeBorder: "rgba(29, 78, 216, 0.24)",
    activeText: "#1d4ed8",
  },
  {
    value: "unmapped",
    label: "Skip",
    accent: colors.text.secondary,
    activeBg: colors.bg.secondary,
    activeBorder: colors.border,
    activeText: colors.text.primary,
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
            <h2
              className="text-lg font-semibold"
              style={{ color: colors.text.primary }}
            >
              Map Columns
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: colors.text.secondary }}
            >
              Choose a role for each column.
            </p>
          </div>
          <div
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: colors.bg.secondary,
              color: colors.text.secondary,
            }}
          >
            {mappedCount}/{columns.length} mapped
          </div>
        </div>

        {columns.length === 0 ? (
          <div
            className="rounded-2xl border px-6 py-10 text-center"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.bg.primary,
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: colors.text.primary }}
            >
              No columns found.
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: colors.text.secondary }}
            >
              Go back and select a dataset first.
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-2xl border"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.bg.primary,
            }}
          >
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
                  className="px-4 py-4 sm:px-5"
                  style={{
                    borderTop:
                      index === 0 ? "none" : `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                  }}
                >
                  <div
                    className="flex flex-col gap-3 rounded-xl border px-3 py-3"
                    style={{
                      borderColor:
                        config.role === "unmapped"
                          ? colors.border
                          : activeOption.activeBorder,
                      backgroundColor:
                        config.role === "unmapped"
                          ? colors.bg.primary
                          : activeOption.activeBg,
                    }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                config.role === "unmapped"
                                  ? colors.border
                                  : activeOption.accent,
                            }}
                          />
                          <span
                            className="font-mono text-sm font-semibold"
                            style={{ color: colors.text.primary }}
                          >
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
                              className="cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: isActive
                                  ? option.activeBg
                                  : colors.bg.primary,
                                borderColor: isActive
                                  ? option.activeBorder
                                  : colors.border,
                                color: isActive
                                  ? option.activeText
                                  : colors.text.secondary,
                                boxShadow: isActive
                                  ? `inset 0 0 0 1px ${option.accent}`
                                  : "none",
                              }}
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
                          <span
                            className="mb-1 block text-xs font-medium"
                            style={{ color: colors.text.secondary }}
                          >
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
                            className="cursor-pointer w-full rounded-lg border px-3 py-2 text-sm outline-none"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="image">Image</option>
                            <option value="pdf">PDF</option>
                          </select>
                        </label>

                        <label className="flex-1">
                          <span
                            className="mb-1 block text-xs font-medium"
                            style={{ color: colors.text.secondary }}
                          >
                            Source
                          </span>
                          <select
                            value={config.attachmentFormat || "url"}
                            onChange={(event) =>
                              updateAttachmentFormat(index, event.target.value)
                            }
                            className="cursor-pointer w-full rounded-lg border px-3 py-2 text-sm outline-none"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
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

      <div
        className="mt-auto sticky bottom-0 z-10 flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between"
        style={{
          backgroundColor: colors.bg.secondary,
          borderColor: colors.border,
          marginLeft: "-1.5rem",
          marginRight: "-1.5rem",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border px-5 py-2.5 text-sm font-medium"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.bg.primary,
              color: colors.text.primary,
            }}
          >
            Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span
              className="text-xs"
              style={{
                color: hasText ? colors.text.secondary : colors.status.warning,
              }}
            >
              {hasText
                ? "Ready to continue."
                : "Select at least one Text column."}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasText}
              className="rounded-lg px-5 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: hasText
                  ? colors.accent.primary
                  : colors.bg.secondary,
                color: hasText ? colors.text.white : colors.text.secondary,
                border: `1px solid ${hasText ? colors.accent.primary : colors.border}`,
                cursor: hasText ? "pointer" : "not-allowed",
              }}
            >
              Next: Prompt Editor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
