"use client";

import { useEffect, useState } from "react";
import { Button, Select } from "@/app/components/ui";
import {
  ASSESSMENT_ROLE_OPTION_MAP,
  ASSESSMENT_ROLE_OPTIONS,
  ATTACHMENT_FORMATS,
} from "@/app/lib/assessment/constants";
import type {
  Attachment,
  ColumnConfig,
  ColumnRole,
  ColumnMapperStepProps,
} from "@/app/lib/types/assessment";
import { buildColumnConfigs, colorMapping } from "@/app/lib/utils/assessment";

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
    if (role === "ground_truth") {
      return;
    }

    setColumnConfigs((prev) => {
      const current = prev[index];
      const next = [...prev];

      if (role !== "attachment") {
        next[index] = { role };
        return next;
      }

      next[index] = {
        role,
        attachmentType: current?.attachmentType || "mixed",
        attachmentFormat: current?.attachmentFormat || "url",
      };
      return next;
    });
  };

  const updateAttachmentType = (
    index: number,
    type: "image" | "pdf" | "mixed",
  ) => {
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

  const patchAttachment = (index: number, patch: Partial<ColumnConfig>) => {
    setColumnConfigs((prev) => {
      const next = [...prev];
      next[index] = { ...prev[index], role: "attachment", ...patch };
      return next;
    });
  };

  const handleNext = () => {
    const textColumns: string[] = [];
    const attachments: Attachment[] = [];

    columnConfigs.forEach((config, index) => {
      const column = columns[index];
      if (!column) return;

      if (config.role === "text") {
        textColumns.push(column);
      } else if (
        config.role === "attachment" &&
        config.attachmentType &&
        config.attachmentFormat
      ) {
        const attachment: Attachment = {
          column,
          type: config.attachmentType,
          format: config.attachmentFormat as Attachment["format"],
        };
        if (config.attachmentType === "mixed" && config.attachmentTypeColumn) {
          const map: Record<string, string> = {};
          const split = (s?: string) =>
            (s || "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
          split(config.attachmentImageValues).forEach(
            (v) => (map[v] = "image"),
          );
          split(config.attachmentPdfValues).forEach((v) => (map[v] = "pdf"));
          if (Object.keys(map).length > 0) {
            attachment.type_column = config.attachmentTypeColumn;
            attachment.type_value_map = map;
          }
        }
        attachments.push(attachment);
      }
    });

    setColumnMapping({ textColumns, attachments, groundTruthColumns: [] });
    onNext();
  };

  const mappedCount = columnConfigs.filter(
    (config) => config.role !== "unmapped",
  ).length;
  const hasMappedColumn = columnConfigs.some(
    (config) => config.role === "text" || config.role === "attachment",
  );

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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 sm:max-w-[50%]">
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${roleVisuals.dotClass}`}
                          />
                          <span className="min-w-0 wrap-break-word font-mono text-sm font-semibold text-text-primary">
                            {column}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:shrink-0">
                        {ASSESSMENT_ROLE_OPTIONS.map((option) => {
                          const isGroundTruth = option.value === "ground_truth";
                          const isActive = config.role === option.value;
                          return (
                            <Button
                              key={option.value}
                              type="button"
                              variant={isGroundTruth ? "ghost" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (!isGroundTruth) {
                                  updateRole(index, option.value);
                                }
                              }}
                              aria-disabled={isGroundTruth}
                              title={
                                isGroundTruth
                                  ? "Ground Truth mapping is coming soon"
                                  : undefined
                              }
                              className={`${
                                isGroundTruth
                                  ? "cursor-not-allowed! bg-transparent! hover:bg-transparent! text-text-secondary!"
                                  : isActive
                                    ? roleVisuals.activeButtonClass
                                    : "bg-bg-primary! hover:bg-bg-secondary!"
                              }`}
                            >
                              <span>{option.label}</span>
                              {isGroundTruth && (
                                <span className="rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                                  Soon
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {config.role === "attachment" && (
                      <>
                        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                          <label className="flex-1">
                            <span className="mb-1 block text-xs font-medium text-text-secondary">
                              Attachment Type
                            </span>
                            <Select
                              value={config.attachmentType || "mixed"}
                              onChange={(event) =>
                                updateAttachmentType(
                                  index,
                                  event.target.value as
                                    | "image"
                                    | "pdf"
                                    | "mixed",
                                )
                              }
                              options={[
                                {
                                  value: "mixed",
                                  label: "Mixed (image or PDF)",
                                },
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
                                updateAttachmentFormat(
                                  index,
                                  event.target.value,
                                )
                              }
                              options={ATTACHMENT_FORMATS[
                                config.attachmentType || "mixed"
                              ].map((format) => ({
                                value: format,
                                label: format,
                              }))}
                              className="w-full cursor-pointer rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:ring-1"
                            />
                          </label>
                        </div>

                        {(config.attachmentType || "mixed") === "mixed" && (
                          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-bg-primary/50 p-3">
                            <span className="text-[11px] text-text-secondary">
                              Mixed: pick a column whose value tells each
                              row&apos;s type, then list which values mean image
                              vs PDF.
                            </span>
                            <label className="block">
                              <span className="mb-1 block text-xs font-medium text-text-secondary">
                                Type column
                              </span>
                              <Select
                                value={config.attachmentTypeColumn || ""}
                                onChange={(event) =>
                                  patchAttachment(index, {
                                    attachmentTypeColumn:
                                      event.target.value || undefined,
                                  })
                                }
                                options={[
                                  { value: "", label: "Select column…" },
                                  ...columns
                                    .filter((_, i) => i !== index)
                                    .map((col) => ({ value: col, label: col })),
                                ]}
                                className="w-full cursor-pointer rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:ring-1"
                              />
                            </label>
                            {config.attachmentTypeColumn && (
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <label className="flex-1">
                                  <span className="mb-1 block text-xs font-medium text-text-secondary">
                                    Values meaning Image
                                  </span>
                                  <input
                                    type="text"
                                    value={config.attachmentImageValues || ""}
                                    onChange={(event) =>
                                      patchAttachment(index, {
                                        attachmentImageValues:
                                          event.target.value,
                                      })
                                    }
                                    placeholder="e.g. image, photo, jpg"
                                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:ring-1"
                                  />
                                </label>
                                <label className="flex-1">
                                  <span className="mb-1 block text-xs font-medium text-text-secondary">
                                    Values meaning PDF
                                  </span>
                                  <input
                                    type="text"
                                    value={config.attachmentPdfValues || ""}
                                    onChange={(event) =>
                                      patchAttachment(index, {
                                        attachmentPdfValues: event.target.value,
                                      })
                                    }
                                    placeholder="e.g. pdf, document, doc"
                                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:ring-1"
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </>
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
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span
              className={`text-xs ${
                hasMappedColumn ? "text-text-secondary" : "text-status-warning"
              }`}
            >
              {hasMappedColumn
                ? "Ready to continue."
                : "Map at least one Text or Attachment column."}
            </span>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!hasMappedColumn}
            >
              Next: Eliminatory
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
