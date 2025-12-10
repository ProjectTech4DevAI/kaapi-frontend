import React from 'react';
import { colors } from '@/app/lib/colors';
import { Commit } from '@/app/configurations/prompt-editor/types';
import { getAllBranches } from '@/app/configurations/prompt-editor/utils';
import CommitNode from './CommitNode';

interface HistorySidebarProps {
  commits: Commit[];
  selectedCommit: Commit | null;
  onSelectCommit: (commit: Commit) => void;
  onBackToEditor: () => void;
}

export default function HistorySidebar({
  commits,
  selectedCommit,
  onSelectCommit,
  onBackToEditor
}: HistorySidebarProps) {
  const renderTree = () => {
    const rendered = new Set<string>();
    const renderCommit = (
      commit: Commit,
      depth = 0,
      isLastChild = true,
      verticalLines: boolean[] = []
    ): React.ReactElement | null => {
      if (rendered.has(commit.id)) return null;
      rendered.add(commit.id);
      const children = commits
        .filter(c => c.parentId === commit.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      return (
        <div key={commit.id}>
          <CommitNode
            commit={commit}
            commits={commits}
            selectedCommit={selectedCommit}
            depth={depth}
            isLastChild={isLastChild}
            verticalLines={verticalLines}
            onSelect={onSelectCommit}
          />

          {children.length > 0 && (
            <div>
              {children.map((child, idx) =>
                renderCommit(
                  child,
                  depth + 1,
                  idx === children.length - 1,
                  depth > 0 ? [...verticalLines, !isLastChild] : []
                )
              )}
            </div>
          )}
        </div>
      );
    };

    const roots = commits.filter(c => !c.parentId).sort((a, b) => a.timestamp - b.timestamp);
    return roots.map(root => renderCommit(root, 0, true, []));
  };

  return (
    <div
      className="border-r flex flex-col"
      style={{
        width: '320px',
        backgroundColor: colors.bg.primary,
        borderColor: colors.border
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <div className="text-sm font-semibold mb-1" style={{ color: colors.text.primary }}>Commit History</div>
        <div className="text-xs" style={{ color: colors.text.secondary }}>
          {commits.length} commits • {getAllBranches(commits).length} branches
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">{renderTree()}</div>
      {selectedCommit && (
        <div className="p-3 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={onBackToEditor}
            className="w-full px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: colors.bg.primary,
              color: colors.text.primary,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
          >
            ← Back to Editor
          </button>
        </div>
      )}
    </div>
  );
}
