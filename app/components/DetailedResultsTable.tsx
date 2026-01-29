/**
 * DetailedResultsTable.tsx - Table view for evaluation results
 *
 * Displays Q&A pairs with scores in a tabular format
 * Supports both row format (individual traces) and grouped format (multiple answers per question)
 */

import { IndividualScore, TraceScore, getScoreObject, normalizeToIndividualScores, isNewScoreObject, isNewScoreObjectV2, isGroupedFormat, GroupedTraceItem } from './types';
import { EvalJob } from './types';

interface DetailedResultsTableProps {
  job: EvalJob;
}

export default function DetailedResultsTable({ job }: DetailedResultsTableProps) {
  const scoreObject = getScoreObject(job);

  if (!scoreObject || (!isNewScoreObject(scoreObject) && !isNewScoreObjectV2(scoreObject))) {
    return (
      <div className="border rounded-lg p-6 text-center" style={{ backgroundColor: '#fef3c7', borderColor: '#fbbf24' }}>
        <p className="text-sm" style={{ color: '#92400e' }}>
          No detailed results available or using legacy format
        </p>
      </div>
    );
  }

  // Check if grouped format
  if (isNewScoreObjectV2(scoreObject) && isGroupedFormat(scoreObject.traces)) {
    return <GroupedResultsTable traces={scoreObject.traces as GroupedTraceItem[]} />;
  }

  // Normalize to IndividualScore format for backward compatibility
  const individual_scores = normalizeToIndividualScores(scoreObject);

  if (!individual_scores || individual_scores.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center" style={{ backgroundColor: '#fef3c7', borderColor: '#fbbf24' }}>
        <p className="text-sm" style={{ color: '#92400e' }}>
          No individual scores available
        </p>
      </div>
    );
  }

  // Get all unique score names from the first item
  const scoreNames = individual_scores[0]?.trace_scores?.map(s => s.name) || [];

  // Helper function to get score value by name
  const getScoreByName = (scores: TraceScore[], name: string): TraceScore | undefined => {
    if (!scores || !Array.isArray(scores)) return undefined;
    return scores.find(s => s?.name === name);
  };

  // Helper function to format score value with color
  const formatScoreValue = (score: TraceScore | undefined) => {
    if (!score) return { value: 'N/A', color: '#737373', bg: 'transparent' };

    if (score.data_type === 'CATEGORICAL') {
      const catValue = String(score.value);
      let color = '#171717';
      let bg = '#fafafa';

      if (catValue === 'CORRECT') {
        color = '#15803d';
        bg = '#dcfce7';
      } else if (catValue === 'PARTIAL') {
        color = '#92400e';
        bg = '#fef3c7';
      } else if (catValue === 'INCORRECT') {
        color = '#dc2626';
        bg = '#fee2e2';
      }

      return { value: catValue, color, bg };
    }

    // NUMERIC
    const numValue = Number(score.value);
    const formattedValue = numValue.toFixed(2);
    let color = '#171717';
    let bg = 'transparent';

    // Color based on value
    if (numValue >= 0.7) {
      color = '#15803d';
      bg = '#dcfce7';
    } else if (numValue >= 0.5) {
      color = '#92400e';
      bg = '#fef3c7';
    } else {
      color = '#dc2626';
      bg = '#fee2e2';
    }

    return { value: formattedValue, color, bg };
  };

  return (
    <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: '#e5e5e5' }}>
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
          {/* Table Header */}
          <thead>
            <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#171717', width: '5%' }}>
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#171717', width: '25%' }}>
                Question
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#171717', width: '25%' }}>
                Answer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#171717', width: '25%' }}>
                Ground Truth
              </th>
              {scoreNames.map((scoreName) => (
                <th key={scoreName} className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: '#171717', width: `${20 / scoreNames.length}%` }}>
                  {scoreName}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {individual_scores.map((item, index) => {
              const question = item.input?.question || 'N/A';
              const answer = item.output?.answer || 'N/A';
              const groundTruth = item.metadata?.ground_truth || 'N/A';

              return (
                <tr
                  key={item.trace_id || index}
                  className="border-b"
                  style={{ borderColor: '#e5e5e5', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => {
                    const row = e.currentTarget;
                    row.style.backgroundColor = '#fafafa';
                  }}
                  onMouseLeave={(e) => {
                    const row = e.currentTarget;
                    row.style.backgroundColor = '#ffffff';
                  }}
                >
                  {/* Row Number */}
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: '#737373' }}>
                    {index + 1}
                  </td>

                  {/* Question */}
                  <td className="px-4 py-3">
                    <div
                      className="text-sm overflow-auto"
                      style={{
                        color: '#171717',
                        lineHeight: '1.5',
                        maxHeight: '150px'
                      }}
                    >
                      {question}
                    </div>
                  </td>

                  {/* Answer */}
                  <td className="px-4 py-3">
                    <div
                      className="text-sm overflow-auto"
                      style={{
                        color: '#171717',
                        lineHeight: '1.5',
                        maxHeight: '150px'
                      }}
                    >
                      {answer}
                    </div>
                  </td>

                  {/* Ground Truth */}
                  <td className="px-4 py-3">
                    <div
                      className="text-sm overflow-auto"
                      style={{
                        color: '#171717',
                        lineHeight: '1.5',
                        maxHeight: '150px'
                      }}
                    >
                      {groundTruth}
                    </div>
                  </td>

                  {/* Score Columns */}
                  {scoreNames.map((scoreName) => {
                    const score = getScoreByName(item.trace_scores, scoreName);
                    const { value, color, bg } = formatScoreValue(score);

                    return (
                      <td key={scoreName} className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className="inline-block px-2 py-1 rounded text-xs font-medium"
                            style={{
                              color,
                              backgroundColor: bg,
                              borderWidth: bg === 'transparent' ? '1px' : '0',
                              borderColor: '#e5e5e5'
                            }}
                          >
                            {value}
                          </div>
                          {score?.comment && (
                            <div className="relative inline-block group">
                              <div
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full cursor-help text-xs font-medium"
                                style={{
                                  backgroundColor: '#fafafa',
                                  color: '#737373',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  const el = e.currentTarget;
                                  el.style.backgroundColor = '#171717';
                                  el.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                  const el = e.currentTarget;
                                  el.style.backgroundColor = '#fafafa';
                                  el.style.color = '#737373';
                                }}
                              >
                                i
                              </div>
                              <div
                                className="absolute bottom-full left-1/2 mb-2 px-3 py-2 rounded-md text-xs whitespace-normal pointer-events-none opacity-0 group-hover:opacity-100 z-10"
                                style={{
                                  backgroundColor: '#171717',
                                  color: '#ffffff',
                                  transform: 'translateX(-50%)',
                                  minWidth: '200px',
                                  maxWidth: '300px',
                                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                  transition: 'opacity 0.15s ease'
                                }}
                              >
                                {score.comment}
                                <div
                                  className="absolute top-full left-1/2"
                                  style={{
                                    transform: 'translateX(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '6px solid transparent',
                                    borderRight: '6px solid transparent',
                                    borderTop: '6px solid #171717'
                                  }}
                                />
                              </div>
                            </div>
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

function GroupedResultsTable({ traces }: { traces: GroupedTraceItem[] }) {
  if (!traces || traces.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center" style={{ backgroundColor: '#fef3c7', borderColor: '#fbbf24' }}>
        <p className="text-sm" style={{ color: '#92400e' }}>
          No grouped results available
        </p>
      </div>
    );
  }

  // Get max answers count
  const maxAnswers = Math.max(...traces.map(t => t.llm_answers.length));

  // Fixed column widths (in pixels) for predictable layout
  const COLUMN_WIDTHS = {
    qId: 60,
    question: 200,
    groundTruth: 200,
    answer: 250,
  };

  // Calculate minimum table width based on number of answers
  // This ensures horizontal scroll activates at the right point
  const fixedColumnsWidth = COLUMN_WIDTHS.qId + COLUMN_WIDTHS.question + COLUMN_WIDTHS.groundTruth;
  const tableMinWidth = fixedColumnsWidth + (maxAnswers * COLUMN_WIDTHS.answer);

  // Helper function to format score value with color (matching row format)
  const formatScoreValue = (score: TraceScore | undefined) => {
    if (!score) return { value: 'N/A', color: '#737373', bg: 'transparent' };

    if (score.data_type === 'CATEGORICAL') {
      const catValue = String(score.value);
      let color = '#171717';
      let bg = '#fafafa';

      if (catValue === 'CORRECT') {
        color = '#15803d';
        bg = '#dcfce7';
      } else if (catValue === 'PARTIAL') {
        color = '#92400e';
        bg = '#fef3c7';
      } else if (catValue === 'INCORRECT') {
        color = '#dc2626';
        bg = '#fee2e2';
      }

      return { value: catValue, color, bg };
    }

    // NUMERIC
    const numValue = Number(score.value);
    const formattedValue = numValue.toFixed(2);
    let color = '#171717';
    let bg = 'transparent';

    if (numValue >= 0.7) {
      color = '#15803d';
      bg = '#dcfce7';
    } else if (numValue >= 0.5) {
      color = '#92400e';
      bg = '#fef3c7';
    } else {
      color = '#dc2626';
      bg = '#fee2e2';
    }

    return { value: formattedValue, color, bg };
  };

  return (
    <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: '#e5e5e5' }}>
      {/* Table Container - overflow-x-auto enables horizontal scroll when table exceeds viewport */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: `${tableMinWidth}px` }}>
          {/* Table Header - matching row format styling */}
          <thead>
            <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase"
                style={{ color: '#171717', width: `${COLUMN_WIDTHS.qId}px`, minWidth: `${COLUMN_WIDTHS.qId}px` }}
              >
                Q.ID
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase"
                style={{ color: '#171717', width: `${COLUMN_WIDTHS.question}px`, minWidth: `${COLUMN_WIDTHS.question}px` }}
              >
                Question
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase"
                style={{ color: '#171717', width: `${COLUMN_WIDTHS.groundTruth}px`, minWidth: `${COLUMN_WIDTHS.groundTruth}px` }}
              >
                Ground Truth
              </th>
              {Array.from({ length: maxAnswers }, (_, i) => (
                <th
                  key={`answer-${i}`}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: '#171717', width: `${COLUMN_WIDTHS.answer}px`, minWidth: `${COLUMN_WIDTHS.answer}px` }}
                >
                  Answer {i + 1}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {traces.map((group, index) => (
              <tr
                key={group.question_id || index}
                className="border-b"
                style={{ borderColor: '#e5e5e5', transition: 'background-color 0.15s ease' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fafafa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                {/* Question ID - matching row format # column */}
                <td className="px-4 py-3 text-sm font-medium" style={{ color: '#737373' }}>
                  {group.question_id}
                </td>

                {/* Question - matching row format text cell */}
                <td className="px-4 py-3">
                  <div
                    className="text-sm overflow-auto"
                    style={{ color: '#171717', lineHeight: '1.5', maxHeight: '150px' }}
                  >
                    {group.question}
                  </div>
                </td>

                {/* Ground Truth - matching row format text cell */}
                <td className="px-4 py-3">
                  <div
                    className="text-sm overflow-auto"
                    style={{ color: '#171717', lineHeight: '1.5', maxHeight: '150px' }}
                  >
                    {group.ground_truth_answer}
                  </div>
                </td>

                {/* Answers with Scores */}
                {Array.from({ length: maxAnswers }, (_, answerIndex) => {
                  const answer = group.llm_answers[answerIndex];
                  const answerScores: TraceScore[] = group.scores?.[answerIndex] || [];

                  return (
                    <td key={answerIndex} className="px-4 py-3">
                      {answer ? (
                        <div>
                          <div
                            className="text-sm overflow-auto"
                            style={{ color: '#171717', lineHeight: '1.5', maxHeight: '150px' }}
                          >
                            {answer}
                          </div>
                          {answerScores.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 pt-2" style={{ borderTop: '1px solid #e5e5e5' }}>
                              {answerScores.map((score: TraceScore, scoreIdx: number) => {
                                if (!score) return null;
                                const { value, color, bg } = formatScoreValue(score);
                                return (
                                  <div key={score.name || scoreIdx} className="flex items-center gap-1">
                                    <span className="text-xs font-medium" style={{ color: '#737373' }}>{score.name}:</span>
                                    <div
                                      className="inline-block px-2 py-1 rounded text-xs font-medium"
                                      style={{
                                        color,
                                        backgroundColor: bg,
                                        borderWidth: bg === 'transparent' ? '1px' : '0',
                                        borderColor: '#e5e5e5'
                                      }}
                                    >
                                      {value}
                                    </div>
                                    {score?.comment && (
                                      <div className="relative inline-block group">
                                        <div
                                          className="inline-flex items-center justify-center w-4 h-4 rounded-full cursor-help text-xs font-medium"
                                          style={{
                                            backgroundColor: '#fafafa',
                                            color: '#737373',
                                            transition: 'all 0.15s ease'
                                          }}
                                          onMouseEnter={(e) => {
                                            const el = e.currentTarget;
                                            el.style.backgroundColor = '#171717';
                                            el.style.color = '#ffffff';
                                          }}
                                          onMouseLeave={(e) => {
                                            const el = e.currentTarget;
                                            el.style.backgroundColor = '#fafafa';
                                            el.style.color = '#737373';
                                          }}
                                        >
                                          i
                                        </div>
                                        <div
                                          className="absolute bottom-full left-1/2 mb-2 px-3 py-2 rounded-md text-xs whitespace-normal pointer-events-none opacity-0 group-hover:opacity-100 z-10"
                                          style={{
                                            backgroundColor: '#171717',
                                            color: '#ffffff',
                                            transform: 'translateX(-50%)',
                                            minWidth: '200px',
                                            maxWidth: '300px',
                                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                            transition: 'opacity 0.15s ease'
                                          }}
                                        >
                                          {score.comment}
                                          <div
                                            className="absolute top-full left-1/2"
                                            style={{
                                              transform: 'translateX(-50%)',
                                              width: 0,
                                              height: 0,
                                              borderLeft: '6px solid transparent',
                                              borderRight: '6px solid transparent',
                                              borderTop: '6px solid #171717'
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: '#737373' }}>-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
