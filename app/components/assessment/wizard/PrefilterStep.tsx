"use client";

import CompactToggleSwitch from "@/app/components/assessment/CompactToggleSwitch";
import EditorStepLayout from "@/app/components/assessment/editor/EditorStepLayout";
import PromptZoneCard from "@/app/components/assessment/editor/PromptZoneCard";
import {
  PREFILTER_ZONE_COPY,
  PREFILTER_ZONE_MIN_HEIGHT,
} from "@/app/lib/assessment/promptCopy";
import type { PrefilterStepProps } from "@/app/lib/types/assessment";

/** Wizard step 2: the optional relevance gate. Rejected rows never get assessed. */
export default function PrefilterStep({
  enabled,
  zones,
  columns,
  fieldTypes,
  fieldStrict,
  sampleRow,
  onToggle,
  onZoneChange,
  onFieldType,
  onFieldStrict,
}: PrefilterStepProps) {
  return (
    <EditorStepLayout
      zones={enabled ? zones : { instructions: "", submission: "" }}
      columns={columns}
      fieldTypes={fieldTypes}
      sampleRow={sampleRow}
      previewDisabledNote={
        enabled
          ? undefined
          : "Pre-filter is off — every submission goes straight to the assessment."
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Pre-filter
          </h2>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            Optional relevance check — rejected submissions never reach the
            assessment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {enabled ? "On" : "Off"}
          </span>
          <CompactToggleSwitch
            checked={enabled}
            onChange={() => onToggle(!enabled)}
            title={enabled ? "Turn pre-filter off" : "Turn pre-filter on"}
          />
        </div>
      </div>

      {enabled && (
        <>
          <PromptZoneCard
            zones={zones}
            copy={PREFILTER_ZONE_COPY}
            zoneMinHeight={PREFILTER_ZONE_MIN_HEIGHT}
            columns={columns}
            fieldTypes={fieldTypes}
            fieldStrict={fieldStrict}
            onZoneChange={onZoneChange}
            onFieldType={onFieldType}
            onFieldStrict={onFieldStrict}
          />

          <p className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
            <b className="font-semibold text-text-primary">Output is fixed:</b>
            <span className="rounded-full bg-status-success-bg px-2 py-0.5 text-status-success-text">
              ✓ Accepted
            </span>
            <span className="rounded-full bg-status-error-bg px-2 py-0.5 text-status-error-text">
              ✗ Rejected
            </span>
            <span>with a reason.</span>
          </p>
        </>
      )}
    </EditorStepLayout>
  );
}
