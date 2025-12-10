import React from 'react';
import { colors } from '@/app/lib/colors';
import { Commit } from '@/app/configurations/prompt-editor/types';
import { getBranchColor } from '@/app/configurations/prompt-editor/utils';

interface EditorViewProps {
  currentBranch: string;
  currentContent: string;
  commitMessage: string;
  commits: Commit[];
  onContentChange: (content: string) => void;
  onCommitMessageChange: (message: string) => void;
  onCommit: () => void;
}

export default function EditorView({
  currentBranch,
  currentContent,
  commitMessage,
  commits,
  onContentChange,
  onCommitMessageChange,
  onCommit
}: EditorViewProps) {
  return (
    <div className="flex-1 p-6 overflow-auto" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-sm mb-4" style={{ color: colors.text.secondary }}>
          Editing on <strong style={{ color: getBranchColor(commits, currentBranch) }}>{currentBranch}</strong>
        </div>
        <textarea
          value={currentContent}
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full rounded-md text-sm focus:outline-none"
          style={{
            minHeight: '400px',
            padding: '16px',
            border: `1px solid ${colors.border}`,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            marginBottom: '16px',
            resize: 'vertical',
            backgroundColor: colors.bg.primary,
            color: colors.text.primary
          }}
          placeholder="Write your prompt here..."
        />
        <div className="border rounded-lg p-4" style={{
          backgroundColor: colors.bg.primary,
          borderColor: colors.border
        }}>
          <input
            type="text"
            placeholder="Describe your changes..."
            value={commitMessage}
            onChange={(e) => onCommitMessageChange(e.target.value)}
            className="w-full px-4 py-2 rounded-md text-sm mb-3 focus:outline-none"
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bg.primary,
              color: colors.text.primary
            }}
            onKeyDown={(e) => e.key === 'Enter' && onCommit()}
          />
          <button
            onClick={onCommit}
            disabled={!commitMessage.trim()}
            className="px-6 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: commitMessage.trim() ? colors.accent.primary : colors.bg.secondary,
              color: commitMessage.trim() ? colors.bg.primary : colors.text.secondary,
              border: 'none',
              cursor: commitMessage.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (commitMessage.trim()) {
                e.currentTarget.style.backgroundColor = colors.accent.hover;
              }
            }}
            onMouseLeave={(e) => {
              if (commitMessage.trim()) {
                e.currentTarget.style.backgroundColor = colors.accent.primary;
              }
            }}
          >
            Commit to {currentBranch}
          </button>
        </div>
      </div>
    </div>
  );
}
