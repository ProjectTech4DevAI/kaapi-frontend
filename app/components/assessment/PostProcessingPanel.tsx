"use client";

import { useEffect, useState } from "react";
import { Button, Select } from "@/app/components/ui";
import { ChevronDownIcon, CloseIcon } from "@/app/components/icons";
import FormulaInput from "@/app/components/shared/FormulaInput";
import {
  POST_PROCESSING_FILTER_OPS,
  POST_PROCESSING_NO_VALUE_OPS,
  emptyPostProcessingConfig,
} from "@/app/lib/assessment/constants";
import type {
  PostProcessingConfig,
  PostProcessingComputedColumn,
  PostProcessingFilterRule,
  PostProcessingPanelProps,
  PostProcessingSortRule,
} from "@/app/lib/types/assessment";

export default function PostProcessingPanel({
  availableColumns: seedColumns,
  fetchColumns,
  initialConfig,
  onSave,
}: PostProcessingPanelProps) {
  const [config, setConfig] = useState<PostProcessingConfig>(
    initialConfig ?? emptyPostProcessingConfig(),
  );
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [fetchedColumns, setFetchedColumns] = useState<string[] | null>(null);
  const availableColumns = fetchedColumns ?? seedColumns;

  // Fetch columns once when panel first opens
  useEffect(() => {
    if (!open || fetchedColumns !== null || !fetchColumns) return;
    fetchColumns()
      .then(setFetchedColumns)
      .catch(() => setFetchedColumns([]));
  }, [fetchColumns, fetchedColumns, open]);

  // computed columns include user-defined ones for formula autocomplete
  const allColumns = [
    ...availableColumns,
    ...config.computed_columns.map((c) => c.name).filter(Boolean),
  ];

  const addComputedColumn = () => {
    setConfig((prev) => ({
      ...prev,
      computed_columns: [...prev.computed_columns, { name: "", formula: "" }],
    }));
  };

  const updateComputedColumn = (
    i: number,
    patch: Partial<PostProcessingComputedColumn>,
  ) => {
    setConfig((prev) => {
      const next = [...prev.computed_columns];
      next[i] = { ...next[i], ...patch };
      return { ...prev, computed_columns: next };
    });
  };

  const removeComputedColumn = (i: number) => {
    setConfig((prev) => ({
      ...prev,
      computed_columns: prev.computed_columns.filter((_, idx) => idx !== i),
    }));
  };

  const addSort = () => {
    setConfig((prev) => ({
      ...prev,
      sort: [...prev.sort, { column: allColumns[0] ?? "", direction: "desc" }],
    }));
  };

  const updateSort = (i: number, patch: Partial<PostProcessingSortRule>) => {
    setConfig((prev) => {
      const next = [...prev.sort];
      next[i] = { ...next[i], ...patch };
      return { ...prev, sort: next };
    });
  };

  const removeSort = (i: number) => {
    setConfig((prev) => ({
      ...prev,
      sort: prev.sort.filter((_, idx) => idx !== i),
    }));
  };

  const addFilter = () => {
    setConfig((prev) => ({
      ...prev,
      filter: [
        ...prev.filter,
        { column: allColumns[0] ?? "", op: "eq", value: "" },
      ],
    }));
  };

  const updateFilter = (
    i: number,
    patch: Partial<PostProcessingFilterRule>,
  ) => {
    setConfig((prev) => {
      const next = [...prev.filter];
      next[i] = { ...next[i], ...patch } as PostProcessingFilterRule;
      return { ...prev, filter: next };
    });
  };

  const removeFilter = (i: number) => {
    setConfig((prev) => ({
      ...prev,
      filter: prev.filter.filter((_, idx) => idx !== i),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
    } finally {
      setSaving(false);
    }
  };

  const hasRules =
    config.computed_columns.length > 0 ||
    config.sort.length > 0 ||
    config.filter.length > 0;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-bg-primary">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-bg-secondary"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">
            Post-processing
          </span>
          {hasRules && (
            <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-semibold text-accent-primary">
              {config.computed_columns.length +
                config.sort.length +
                config.filter.length}{" "}
              rules
            </span>
          )}
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-4 space-y-6">
          <div>
            <p className="mb-2 text-xs text-text-secondary font-medium">
              Available columns — type{" "}
              <code className="rounded bg-bg-secondary px-1 text-[11px]">
                @
              </code>{" "}
              in formula to reference
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableColumns.map((col) => (
                <span
                  key={col}
                  className="rounded-md border border-border bg-bg-secondary px-2 py-0.5 font-mono text-[11px] text-text-secondary"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Computed columns
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addComputedColumn}
                className="!rounded-md !px-2.5 !py-1 !text-xs"
              >
                + Add column
              </Button>
            </div>

            {config.computed_columns.length === 0 && (
              <p className="text-xs text-text-secondary">
                No computed columns. Add one to create formulas like{" "}
                <code className="text-[11px]">
                  @Novelty_score + @Feasibility_score
                </code>
                .
              </p>
            )}

            <div className="space-y-3">
              {config.computed_columns.map((col, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary p-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) =>
                        updateComputedColumn(i, { name: e.target.value })
                      }
                      placeholder="Column name"
                      className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary sm:w-36 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <FormulaInput
                        value={col.formula}
                        onChange={(v) =>
                          updateComputedColumn(i, { formula: v })
                        }
                        columns={allColumns}
                        placeholder="@Novelty_score + @Feasibility_score"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeComputedColumn(i)}
                    className="flex-shrink-0 rounded p-1 text-text-secondary hover:text-status-error-text"
                    title="Remove"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Filter{" "}
                <span className="ml-1 font-normal normal-case">
                  (AND logic)
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFilter}
                className="!rounded-md !px-2.5 !py-1 !text-xs"
              >
                + Add filter
              </Button>
            </div>

            {config.filter.length === 0 && (
              <p className="text-xs text-text-secondary">
                No filters — all rows included.
              </p>
            )}

            <div className="space-y-2">
              {config.filter.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary p-2"
                >
                  <div className="min-w-0 flex-1">
                    <Select
                      value={rule.column}
                      onChange={(e) =>
                        updateFilter(i, { column: e.target.value })
                      }
                      options={allColumns.map((c) => ({ value: c, label: c }))}
                    />
                  </div>

                  <div className="w-32 flex-shrink-0">
                    <Select
                      value={rule.op}
                      onChange={(e) =>
                        updateFilter(i, {
                          op: e.target.value as PostProcessingFilterRule["op"],
                        })
                      }
                      options={POST_PROCESSING_FILTER_OPS}
                    />
                  </div>

                  {!POST_PROCESSING_NO_VALUE_OPS.has(rule.op) && (
                    <input
                      type="text"
                      value={String(rule.value ?? "")}
                      onChange={(e) =>
                        updateFilter(i, { value: e.target.value })
                      }
                      placeholder="value"
                      className="w-28 flex-shrink-0 rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent-primary"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => removeFilter(i)}
                    className="flex-shrink-0 rounded p-1 text-text-secondary hover:text-status-error-text"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Sort{" "}
                <span className="ml-1 font-normal normal-case">
                  (priority order)
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSort}
                className="!rounded-md !px-2.5 !py-1 !text-xs"
              >
                + Add sort
              </Button>
            </div>

            {config.sort.length === 0 && (
              <p className="text-xs text-text-secondary">
                No sort rules — original row order preserved.
              </p>
            )}

            <div className="space-y-2">
              {config.sort.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary p-2"
                >
                  <span className="w-4 flex-shrink-0 text-center text-xs font-medium text-text-secondary">
                    {i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <Select
                      value={rule.column}
                      onChange={(e) =>
                        updateSort(i, { column: e.target.value })
                      }
                      options={allColumns.map((c) => ({ value: c, label: c }))}
                    />
                  </div>

                  <div className="flex flex-shrink-0 overflow-hidden rounded-lg border border-border">
                    {(["asc", "desc"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateSort(i, { direction: d })}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          rule.direction === d
                            ? "bg-accent-primary text-white"
                            : "bg-bg-primary text-text-secondary hover:bg-bg-secondary"
                        }`}
                      >
                        {d === "asc" ? "↑ Asc" : "↓ Desc"}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSort(i)}
                    className="flex-shrink-0 rounded p-1 text-text-secondary hover:text-status-error-text"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {hasRules && (
              <button
                type="button"
                onClick={() => setConfig(emptyPostProcessingConfig())}
                className="text-xs text-text-secondary underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="!rounded-lg !px-4 !py-2 !text-sm"
            >
              {saving ? "Applying…" : "Apply & Preview"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
