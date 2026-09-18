/**
 * DetailedResultsTable.tsx - Table view for evaluation results
 *
 * Displays Q&A pairs with scores in a tabular format
 * Supports both row format (individual traces) and grouped format (multiple answers per question)
 */

import type { GroupedTraceItem, EvalJob } from "@/app/lib/types/evaluation";
import {
  getScoreObject,
  normalizeToIndividualScores,
  hasSummaryScores,
  isNewScoreObjectV2,
  isGroupedFormat,
  isCosineScoreName,
} from "@/app/lib/utils/evaluation";
import { formatScoreValue, getScoreByName } from "@/app/lib/utils";
import { InfoTooltip } from "@/app/components/ui";
import { GroupedResultsTable } from "@/app/components/evaluations";
import { MarkdownContent } from "@/app/components/chat";
import { ExternalLinkIcon } from "@/app/components/icons";

interface DetailedResultsTableProps {
  job: EvalJob;
}

export default function DetailedResultsTable({
  job,
}: DetailedResultsTableProps) {
  const scoreObject = getScoreObject(job);
  const isJudgeRun = job.is_judge_run;

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
          isJudgeRun={isJudgeRun}
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
  const allScoreNames =
    individual_scores[0]?.trace_scores?.map((s) => s.name) || [];
  const scoreNames = isJudgeRun
    ? allScoreNames.filter((name) => !isCosineScoreName(name))
    : allScoreNames;

  const hasAnyCategory = individual_scores.some(
    (s) => (s.category ?? "").trim().length > 0,
  );
  const hasAnyTraceUrl = individual_scores.some((s) => s.score_trace_url);

  const COLUMN_WIDTHS = {
    index: 50,
    category: 130,
    question: 250,
    groundTruth: 250,
    answer: 250,
    score: 160,
    trace: 90,
  };
  const tableMinWidth =
    COLUMN_WIDTHS.index +
    (hasAnyCategory ? COLUMN_WIDTHS.category : 0) +
    COLUMN_WIDTHS.question +
    COLUMN_WIDTHS.groundTruth +
    COLUMN_WIDTHS.answer +
    scoreNames.length * COLUMN_WIDTHS.score +
    (hasAnyTraceUrl ? COLUMN_WIDTHS.trace : 0);

  return (
    <div className="border rounded-lg overflow-hidden bg-white border-gray-200">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse table-fixed"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead>
            <tr className="bg-accent-primary border-b border-border">
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-bg-primary"
                style={{ width: `${COLUMN_WIDTHS.index}px` }}
              ></th>
              {hasAnyCategory && (
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase text-bg-primary"
                  style={{ width: `${COLUMN_WIDTHS.category}px` }}
                >
                  Category
                </th>
              )}
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-bg-primary"
                style={{ width: `${COLUMN_WIDTHS.question}px` }}
              >
                Question
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-bg-primary"
                style={{ width: `${COLUMN_WIDTHS.groundTruth}px` }}
              >
                Ground Truth
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-bg-primary"
                style={{ width: `${COLUMN_WIDTHS.answer}px` }}
              >
                Answer
              </th>
              {scoreNames.map((scoreName) => (
                <th
                  key={scoreName}
                  className="px-4 py-3 text-center text-xs font-semibold uppercase text-bg-primary whitespace-normal wrap-break-word"
                  style={{ width: `${COLUMN_WIDTHS.score}px` }}
                >
                  {scoreName}
                </th>
              ))}
              {hasAnyTraceUrl && (
                <th
                  className="px-4 py-3 text-center text-xs font-semibold uppercase text-bg-primary"
                  style={{ width: `${COLUMN_WIDTHS.trace}px` }}
                >
                  Trace
                </th>
              )}
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

                  {hasAnyCategory && (
                    <td className="px-4 py-3 align-top bg-bg-primary">
                      {item.category ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary">—</span>
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3 align-top bg-bg-primary">
                    <div className="text-sm overflow-auto text-text-primary leading-normal max-h-[150px] wrap-break-word">
                      {question}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top bg-bg-primary">
                    <div className="text-sm overflow-auto text-text-primary leading-normal max-h-[150px] wrap-break-word">
                      {groundTruth}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top bg-bg-primary">
                    <div className="text-sm overflow-auto text-text-primary leading-normal max-h-[150px] wrap-break-word">
                      <MarkdownContent
                        text={answer}
                        className={"text-sm leading-relaxed"}
                      />
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
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium border-border ${bg === "transparent" ? "border" : ""}`}
                            style={{
                              color,
                              backgroundColor: bg,
                            }}
                          >
                            {value}
                          </div>
                          {score?.comment && (
                            <InfoTooltip text={score.comment} />
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {hasAnyTraceUrl && (
                    <td className="px-4 py-3 text-center align-top">
                      {item.score_trace_url && (
                        <a
                          href={item.score_trace_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-accent-primary hover:opacity-75 transition-opacity"
                          aria-label="View trace"
                          title="View trace"
                        >
                          <ExternalLinkIcon className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
