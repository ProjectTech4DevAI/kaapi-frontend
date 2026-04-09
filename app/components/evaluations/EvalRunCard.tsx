"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/app/lib/colors";
import {
  EvalJob,
  AssistantConfig,
  getScoreObject,
} from "@/app/components/types";
import { getStatusColor, formatCostUSD } from "@/app/components/utils";
import { timeAgo } from "@/app/lib/utils";
import ConfigModal from "@/app/components/ConfigModal";
import ScoreDisplay from "@/app/components/ScoreDisplay";

export interface EvalRunCardProps {
  job: EvalJob;
  assistantConfig?: AssistantConfig;
}

export default function EvalRunCard({
  job,
  assistantConfig,
}: EvalRunCardProps) {
  const router = useRouter();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const isCompleted = job.status?.toLowerCase() === "completed";
  const scoreObj = getScoreObject(job);
  const statusColor = getStatusColor(job.status || "");

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: colors.bg.primary,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        borderLeft: `3px solid ${statusColor.border}`,
      }}
    >
      <div className="px-5 py-4">
        {/* Row 1: Run Name (left) | Status (right) */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-semibold truncate"
              style={{ color: colors.text.primary }}
            >
              {job.run_name}
            </div>
            {job.inserted_at && (
              <div
                className="text-xs mt-0.5"
                style={{ color: colors.text.secondary }}
              >
                {timeAgo(job.inserted_at)}
              </div>
            )}
            {/* Error message (if failed) */}
            {job.error_message && (
              <div
                className="mt-2 text-xs break-words overflow-hidden"
                style={{ color: "hsl(8, 86%, 40%)" }}
              >
                {job.error_message}
              </div>
            )}
          </div>
          <span
            className="px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide flex-shrink-0"
            style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
          >
            {job.status}
          </span>
        </div>

        {/* Row 2: Scores */}
        {scoreObj && (
          <div className="mt-3">
            <ScoreDisplay score={scoreObj} errorMessage={job.error_message} />
          </div>
        )}

        {/* Row 3: Dataset + Config + Cost (left) | Actions (right) */}
        <div className="flex items-center justify-between gap-4 mt-3">
          <div
            className="flex items-center gap-3 text-xs"
            style={{ color: colors.text.secondary }}
          >
            {job.dataset_name && (
              <span className="flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 7c0 2 3.6 3 8 3s8-1 8-3M4 7c0-2 3.6-3 8-3s8 1 8 3M4 12c0 2 3.6 3 8 3s8-1 8-3"
                  />
                </svg>
                {job.dataset_name}
              </span>
            )}
            {job.assistant_id && assistantConfig?.name && (
              <span
                className="px-1.5 py-0.5 rounded"
                style={{ backgroundColor: colors.bg.secondary }}
              >
                {assistantConfig.name}
              </span>
            )}
            {job.cost?.total_cost_usd != null && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                {formatCostUSD(job.cost.total_cost_usd)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border"
              style={{
                backgroundColor: "transparent",
                borderColor: colors.border,
                color: colors.text.primary,
              }}
            >
              View Config
            </button>
            <button
              onClick={() => router.push(`/evaluations/${job.id}`)}
              disabled={!isCompleted}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer disabled:cursor-not-allowed"
              style={{
                backgroundColor: "transparent",
                borderColor: colors.border,
                color: isCompleted
                  ? colors.text.primary
                  : colors.text.secondary,
                opacity: isCompleted ? 1 : 0.5,
              }}
            >
              View Results
            </button>
          </div>
        </div>
      </div>

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        job={job}
        assistantConfig={assistantConfig}
      />
    </div>
  );
}
