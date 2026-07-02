"use client";

import { Button, Select } from "@/app/components/ui";
import { CloseIcon } from "@/app/components/icons";
import FormulaInput from "@/app/components/shared/FormulaInput";
import {
  POST_PROCESSING_FILTER_OPS,
  POST_PROCESSING_NO_VALUE_OPS,
  emptyPostProcessingConfig,
} from "@/app/lib/assessment/constants";
import type {
  PostProcessingConfig,
  PostProcessingFilterRule,
  PostProcessingComputedColumn,
  PostProcessingSortRule,
  PostProcessingStepProps,
} from "@/app/lib/types/assessment";

export default function PostProcessingStep({
  postProcessingConfig,
  setPostProcessingConfig,
  columnMapping,
  outputSchema,
  onNext,
  onBack,
}: PostProcessingStepProps) {
  const config = postProcessingConfig ?? emptyPostProcessingConfig();

  const update = (patch: Partial<PostProcessingConfig>) => {
    const next = { ...config, ...patch };
    // If all sections empty, store null (no post-processing)
    const isEmpty =
      next.computed_columns.length === 0 &&
      next.sort.length === 0 &&
      next.filter.length === 0;
    setPostProcessingConfig(isEmpty ? null : next);
  };

  // Derive available columns: input columns + L2 output schema fields + fixed L1 fields
  const inputCols = columnMapping.textColumns;
  const outputCols = outputSchema.map((f) => f.name).filter(Boolean);
  const prefilterCols = [
    "topic_relevance_decision",
    "topic_relevance_reasoning",
    "duplicate_detection_verdict",
    "duplicate_detection_reason",
    "duplicate_detection_match_title",
  ];
  const availableCols = [...inputCols, ...outputCols, ...prefilterCols];

  // Computed columns available for formula autocomplete (includes user-defined ones)
  const allCols = [
    ...availableCols,
    ...config.computed_columns.map((c) => c.name).filter(Boolean),
  ];

  const addComputed = () =>
    update({
      computed_columns: [...config.computed_columns, { name: "", formula: "" }],
    });

  const updateComputed = (
    i: number,
    patch: Partial<PostProcessingComputedColumn>,
  ) => {
    const next = [...config.computed_columns];
    next[i] = { ...next[i], ...patch };
    update({ computed_columns: next });
  };

  const removeComputed = (i: number) =>
    update({
      computed_columns: config.computed_columns.filter((_, idx) => idx !== i),
    });

  const addFilter = () =>
    update({
      filter: [
        ...config.filter,
        { column: allCols[0] ?? "", op: "eq", value: "" },
      ],
    });

  const updateFilter = (
    i: number,
    patch: Partial<PostProcessingFilterRule>,
  ) => {
    const next = [...config.filter];
    next[i] = { ...next[i], ...patch } as PostProcessingFilterRule;
    update({ filter: next });
  };

  const removeFilter = (i: number) =>
    update({ filter: config.filter.filter((_, idx) => idx !== i) });

  const addSort = () =>
    update({
      sort: [...config.sort, { column: allCols[0] ?? "", direction: "desc" }],
    });

  const updateSort = (i: number, patch: Partial<PostProcessingSortRule>) => {
    const next = [...config.sort];
    next[i] = { ...next[i], ...patch };
    update({ sort: next });
  };

  const removeSort = (i: number) =>
    update({ sort: config.sort.filter((_, idx) => idx !== i) });

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 overflow-auto pb-16">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Post Processing
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Optional. Define computed columns, filters, and sort rules applied
            to results at export time. This step is optional — click Next to
            skip.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-primary px-5 py-4">
          <p className="mb-2 text-xs font-medium text-text-secondary">
            Available columns — type{" "}
            <code className="rounded bg-bg-secondary px-1 text-[11px]">@</code>{" "}
            in formulas to reference
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableCols.map((col) => (
              <span
                key={col}
                className="rounded-md border border-border bg-bg-secondary px-2 py-0.5 font-mono text-[11px] text-text-secondary"
              >
                {col}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Computed columns
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                Create new columns using formulas like{" "}
                <code className="text-[11px]">
                  @Novelty_score + @Feasibility_score
                </code>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addComputed}
              className="!rounded-md !px-3 !py-1.5 !text-xs"
            >
              + Add column
            </Button>
          </div>

          {config.computed_columns.length > 0 && (
            <div className="space-y-3 border-t border-border px-5 pb-5 pt-4">
              {config.computed_columns.map((col, i) => (
                <div
                  key={i}
                  className="flex items-end gap-2 rounded-xl border border-border bg-bg-secondary p-3"
                >
                  <div className="flex-shrink-0 sm:w-40">
                    <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                      New column name
                    </label>
                    <input
                      type="text"
                      value={col.name}
                      onChange={(e) =>
                        updateComputed(i, { name: e.target.value })
                      }
                      placeholder="e.g. Total_score"
                      className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                    />
                  </div>
                  <span className="flex-shrink-0 pb-2 font-mono text-text-secondary">
                    =
                  </span>
                  <div className="min-w-0 flex-1">
                    <FormulaInput
                      value={col.formula}
                      onChange={(v) => updateComputed(i, { formula: v })}
                      columns={allCols}
                      placeholder="@Novelty_score + @Feasibility_score"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeComputed(i)}
                    className="flex-shrink-0 rounded p-1 pb-2.5 text-text-secondary hover:text-status-error-text"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Filter
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                AND logic — all rules must match
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFilter}
              className="!rounded-md !px-3 !py-1.5 !text-xs"
            >
              + Add filter
            </Button>
          </div>

          {config.filter.length > 0 && (
            <div className="space-y-2 border-t border-border px-5 pb-5 pt-4">
              {config.filter.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-border bg-bg-secondary p-2"
                >
                  <div className="min-w-0 flex-1">
                    <Select
                      value={rule.column}
                      onChange={(e) =>
                        updateFilter(i, { column: e.target.value })
                      }
                      options={allCols.map((c) => ({ value: c, label: c }))}
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
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Sort
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                Priority order — first rule wins
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSort}
              className="!rounded-md !px-3 !py-1.5 !text-xs"
            >
              + Add sort
            </Button>
          </div>

          {config.sort.length > 0 && (
            <div className="space-y-2 border-t border-border px-5 pb-5 pt-4">
              {config.sort.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-border bg-bg-secondary p-2"
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
                      options={allCols.map((c) => ({ value: c, label: c }))}
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
          )}
        </div>
      </div>

      <div className="mt-auto sticky bottom-0 z-10 -mx-6 flex flex-col gap-3 border-t border-border bg-bg-secondary px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">
              {postProcessingConfig
                ? "Post-processing configured."
                : "Optional — skip to continue."}
            </span>
            <Button type="button" onClick={onNext}>
              Next: Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
