import React from 'react';
import { colors } from '@/app/lib/colors';
import { Commit, DiffLine, DiffStats } from '@/app/configurations/prompt-editor/types';
import { getBranchColor, formatTime, getLineDiff } from '@/app/configurations/prompt-editor/utils';

interface DiffViewProps {
  selectedCommit: Commit;
  compareWith: Commit | null;
  commits: Commit[];
  onCompareChange: (commit: Commit | null) => void;
}

export default function DiffView({
  selectedCommit,
  compareWith,
  commits,
  onCompareChange
}: DiffViewProps) {
  const diffLines = selectedCommit && compareWith ? getLineDiff(compareWith.content, selectedCommit.content) : [];
  const stats: DiffStats = diffLines.reduce((acc, line) => {
    if (line.type === 'added') acc.additions++;
    if (line.type === 'removed') acc.deletions++;
    return acc;
  }, { additions: 0, deletions: 0 });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b" style={{
        backgroundColor: colors.bg.primary,
        borderColor: colors.border
      }}>
        <div className="mb-3">
          <div className="text-lg font-semibold mb-1" style={{ color: colors.text.primary }}>
            {selectedCommit.message}
          </div>
          <div className="text-xs" style={{ color: colors.text.secondary }}>
            {formatTime(selectedCommit.timestamp)} • <span style={{ color: getBranchColor(commits, selectedCommit.branch) }}>{selectedCommit.branch}</span>
            {selectedCommit.mergeFrom && <span style={{ color: '#8250df' }}> ← merged from {selectedCommit.mergeFrom}</span>}
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <select
            onChange={(e) => {
              const commit = commits.find(c => c.id === e.target.value);
              onCompareChange(commit || null);
            }}
            value={compareWith?.id || ''}
            className="px-3 py-2 rounded-md text-sm"
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bg.primary,
              color: colors.text.primary,
              minWidth: '240px',
              outline: 'none'
            }}
          >
            <option value="">View content</option>
            <option disabled>─────────────</option>
            {commits.filter(c => c.id !== selectedCommit.id).map(c => (
              <option key={c.id} value={c.id}>Compare with #{c.id}: {c.message}</option>
            ))}
          </select>
          {compareWith && compareWith.id !== selectedCommit.id && (
            <div className="text-xs px-3 py-2 rounded-md" style={{
              backgroundColor: colors.bg.secondary,
              color: colors.text.secondary
            }}>
              <span style={{ color: colors.status.success }}>+{stats.additions}</span> / <span style={{ color: colors.status.error }}>-{stats.deletions}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto" style={{ backgroundColor: colors.bg.secondary }}>
        {compareWith && compareWith.id !== selectedCommit.id ? (
          <div className="flex min-h-full">
            <div className="flex-1 border-r" style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.border
            }}>
              <div className="px-4 py-2 border-b text-xs font-semibold" style={{
                backgroundColor: colors.bg.secondary,
                borderColor: colors.border,
                color: colors.text.secondary
              }}>
                #{compareWith.id}: {compareWith.message}
              </div>
              {diffLines.map((line, idx) => (
                <div key={idx} className="flex" style={{
                  backgroundColor: line.type === 'removed' ? '#ffebe9' : line.type === 'unchanged' ? colors.bg.primary : colors.bg.secondary,
                  minHeight: '22px'
                }}>
                  <div className="text-right text-xs border-r" style={{
                    width: '50px',
                    padding: '2px 10px',
                    color: colors.text.secondary,
                    backgroundColor: line.type === 'removed' ? '#ffdddb' : colors.bg.secondary,
                    borderColor: colors.border,
                    fontFamily: 'ui-monospace, monospace',
                    userSelect: 'none'
                  }}>
                    {line.oldNum || ''}
                  </div>
                  <div className="flex-1 text-xs" style={{
                    padding: '2px 12px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    lineHeight: '18px',
                    whiteSpace: 'pre',
                    color: line.type === 'removed' ? '#82071e' : colors.text.primary
                  }}>
                    {line.type === 'removed' && <span style={{ color: colors.status.error, marginRight: '6px' }}>-</span>}
                    {line.oldLine || ''}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
              <div className="px-4 py-2 border-b text-xs font-semibold" style={{
                backgroundColor: colors.bg.secondary,
                borderColor: colors.border,
                color: colors.text.secondary
              }}>
                #{selectedCommit.id}: {selectedCommit.message}
              </div>
              {diffLines.map((line, idx) => (
                <div key={idx} className="flex" style={{
                  backgroundColor: line.type === 'added' ? '#dafbe1' : line.type === 'unchanged' ? colors.bg.primary : colors.bg.secondary,
                  minHeight: '22px'
                }}>
                  <div className="text-right text-xs border-r" style={{
                    width: '50px',
                    padding: '2px 10px',
                    color: colors.text.secondary,
                    backgroundColor: line.type === 'added' ? '#bef5cb' : colors.bg.secondary,
                    borderColor: colors.border,
                    fontFamily: 'ui-monospace, monospace',
                    userSelect: 'none'
                  }}>
                    {line.newNum || ''}
                  </div>
                  <div className="flex-1 text-xs" style={{
                    padding: '2px 12px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    lineHeight: '18px',
                    whiteSpace: 'pre',
                    color: line.type === 'added' ? '#116329' : colors.text.primary
                  }}>
                    {line.type === 'added' && <span style={{ color: colors.status.success, marginRight: '6px' }}>+</span>}
                    {line.newLine || ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="min-h-full p-6" style={{ backgroundColor: colors.bg.primary }}>
            <pre className="text-sm" style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              lineHeight: '1.6',
              margin: 0,
              whiteSpace: 'pre-wrap',
              color: colors.text.primary
            }}>
              {selectedCommit.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
