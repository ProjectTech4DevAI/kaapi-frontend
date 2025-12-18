import React from 'react';
import { colors } from '@/app/lib/colors';

interface UnifiedCommitBarProps {
  commitMessage: string;
  onCommitMessageChange: (msg: string) => void;
  onCommit: () => void;
  currentBranch: string;
  hasPromptChanges: boolean;
  hasConfigChanges: boolean;
}

export default function UnifiedCommitBar({
  commitMessage,
  onCommitMessageChange,
  onCommit,
  currentBranch,
  hasPromptChanges,
  hasConfigChanges,
}: UnifiedCommitBarProps) {
  const hasAnyChanges = hasPromptChanges || hasConfigChanges;

  return (
    <div
      className="border-t"
      style={{
        backgroundColor: colors.bg.primary,
        borderColor: colors.border,
        padding: '12px 16px',
      }}
    >
      <div className="flex items-center gap-4">
        {/* Change Indicators */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium"
            style={{ color: colors.text.secondary }}
          >
            Changes:
          </span>
          <div
            className="px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: hasPromptChanges ? colors.status.success : colors.bg.secondary,
              color: hasPromptChanges ? '#ffffff' : colors.text.secondary,
            }}
          >
            {hasPromptChanges ? '✓' : ''} Prompt
          </div>
          <div
            className="px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: hasConfigChanges ? colors.status.success : colors.bg.secondary,
              color: hasConfigChanges ? '#ffffff' : colors.text.secondary,
            }}
          >
            {hasConfigChanges ? '✓' : ''} Config
          </div>
        </div>

        {/* Commit Message Input */}
        <input
          type="text"
          placeholder={hasAnyChanges ? 'Describe your changes...' : 'No changes to commit'}
          value={commitMessage}
          onChange={(e) => onCommitMessageChange(e.target.value)}
          disabled={!hasAnyChanges}
          className="flex-1 px-4 py-2 rounded-md text-sm focus:outline-none"
          style={{
            border: `1px solid ${colors.border}`,
            backgroundColor: hasAnyChanges ? colors.bg.primary : colors.bg.secondary,
            color: colors.text.primary,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && commitMessage.trim() && hasAnyChanges) {
              onCommit();
            }
          }}
        />

        {/* Commit Button */}
        <button
          onClick={onCommit}
          disabled={!commitMessage.trim() || !hasAnyChanges}
          className="px-6 py-2 rounded-md text-sm font-medium whitespace-nowrap"
          style={{
            backgroundColor:
              commitMessage.trim() && hasAnyChanges
                ? colors.accent.primary
                : colors.bg.secondary,
            color:
              commitMessage.trim() && hasAnyChanges
                ? colors.bg.primary
                : colors.text.secondary,
            border: 'none',
            cursor:
              commitMessage.trim() && hasAnyChanges ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (commitMessage.trim() && hasAnyChanges) {
              e.currentTarget.style.backgroundColor = colors.accent.hover;
            }
          }}
          onMouseLeave={(e) => {
            if (commitMessage.trim() && hasAnyChanges) {
              e.currentTarget.style.backgroundColor = colors.accent.primary;
            }
          }}
        >
          Commit to {currentBranch}
        </button>
      </div>
    </div>
  );
}
