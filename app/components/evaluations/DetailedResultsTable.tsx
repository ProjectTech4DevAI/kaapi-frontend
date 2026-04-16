/**
 * DetailedResultsTable.tsx - Table view for evaluation results
 *
 * Displays Q&A pairs with scores in a tabular format
 * Supports both row format (individual traces) and grouped format (multiple answers per question)
 */

import { useState, useEffect } from "react";
import {
  getScoreObject,
  normalizeToIndividualScores,
  hasSummaryScores,
  isNewScoreObjectV2,
  isGroupedFormat,
  GroupedTraceItem,
  EvalJob,
} from "@/app/lib/evaluation";
import { formatScoreValue, getScoreByName } from "@/app/lib/utils";
import GroupedResultsTable from "@/app/components/evaluations/GroupedResultsTable";

interface DetailedResultsTableProps {
  job: EvalJob;
}

export default function DetailedResultsTable({
  job,
}: DetailedResultsTableProps) {
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [commentPos, setCommentPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!openCommentId) return;
    const handleScroll = () => setOpenCommentId(null);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openCommentId]);

  const scoreObject = getScoreObject(job);

  if (!scoreObject || !hasSummaryScores(scoreObject)) {
    return (
      <div className="border rounded-lg p-6 text-center bg-[#fef3c7] border-[#fbbf24]">
        <p className="text-sm text-[#92400e]">
          No detailed results available or using legacy format
        </p>
      </div>
    );
  }

  if (isNewScoreObjectV2(scoreObject)) {
    if (isGroupedFormat(scoreObject.traces)) {
      return (
        <GroupedResultsTable
          traces={scoreObject.traces as GroupedTraceItem[]}
        />
      );
    }
  }

  const individual_scores = normalizeToIndividualScores(scoreObject);

  if (!individual_scores || individual_scores.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center bg-[#fef3c7] border-[#fbbf24]">
        <p className="text-sm text-[#92400e]">
          No individual scores available. Only summary metrics are available for
          this evaluation.
        </p>
      </div>
    );
  }

  // Get all unique score names from the first item
  const scoreNames =
    individual_scores[0]?.trace_scores?.map((s) => s.name) || [];

  const COLUMN_WIDTHS = {
    index: 50,
    question: 250,
    groundTruth: 250,
    answer: 250,
    score: 160,
  };
  const tableMinWidth =
    COLUMN_WIDTHS.index +
    COLUMN_WIDTHS.question +
    COLUMN_WIDTHS.groundTruth +
    COLUMN_WIDTHS.answer +
    scoreNames.length * COLUMN_WIDTHS.score;

  return (
    <div className="border rounded-lg overflow-hidden bg-white border-gray-200">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse table-fixed"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead>
            <tr className="bg-bg-secondary border-b border-border">
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#171717]"
                style={{ width: `${COLUMN_WIDTHS.index}px` }}
              ></th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#171717]"
                style={{ width: `${COLUMN_WIDTHS.question}px` }}
              >
                Question
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#171717]"
                style={{ width: `${COLUMN_WIDTHS.groundTruth}px` }}
              >
                Expected Answer
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#171717]"
                style={{ width: `${COLUMN_WIDTHS.answer}px` }}
              >
                Answer
              </th>
              {scoreNames.map((scoreName) => (
                <th
                  key={scoreName}
                  className="px-4 py-3 text-center text-xs font-semibold uppercase text-[#171717] whitespace-normal wrap-break-word"
                  style={{ width: `${COLUMN_WIDTHS.score}px` }}
                >
                  {scoreName}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {individual_scores.map((item, index) => {
              const question = item.input?.question || "N/A";
              const answer = item.output?.answer || "N/A";
              const groundTruth = item.metadata?.ground_truth || "N/A";

              return (
                <tr
                  key={item.trace_id || index}
                  className="border-b border-border bg-bg-primary hover:bg-bg-secondary transition-colors duration-150"
                >
                  <td className="px-4 py-3 text-sm font-medium align-top text-text-secondary">
                    {index + 1}
                  </td>

                  <td className="px-4 py-3 align-top bg-bg-primary">
                    <div className="text-sm overflow-auto text-[#171717] leading-normal max-h-[150px] wrap-break-word">
                      {question}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top bg-bg-primary">
                    <div className="text-sm overflow-auto text-[#171717] leading-normal max-h-[150px] wrap-break-word">
                      {groundTruth}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top bg-bg-primary">
                    <div className="text-sm overflow-auto text-[#171717] leading-normal max-h-[150px] wrap-break-word">
                      {answer}
                    </div>
                  </td>

                  {scoreNames.map((scoreName) => {
                    const score = getScoreByName(item.trace_scores, scoreName);
                    const { value, color, bg } = formatScoreValue(score);

                    return (
                      <td
                        key={scoreName}
                        className="px-4 py-3 text-center align-top"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className={`inline-block px-2 py-1 rounded text-xs font-medium border-border ${bg === "transparent" ? "border" : ""}`}
                            style={{
                              color,
                              backgroundColor: bg,
                            }}
                          >
                            {value}
                          </div>
                          {score?.comment && (
                            <>
                              <div
                                className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-normal ${openCommentId === `${index}-${scoreName}` ? "bg-[#171717] text-bg-primary" : "bg-bg-secondary text-text-secondary"}`}
                                onMouseEnter={(e) => {
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  const tooltipWidth = 300;
                                  const centerX = rect.left + rect.width / 2;
                                  const clampedLeft = Math.min(
                                    Math.max(centerX - tooltipWidth / 2, 8),
                                    window.innerWidth - tooltipWidth - 8,
                                  );
                                  setCommentPos({
                                    top: rect.top - 8,
                                    left: clampedLeft,
                                  });
                                  setOpenCommentId(`${index}-${scoreName}`);
                                }}
                                onMouseLeave={() => setOpenCommentId(null)}
                              >
                                i
                              </div>
                              {openCommentId === `${index}-${scoreName}` && (
                                <div
                                  className="fixed z-50 px-3 py-2 rounded-md text-xs whitespace-normal pointer-events-none bg-[#171717] text-white border border-gray-700 w-[300px] shadow-md -translate-y-full"
                                  style={{
                                    top: commentPos.top,
                                    left: commentPos.left,
                                  }}
                                >
                                  {score.comment}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
