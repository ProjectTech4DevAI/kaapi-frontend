import React from 'react';
import { colors } from '@/app/lib/colors';
import { SavedConfig } from '@/app/lib/useConfigs';

interface PromptDiffPaneProps {
  selectedCommit: SavedConfig;
  compareWith: SavedConfig;
}

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  content: string;
  lineNumber: number;
}

// Simple diff utility - matches SimplifiedConfigEditor implementation
function generateDiff(text1: string, text2: string): { left: DiffLine[], right: DiffLine[] } {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];
  const maxLen = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLen; i++) {
    const line1 = lines1[i] !== undefined ? lines1[i] : null;
    const line2 = lines2[i] !== undefined ? lines2[i] : null;

    if (line1 === null && line2 !== null) {
      // Line only exists in text2 (added)
      left.push({ type: 'same', content: '', lineNumber: i + 1 });
      right.push({ type: 'added', content: line2, lineNumber: i + 1 });
    } else if (line1 !== null && line2 === null) {
      // Line only exists in text1 (removed)
      left.push({ type: 'removed', content: line1, lineNumber: i + 1 });
      right.push({ type: 'same', content: '', lineNumber: i + 1 });
    } else if (line1 !== line2) {
      // Lines are different
      left.push({ type: 'removed', content: line1 || '', lineNumber: i + 1 });
      right.push({ type: 'added', content: line2 || '', lineNumber: i + 1 });
    } else {
      // Lines are the same
      left.push({ type: 'same', content: line1 || '', lineNumber: i + 1 });
      right.push({ type: 'same', content: line2 || '', lineNumber: i + 1 });
    }
  }

  return { left, right };
}

export default function PromptDiffPane({
  selectedCommit,
  compareWith,
}: PromptDiffPaneProps) {
  const { left, right } = generateDiff(compareWith.promptContent, selectedCommit.promptContent);
  const hasChanges = left.some(line => line.type !== 'same') || right.some(line => line.type !== 'same');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="px-4 py-3 border-b"
        style={{
          backgroundColor: colors.bg.primary,
          borderColor: colors.border,
        }}
      >
        <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
          Prompt Changes
        </h3>
        <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
          Side-by-side comparison: v{compareWith.version} ↔ v{selectedCommit.version}
        </div>
      </div>

      {!hasChanges ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: colors.text.secondary }}>No prompt changes</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Column Headers */}
          <div
            className="grid grid-cols-2 border-b"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.bg.secondary,
            }}
          >
            <div className="px-3 py-2 text-xs font-semibold" style={{ color: colors.text.primary }}>
              v{compareWith.version} (Before)
            </div>
            <div
              className="px-3 py-2 text-xs font-semibold border-l"
              style={{ color: colors.text.primary, borderColor: colors.border }}
            >
              v{selectedCommit.version} (After)
            </div>
          </div>

          {/* Side-by-Side Diff */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '12px' }}>
              {/* Left Panel */}
              <div style={{ backgroundColor: colors.bg.primary }}>
                {left.map((line, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1"
                    style={{
                      backgroundColor:
                        line.type === 'removed' ? '#fee2e2' :
                        line.type === 'added' ? 'transparent' :
                        colors.bg.primary,
                      color: line.type === 'removed' ? colors.status.error : colors.text.primary,
                      minHeight: '24px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {line.type === 'removed' && '- '}
                    {line.content || '\u00A0'}
                  </div>
                ))}
              </div>

              {/* Right Panel */}
              <div
                className="border-l"
                style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}
              >
                {right.map((line, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1"
                    style={{
                      backgroundColor:
                        line.type === 'added' ? '#dcfce7' :
                        line.type === 'removed' ? 'transparent' :
                        colors.bg.primary,
                      color: line.type === 'added' ? '#15803d' : colors.text.primary,
                      minHeight: '24px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {line.type === 'added' && '+ '}
                    {line.content || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
