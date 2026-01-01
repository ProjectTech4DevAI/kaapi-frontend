/**
 * TranscriptionDiffViewer Component
 *
 * Shows inline diff between ground truth and hypothesis transcriptions.
 * Highlights substitutions (yellow), deletions (red), and insertions (green).
 */

import React, { useMemo } from 'react';
import { colors } from '@/app/lib/colors';

interface DiffSegment {
  type: 'match' | 'substitution' | 'deletion' | 'insertion';
  reference?: string;
  hypothesis?: string;
}

interface TranscriptionDiffViewerProps {
  groundTruth: string;
  hypothesis: string;
  showLegend?: boolean;
  compact?: boolean;
}

// Simple word-level diff algorithm
function computeWordDiff(reference: string, hypothesis: string): DiffSegment[] {
  const refWords = reference.trim().split(/\s+/).filter(w => w.length > 0);
  const hypWords = hypothesis.trim().split(/\s+/).filter(w => w.length > 0);

  if (refWords.length === 0 && hypWords.length === 0) {
    return [];
  }

  if (refWords.length === 0) {
    return hypWords.map(w => ({ type: 'insertion', hypothesis: w }));
  }

  if (hypWords.length === 0) {
    return refWords.map(w => ({ type: 'deletion', reference: w }));
  }

  // Use dynamic programming for optimal alignment (Levenshtein-style)
  const m = refWords.length;
  const n = hypWords.length;

  // Build cost matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  const ops: string[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(''));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const refWord = refWords[i - 1].toLowerCase();
      const hypWord = hypWords[j - 1].toLowerCase();

      if (refWord === hypWord) {
        dp[i][j] = dp[i - 1][j - 1];
        ops[i][j] = 'match';
      } else {
        const sub = dp[i - 1][j - 1] + 1;
        const del = dp[i - 1][j] + 1;
        const ins = dp[i][j - 1] + 1;

        if (sub <= del && sub <= ins) {
          dp[i][j] = sub;
          ops[i][j] = 'sub';
        } else if (del <= ins) {
          dp[i][j] = del;
          ops[i][j] = 'del';
        } else {
          dp[i][j] = ins;
          ops[i][j] = 'ins';
        }
      }
    }
  }

  // Backtrack to get alignment
  const segments: DiffSegment[] = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ops[i][j] === 'match') {
      segments.unshift({ type: 'match', reference: refWords[i - 1], hypothesis: hypWords[j - 1] });
      i--; j--;
    } else if (i > 0 && j > 0 && ops[i][j] === 'sub') {
      segments.unshift({ type: 'substitution', reference: refWords[i - 1], hypothesis: hypWords[j - 1] });
      i--; j--;
    } else if (i > 0 && (j === 0 || ops[i][j] === 'del')) {
      segments.unshift({ type: 'deletion', reference: refWords[i - 1] });
      i--;
    } else {
      segments.unshift({ type: 'insertion', hypothesis: hypWords[j - 1] });
      j--;
    }
  }

  return segments;
}

export default function TranscriptionDiffViewer({
  groundTruth,
  hypothesis,
  showLegend = true,
  compact = false,
}: TranscriptionDiffViewerProps) {
  const diffSegments = useMemo(() =>
    computeWordDiff(groundTruth, hypothesis),
    [groundTruth, hypothesis]
  );

  const stats = useMemo(() => {
    let matches = 0, substitutions = 0, deletions = 0, insertions = 0;
    diffSegments.forEach(seg => {
      if (seg.type === 'match') matches++;
      else if (seg.type === 'substitution') substitutions++;
      else if (seg.type === 'deletion') deletions++;
      else if (seg.type === 'insertion') insertions++;
    });
    return { matches, substitutions, deletions, insertions };
  }, [diffSegments]);

  if (!groundTruth && !hypothesis) {
    return (
      <div className="text-sm italic" style={{ color: colors.text.secondary }}>
        No text to compare
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-4 text-xs" style={{ color: colors.text.secondary }}>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: '#fef3c7' }}
            />
            <span>Substitution ({stats.substitutions})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: '#fee2e2' }}
            />
            <span>Deletion ({stats.deletions})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: '#dcfce7' }}
            />
            <span>Insertion ({stats.insertions})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: colors.text.secondary }}>
              Correct: {stats.matches}
            </span>
          </div>
        </div>
      )}

      {/* Ground Truth Row */}
      <div>
        <div className="text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
          Ground Truth
        </div>
        <div
          className={`${compact ? 'p-2' : 'p-3'} rounded-md font-mono text-sm leading-relaxed`}
          style={{ backgroundColor: colors.bg.secondary }}
        >
          {diffSegments.map((seg, idx) => {
            if (seg.type === 'insertion') {
              // Insertions don't appear in ground truth
              return null;
            }

            const word = seg.reference || '';
            let bgColor = 'transparent';
            let textDecoration = 'none';

            if (seg.type === 'substitution') {
              bgColor = '#fef3c7'; // yellow
            } else if (seg.type === 'deletion') {
              bgColor = '#fee2e2'; // red
              textDecoration = 'line-through';
            }

            return (
              <span key={idx}>
                <span
                  className="px-0.5 rounded"
                  style={{
                    backgroundColor: bgColor,
                    textDecoration,
                    color: seg.type === 'deletion' ? '#dc2626' : colors.text.primary,
                  }}
                  title={seg.type === 'substitution' ? `→ "${seg.hypothesis}"` : undefined}
                >
                  {word}
                </span>
                {idx < diffSegments.length - 1 && diffSegments[idx + 1]?.type !== 'insertion' && ' '}
              </span>
            );
          })}
        </div>
      </div>

      {/* Hypothesis Row */}
      <div>
        <div className="text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
          Hypothesis (Transcription)
        </div>
        <div
          className={`${compact ? 'p-2' : 'p-3'} rounded-md font-mono text-sm leading-relaxed`}
          style={{ backgroundColor: colors.bg.secondary }}
        >
          {diffSegments.map((seg, idx) => {
            if (seg.type === 'deletion') {
              // Deletions don't appear in hypothesis, but show placeholder
              return (
                <span key={idx}>
                  <span
                    className="px-1 mx-0.5 rounded text-xs"
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                    }}
                    title={`Missing: "${seg.reference}"`}
                  >
                    ___
                  </span>
                  {' '}
                </span>
              );
            }

            const word = seg.hypothesis || seg.reference || '';
            let bgColor = 'transparent';

            if (seg.type === 'substitution') {
              bgColor = '#fef3c7'; // yellow
            } else if (seg.type === 'insertion') {
              bgColor = '#dcfce7'; // green
            }

            return (
              <span key={idx}>
                <span
                  className="px-0.5 rounded"
                  style={{
                    backgroundColor: bgColor,
                    color: seg.type === 'insertion' ? '#16a34a' : colors.text.primary,
                    fontWeight: seg.type === 'insertion' ? 500 : 'normal',
                  }}
                  title={seg.type === 'substitution' ? `Was: "${seg.reference}"` : seg.type === 'insertion' ? 'Inserted' : undefined}
                >
                  {word}
                </span>
                {' '}
              </span>
            );
          })}
        </div>
      </div>

      {/* Inline comparison view */}
      {!compact && (
        <div>
          <div className="text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
            Inline Comparison
          </div>
          <div
            className="p-3 rounded-md font-mono text-sm leading-loose border"
            style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
          >
            {diffSegments.map((seg, idx) => {
              if (seg.type === 'match') {
                return (
                  <span key={idx}>
                    <span style={{ color: colors.text.primary }}>{seg.reference}</span>
                    {' '}
                  </span>
                );
              }

              if (seg.type === 'substitution') {
                return (
                  <span key={idx}>
                    <span
                      className="px-1 rounded"
                      style={{
                        backgroundColor: '#fef3c7',
                        textDecoration: 'line-through',
                        color: '#92400e',
                      }}
                    >
                      {seg.reference}
                    </span>
                    <span
                      className="px-1 rounded ml-0.5"
                      style={{
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        fontWeight: 500,
                      }}
                    >
                      {seg.hypothesis}
                    </span>
                    {' '}
                  </span>
                );
              }

              if (seg.type === 'deletion') {
                return (
                  <span key={idx}>
                    <span
                      className="px-1 rounded"
                      style={{
                        backgroundColor: '#fee2e2',
                        textDecoration: 'line-through',
                        color: '#dc2626',
                      }}
                    >
                      {seg.reference}
                    </span>
                    {' '}
                  </span>
                );
              }

              if (seg.type === 'insertion') {
                return (
                  <span key={idx}>
                    <span
                      className="px-1 rounded"
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#16a34a',
                        fontWeight: 500,
                      }}
                    >
                      +{seg.hypothesis}
                    </span>
                    {' '}
                  </span>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
