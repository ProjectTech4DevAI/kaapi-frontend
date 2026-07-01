"use client";

import type { ConfigSelection } from "@/app/lib/types/assessment";
import ReviewSection from "./ReviewSection";

interface ConfigsReviewProps {
  configs: ConfigSelection[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export default function ConfigsReview({
  configs,
  isOpen,
  onToggle,
  onEdit,
}: ConfigsReviewProps) {
  return (
    <ReviewSection
      title="Configurations"
      isOpen={isOpen}
      onToggle={onToggle}
      onEdit={onEdit}
      badge={`${configs.length} selected`}
    >
      <div className="space-y-2 pt-2">
        {configs.map((config, index) => (
          <div
            key={`${config.config_id}-${config.config_version}`}
            className="flex items-center gap-3 rounded-md bg-neutral-50 p-2.5"
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-primary text-[10px] font-bold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-neutral-900">
                {config.name}
              </span>
              <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                v{config.config_version}
              </span>
            </div>
            <span className="flex-shrink-0 text-xs text-neutral-500">
              {config.provider}/{config.model}
            </span>
          </div>
        ))}
      </div>
    </ReviewSection>
  );
}
