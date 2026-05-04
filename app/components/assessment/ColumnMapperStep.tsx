"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components";
import Select from "@/app/components/Select";
import {
  ASSESSMENT_ROLE_OPTION_MAP,
  ASSESSMENT_ROLE_OPTIONS,
} from "@/app/lib/assessment/constants";
import {
  ATTACHMENT_FORMATS,
  type Attachment,
  type ColumnConfig,
  type ColumnRole,
  type ColumnMapping,
  type ColumnMapperStepProps,
  type RoleVisuals,
} from "@/app/lib/types/assessment";

function colorMapping(role: ColumnRole): RoleVisuals {
  switch (role) {
    case "text":
      return {
        panelClass: "border-status-success-border bg-status-success-bg",
        dotClass: "bg-status-success",
        activeButtonClass:
          "border-status-success-border bg-status-success-bg text-status-success-text ring-1 ring-inset ring-status-success-border",
      };
    case "attachment":
      return {
        panelClass: "border-status-warning-border bg-status-warning-bg",
        dotClass: "bg-status-warning",
        activeButtonClass:
          "border-status-warning-border bg-status-warning-bg text-status-warning-text ring-1 ring-inset ring-status-warning-border",
      };
    case "ground_truth":
      return {
        panelClass: "border-accent-subtle bg-accent-subtle/20",
        dotClass: "bg-accent-primary",
        activeButtonClass:
          "border-accent-subtle bg-accent-subtle/20 text-accent-primary ring-1 ring-inset ring-accent-subtle",
      };
    case "unmapped":
    default:
      return {
        panelClass: "border-border bg-bg-primary",
        dotClass: "bg-border",
        activeButtonClass:
          "border-border bg-bg-secondary text-text-primary ring-1 ring-inset ring-border",
      };
  }
}

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
            <h2 className="text-lg font-semibold text-text-primary">
              Map Columns
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Choose a role for each column.
            </p>
          </div>
          <div className="rounded-full bg-bg-secondary px-3 py-1 text-xs font-medium text-text-secondary">
            {mappedCount}/{columns.length} mapped
          </div>
        </div>

        {columns.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg-primary px-6 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">
              No columns found.
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Go back and select a dataset first.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
            {columns.map((column, index) => {
              const config = columnConfigs[index] || {
                role: "unmapped" as ColumnRole,
              };
              const activeOption =
                ASSESSMENT_ROLE_OPTION_MAP[config.role] ||
                ASSESSMENT_ROLE_OPTION_MAP.unmapped;
              const roleVisuals = colorMapping(activeOption.value);

              return (
                <div
                  key={index}
                  className={`bg-bg-primary px-4 py-4 sm:px-5 ${
                    index === 0 ? "" : "border-t border-border"
                  }`}
                >
                  <div
                    className={`flex flex-col gap-3 rounded-xl border px-3 py-3 ${roleVisuals.panelClass}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${roleVisuals.dotClass}`}
                          />
                          <span className="font-mono text-sm font-semibold text-text-primary">
                            {column}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {ASSESSMENT_ROLE_OPTIONS.map((option) => {
                          const isActive = config.role === option.value;
                          return (
                            <Button
                              key={option.value}
                              type="button"
                              variant={isActive ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => updateRole(index, option.value)}
                              className={`!rounded-full !px-4 !py-2 ${
                                isActive
                                  ? roleVisuals.activeButtonClass
                                  : "!bg-bg-primary text-text-secondary hover:!bg-bg-secondary"
                              }`}
                            >
                              {option.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {config.role === "attachment" && (
                      <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                        <label className="flex-1">
                          <span className="mb-1 block text-xs font-medium text-text-secondary">
                            Attachment Type
                          </span>
                          <Select
                            value={config.attachmentType || "image"}
                            onChange={(event) =>
                              updateAttachmentType(
                                index,
                                event.target.value as "image" | "pdf",
                              )
                            }
                            options={[
                              { value: "image", label: "Image" },
                              { value: "pdf", label: "PDF" },
                            ]}
                            className="w-full cursor-pointer rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:ring-1"
                          />
                        </label>

                        <label className="flex-1">
                          <span className="mb-1 block text-xs font-medium text-text-secondary">
                            Source
                          </span>
                          <Select
                            value={config.attachmentFormat || "url"}
                            onChange={(event) =>
                              updateAttachmentFormat(index, event.target.value)
                            }
                            options={ATTACHMENT_FORMATS[
                              config.attachmentType || "image"
                            ].map((format) => ({
                              value: format,
                              label: format,
                            }))}
                            className="w-full cursor-pointer rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:ring-1"
                          />
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

      <div className="mt-auto sticky bottom-0 z-10 -mx-6 flex flex-col gap-3 border-t border-border bg-bg-secondary px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="!rounded-lg"
          >
            Back
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span
              className={`text-xs ${
                hasText ? "text-text-secondary" : "text-status-warning"
              }`}
            >
              {hasText
                ? "Ready to continue."
                : "Select at least one Text column."}
            </span>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!hasText}
              className="!rounded-lg"
            >
              Next: Prompt Editor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
