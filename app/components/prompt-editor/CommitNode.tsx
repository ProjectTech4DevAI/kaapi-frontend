import React from 'react';
import { colors } from '@/app/lib/colors';
import { UnifiedCommit } from '@/app/configurations/prompt-editor/types';
import { getUnifiedBranchColor, formatTime } from '@/app/configurations/prompt-editor/utils';

interface CommitNodeProps {
  commit: UnifiedCommit;
  commits: UnifiedCommit[];
  selectedCommit: UnifiedCommit | null;
  depth: number;
  isLastChild: boolean;
  verticalLines: boolean[];
  onSelect: (commit: UnifiedCommit) => void;
}

export default function CommitNode({
  commit,
  commits,
  selectedCommit,
  depth,
  isLastChild,
  verticalLines,
  onSelect
}: CommitNodeProps) {
  const branchColor = getUnifiedBranchColor(commits, commit.branch);
  const isSelected = selectedCommit?.id === commit.id;

  return (
    <div className="flex items-start mb-1">
      {verticalLines.map((showLine, idx) => (
        <div key={idx} className="relative" style={{ width: '28px', height: '36px' }}>
          {showLine && <div className="absolute" style={{
            left: '13px',
            top: 0,
            width: '2px',
            height: '100%',
            backgroundColor: colors.border
          }} />}
        </div>
      ))}

      {depth > 0 && (
        <div className="relative" style={{ width: '28px', height: '36px' }}>
          <div className="absolute" style={{
            left: '13px',
            top: 0,
            width: '2px',
            height: '18px',
            backgroundColor: colors.border
          }} />
          <div className="absolute" style={{
            left: '13px',
            top: '18px',
            width: '15px',
            height: '2px',
            backgroundColor: colors.border
          }} />
          {!isLastChild && <div className="absolute" style={{
            left: '13px',
            top: '18px',
            width: '2px',
            height: '18px',
            backgroundColor: colors.border
          }} />}
        </div>
      )}

      <div className="rounded-full relative flex-shrink-0" style={{
        width: '14px',
        height: '14px',
        background: branchColor,
        border: `2px solid ${colors.bg.primary}`,
        boxShadow: `0 0 0 2px ${branchColor}`,
        marginTop: '11px',
        marginRight: '10px'
      }}>
        {commit.mergeFrom && (
          <div className="absolute rounded-full" style={{
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            background: '#8250df',
            border: `1px solid ${colors.bg.primary}`
          }} />
        )}
      </div>

      <div
        className="flex-1 rounded-md cursor-pointer"
        style={{
          padding: '8px 12px',
          backgroundColor: isSelected ? colors.bg.secondary : colors.bg.primary,
          borderTop: isSelected ? `2px solid ${colors.accent.primary}` : `1px solid ${colors.border}`,
          borderRight: isSelected ? `2px solid ${colors.accent.primary}` : `1px solid ${colors.border}`,
          borderBottom: isSelected ? `2px solid ${colors.accent.primary}` : `1px solid ${colors.border}`,
          borderLeft: `3px solid ${branchColor}`,
          transition: 'all 0.15s ease'
        }}
        onClick={() => onSelect(commit)}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = colors.bg.secondary;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = colors.bg.primary;
          }
        }}
      >
        <div className="text-xs font-semibold mb-1" style={{ color: colors.text.primary }}>
          {commit.message}
        </div>
        <div className="text-[10px] flex items-center gap-2 flex-wrap" style={{ color: colors.text.secondary }}>
          <span className="px-2 py-0.5 rounded-full font-semibold" style={{
            backgroundColor: branchColor + '20',
            color: branchColor
          }}>
            {commit.branch}
          </span>
          <span>#{commit.id}</span>
          <span>•</span>
          <span>{formatTime(commit.timestamp)}</span>
          {commit.mergeFrom && (
            <>
              <span>•</span>
              <span className="font-semibold" style={{ color: '#8250df' }}>
                ← {commit.mergeFrom}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
