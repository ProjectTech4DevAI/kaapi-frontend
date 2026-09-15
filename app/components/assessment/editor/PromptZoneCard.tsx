"use client";

import PromptZoneEditor from "./PromptZoneEditor";
import type {
  PromptFieldType,
  PromptZoneCopy,
  PromptZoneId,
  PromptZones,
} from "@/app/lib/types/assessment";

interface PromptZoneCardProps {
  zones: PromptZones;
  copy: Record<PromptZoneId, PromptZoneCopy>;
  /** Applied to both zones so they stay the same size. */
  zoneMinHeight: number;
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  fieldStrict: Record<string, boolean>;
  onZoneChange: (zone: PromptZoneId, value: string) => void;
  onFieldType: (name: string, type: PromptFieldType) => void;
  onFieldStrict: (name: string, strict: boolean) => void;
}

const ORDER: PromptZoneId[] = ["instructions", "submission"];

/** The Instructions + Submission pair. Its headings anchor the preview sync. */
export default function PromptZoneCard({
  zones,
  copy,
  zoneMinHeight,
  columns,
  fieldTypes,
  fieldStrict,
  onZoneChange,
  onFieldType,
  onFieldStrict,
}: PromptZoneCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
      {ORDER.map((zone, index) => (
        <div key={zone}>
          <div
            data-zone-heading
            className={`flex flex-wrap items-baseline justify-between gap-2 bg-bg-secondary px-5 py-3 ${
              index > 0 ? "border-t border-border" : ""
            } border-b border-border`}
          >
            <span className="text-[11px] font-semibold tracking-wider uppercase text-text-secondary">
              {copy[zone].label}
            </span>
            <span className="text-[11px] text-text-secondary">
              {copy[zone].hint}
            </span>
          </div>
          <div className="px-5 py-4">
            <PromptZoneEditor
              value={zones[zone]}
              onChange={(value) => onZoneChange(zone, value)}
              placeholder={copy[zone].placeholder}
              minHeight={zoneMinHeight}
              enableMentions={zone === "submission"}
              columns={columns}
              fieldTypes={fieldTypes}
              fieldStrict={fieldStrict}
              onFieldType={onFieldType}
              onFieldStrict={onFieldStrict}
              ariaLabel={`${copy[zone].label} prompt`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
