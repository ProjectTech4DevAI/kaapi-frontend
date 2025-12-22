import React from 'react';
import { colors } from '@/app/lib/colors';

interface PromptEditorPaneProps {
  currentContent: string;
  onContentChange: (content: string) => void;
  currentBranch: string;
  isReadOnly?: boolean;
}

export default function PromptEditorPane({
  currentContent,
  onContentChange,
  currentBranch,
  isReadOnly = false,
}: PromptEditorPaneProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="px-4 py-3 border-b"
        style={{
          backgroundColor: colors.bg.primary,
          borderColor: colors.border
        }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: colors.text.primary }}
        >
          Prompt
        </h3>
        <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
          Editing on <strong>{currentBranch}</strong>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto" style={{ backgroundColor: colors.bg.secondary }}>
        <textarea
          value={currentContent}
          onChange={(e) => onContentChange(e.target.value)}
          readOnly={isReadOnly}
          className="w-full h-full rounded-md text-sm focus:outline-none resize-none"
          style={{
            minHeight: '100%',
            padding: '16px',
            border: `1px solid ${colors.border}`,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            backgroundColor: colors.bg.primary,
            color: colors.text.primary,
            cursor: isReadOnly ? 'default' : 'text',
          }}
          placeholder={isReadOnly ? '' : 'Write your prompt here...'}
        />
      </div>
    </div>
  );
}
