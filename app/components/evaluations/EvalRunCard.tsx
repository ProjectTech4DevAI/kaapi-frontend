"use client";

import { useEffect, useState } from "react";
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
import CostIcon from "@/app/components/icons/evaluations/CostIcon";

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
  const [isCostTooltipOpen, setIsCostTooltipOpen] = useState(false);
  const [costTooltipPos, setCostTooltipPos] = useState({ top: 0, left: 0 });

  const isCompleted = job.status?.toLowerCase() === "completed";
  const scoreObj = getScoreObject(job);
  const statusColor = getStatusColor(job.status || "");

  useEffect(() => {
    if (!isCostTooltipOpen) return;
    const handleScroll = () => setIsCostTooltipOpen(false);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isCostTooltipOpen]);

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
              <span className="flex items-center gap-1.5">
                <CostIcon className="flex-shrink-0" />
                {formatCostUSD(job.cost.total_cost_usd)}
                <div
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-normal cursor-help ${isCostTooltipOpen ? "bg-[#171717] text-white" : "text-[#737373]"}`}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const tooltipWidth = 280;
                    const centerX = rect.left + rect.width / 2;
                    const clampedLeft = Math.min(
                      Math.max(centerX - tooltipWidth / 2, 8),
                      window.innerWidth - tooltipWidth - 8,
                    );
                    setCostTooltipPos({
                      top: rect.top - 8,
                      left: clampedLeft,
                    });
                    setIsCostTooltipOpen(true);
                  }}
                  onMouseLeave={() => setIsCostTooltipOpen(false)}
                >
                  i
                </div>
                {isCostTooltipOpen && (
                  <div
                    className="fixed z-50 px-3 py-2 rounded-md text-xs whitespace-normal pointer-events-none space-y-1 bg-[#171717] text-white w-[260px] shadow-md -translate-y-full"
                    style={{
                      top: costTooltipPos.top,
                      left: costTooltipPos.left,
                    }}
                  >
                    {job.cost.response && (
                      <div className="flex justify-between gap-3">
                        <span className="text-[#a3a3a3]">
                          Response generation
                        </span>
                        <span>{formatCostUSD(job.cost.response.cost_usd)}</span>
                      </div>
                    )}
                    {job.cost.embedding && (
                      <div className="flex justify-between gap-3">
                        <span className="text-[#a3a3a3]">
                          Cosine similarity calculation
                        </span>
                        <span>
                          {formatCostUSD(job.cost.embedding.cost_usd)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
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
