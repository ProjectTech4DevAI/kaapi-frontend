/**
 * GroupedResultsTable.tsx - Grouped view for evaluation results
 *
 * Displays multiple LLM answers per question in a grouped table format
 */

import React, { useState, useEffect } from "react";
import {
  TraceScore,
  GroupedTraceItem,
} from "@/app/lib/components/evaluations/types";
import { formatScoreValue } from "@/app/lib/utils";

export default function GroupedResultsTable({
  traces,
}: {
  traces: GroupedTraceItem[];
}) {
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

  if (!traces || traces.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center bg-[#fef3c7] border-[#fbbf24]">
        <p className="text-sm text-[#92400e]">No grouped results available</p>
      </div>
    );
  }

  // Get max answers count
  const maxAnswers = Math.max(...traces.map((t) => t.llm_answers.length));

  // Fixed column widths (in pixels) for predictable layout
  const COLUMN_WIDTHS = {
    qId: 60,
    question: 200,
    groundTruth: 200,
    answer: 250,
  };

  // Calculate minimum table width based on number of answers
  // This ensures horizontal scroll activates at the right point
  const fixedColumnsWidth =
    COLUMN_WIDTHS.qId + COLUMN_WIDTHS.question + COLUMN_WIDTHS.groundTruth;
  const tableMinWidth = fixedColumnsWidth + maxAnswers * COLUMN_WIDTHS.answer;

  return (
    <div className="border rounded-lg overflow-hidden bg-white border-border">
      {/* Table Container - overflow-x-auto enables horizontal scroll when table exceeds viewport */}
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse table-fixed"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          {/* Table Header - matching row format styling */}
          <thead>
            <tr className="bg-bg-secondary border-b border-border">
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#171717]"
                style={{
                  width: `${COLUMN_WIDTHS.qId}px`,
                  minWidth: `${COLUMN_WIDTHS.qId}px`,
                }}
              >
                Q.ID
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#171717]"
                style={{
                  width: `${COLUMN_WIDTHS.question}px`,
                  minWidth: `${COLUMN_WIDTHS.question}px`,
                }}
              >
                Question
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#171717]"
                style={{
                  width: `${COLUMN_WIDTHS.groundTruth}px`,
                  minWidth: `${COLUMN_WIDTHS.groundTruth}px`,
                }}
              >
                Expected Answer
              </th>
              {Array.from({ length: maxAnswers }, (_, i) => (
                <th
                  key={`answer-${i}`}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#171717]"
                  style={{
                    width: `${COLUMN_WIDTHS.answer}px`,
                    minWidth: `${COLUMN_WIDTHS.answer}px`,
                  }}
                >
                  Answer {i + 1}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {traces.map((group, index) => (
              <React.Fragment key={group.question_id || index}>
                {/* Text row */}
                <tr
                  key={`${group.question_id || index}-text`}
                  className="bg-white"
                >
                  {/* Question ID */}
                  <td className="px-4 pt-3 pb-1 text-sm font-medium align-top text-text-secondary">
                    {group.question_id}
                  </td>

                  {/* Question */}
                  <td className="px-4 pt-3 pb-1 align-top bg-[#fafafa]">
                    <div className="text-sm overflow-auto text-[#171717] leading-normal max-h-[150px] wrap-break-word">
                      {group.question}
                    </div>
                  </td>

                  {/* Expected Answer */}
                  <td className="px-4 pt-3 pb-1 align-top bg-bg-secondary">
                    <div className="text-sm overflow-auto text-[#171717] leading-normal max-h-[150px] wrap-break-word">
                      {group.ground_truth_answer}
                    </div>
                  </td>

                  {/* Answer text only */}
                  {Array.from({ length: maxAnswers }, (_, answerIndex) => {
                    const answer = group.llm_answers[answerIndex];
                    return (
                      <td
                        key={answerIndex}
                        className="px-4 pt-3 pb-1 align-top"
                      >
                        {answer ? (
                          <div className="text-sm overflow-auto text-[#171717] leading-6 max-h-[150px] wrap-break-word">
                            {answer}
                          </div>
                        ) : (
                          <span className="text-sm text-[#171717]">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {/* Scores row */}
                <tr
                  key={`${group.question_id || index}-scores`}
                  className="border-b border-[#e5e5e5]"
                >
                  {/* Empty cells for Q.ID, Question, Expected Answer */}
                  <td className="px-4 pt-1 pb-3" />
                  <td className="px-4 pt-1 pb-3 bg-bg-secondary" />
                  <td className="px-4 pt-1 pb-3 bg-bg-secondary" />

                  {/* Score cells */}
                  {Array.from({ length: maxAnswers }, (_, answerIndex) => {
                    const answerScores: TraceScore[] =
                      group.scores?.[answerIndex] || [];
                    const answer = group.llm_answers[answerIndex];

                    return (
                      <td
                        key={answerIndex}
                        className="px-4 pt-1 pb-3 align-bottom"
                      >
                        {answer && answerScores.length > 0 ? (
                          <div className="space-y-1">
                            {answerScores.map(
                              (score: TraceScore, scoreIdx: number) => {
                                if (!score) return null;
                                const { value, color, bg } =
                                  formatScoreValue(score);
                                return (
                                  <div
                                    key={score.name || scoreIdx}
                                    className="flex items-center justify-between gap-1"
                                  >
                                    <span className="text-xs truncate min-w-0 text-text-secondary">
                                      {score.name}:
                                    </span>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <div
                                        className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                                        style={{
                                          color,
                                          backgroundColor: bg,
                                          borderWidth:
                                            bg === "transparent" ? "1px" : "0",
                                          borderColor: "#e5e5e5",
                                        }}
                                      >
                                        {value}
                                      </div>
                                      {score?.comment &&
                                        (() => {
                                          const commentId = `g${index}-a${answerIndex}-s${scoreIdx}`;
                                          return (
                                            <>
                                              <div
                                                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-normal"
                                                style={{
                                                  backgroundColor:
                                                    openCommentId === commentId
                                                      ? "#171717"
                                                      : "#fafafa",
                                                  color:
                                                    openCommentId === commentId
                                                      ? "#ffffff"
                                                      : "#737373",
                                                }}
                                                onMouseEnter={(e) => {
                                                  const rect =
                                                    e.currentTarget.getBoundingClientRect();
                                                  const tooltipWidth = 300;
                                                  const centerX =
                                                    rect.left + rect.width / 2;
                                                  const clampedLeft = Math.min(
                                                    Math.max(
                                                      centerX -
                                                        tooltipWidth / 2,
                                                      8,
                                                    ),
                                                    window.innerWidth -
                                                      tooltipWidth -
                                                      8,
                                                  );
                                                  setCommentPos({
                                                    top: rect.top - 8,
                                                    left: clampedLeft,
                                                  });
                                                  setOpenCommentId(commentId);
                                                }}
                                                onMouseLeave={() =>
                                                  setOpenCommentId(null)
                                                }
                                              >
                                                i
                                              </div>
                                              {openCommentId === commentId && (
                                                <div
                                                  className="fixed z-50 px-3 py-2 rounded-md text-xs whitespace-normal pointer-events-none"
                                                  style={{
                                                    backgroundColor: "#171717",
                                                    color: "#ffffff",
                                                    width: "300px",
                                                    boxShadow:
                                                      "0 4px 6px rgba(0, 0, 0, 0.1)",
                                                    top: commentPos.top,
                                                    left: commentPos.left,
                                                    transform:
                                                      "translateY(-100%)",
                                                  }}
                                                >
                                                  {score.comment}
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
