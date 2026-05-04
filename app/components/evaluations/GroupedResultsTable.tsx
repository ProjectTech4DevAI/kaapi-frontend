/**
 * GroupedResultsTable.tsx - Grouped view for evaluation results
 *
 * Displays multiple LLM answers per question in a grouped table format
 */

import { Fragment } from "react";
import { TraceScore, GroupedTraceItem } from "@/app/lib/types/evaluation";
import { formatScoreValue } from "@/app/lib/utils";
import { InfoTooltip } from "@/app/components";

export default function GroupedResultsTable({
  traces,
}: {
  traces: GroupedTraceItem[];
}) {
  if (!traces || traces.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center bg-[#fef3c7] border-[#fbbf24]">
        <p className="text-sm text-[#92400e]">No grouped results available</p>
      </div>
    );
  }

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
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse table-fixed"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead>
            <tr className="bg-accent-primary border-b border-border">
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-bg-primary"
                style={{
                  width: `${COLUMN_WIDTHS.qId}px`,
                  minWidth: `${COLUMN_WIDTHS.qId}px`,
                }}
              >
                Q.ID
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-bg-primary"
                style={{
                  width: `${COLUMN_WIDTHS.question}px`,
                  minWidth: `${COLUMN_WIDTHS.question}px`,
                }}
              >
                Question
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-bg-primary"
                style={{
                  width: `${COLUMN_WIDTHS.groundTruth}px`,
                  minWidth: `${COLUMN_WIDTHS.groundTruth}px`,
                }}
              >
                Ground Truth
              </th>
              {Array.from({ length: maxAnswers }, (_, i) => (
                <th
                  key={`answer-${i}`}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase text-bg-primary"
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

          <tbody>
            {traces.map((group, index) => (
              <Fragment key={group.question_id || index}>
                <tr
                  key={`${group.question_id || index}-text`}
                  className="bg-white"
                >
                  <td className="px-4 pt-3 pb-1 text-sm font-medium align-top text-text-secondary">
                    {group.question_id}
                  </td>

                  <td className="px-4 pt-3 pb-1 align-top bg-accent-subtle/50">
                    <div className="text-sm overflow-auto text-text-primary leading-normal max-h-[150px] wrap-break-word">
                      {group.question}
                    </div>
                  </td>

                  <td className="px-4 pt-3 pb-1 align-top bg-accent-subtle/50">
                    <div className="text-sm overflow-auto text-text-primary leading-normal max-h-[150px] wrap-break-word">
                      {group.ground_truth_answer}
                    </div>
                  </td>

                  {Array.from({ length: maxAnswers }, (_, answerIndex) => {
                    const answer = group.llm_answers[answerIndex];
                    return (
                      <td
                        key={answerIndex}
                        className="px-4 pt-3 pb-1 align-top"
                      >
                        {answer ? (
                          <div className="text-sm overflow-auto text-text-primary leading-6 max-h-[150px] wrap-break-word">
                            {answer}
                          </div>
                        ) : (
                          <span className="text-sm text-text-primary">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr
                  key={`${group.question_id || index}-scores`}
                  className="border-b border-border"
                >
                  <td className="px-4 pt-1 pb-3" />
                  <td className="px-4 pt-1 pb-3 bg-accent-subtle/50" />
                  <td className="px-4 pt-1 pb-3 bg-accent-subtle/50" />

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
                                    <div className="flex items-center gap-1 shrink-0">
                                      <div
                                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                          bg === "transparent"
                                            ? "border border-border"
                                            : ""
                                        }`}
                                        style={{ color, backgroundColor: bg }}
                                      >
                                        {value}
                                      </div>
                                      {score?.comment && (
                                        <InfoTooltip text={score.comment} />
                                      )}
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
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
