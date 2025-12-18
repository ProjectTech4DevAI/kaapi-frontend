import { colors } from '@/app/lib/colors';
import { UnifiedCommit } from '@/app/configurations/prompt-editor/types';
import { getAllUnifiedBranches, getUnifiedBranchColor } from '@/app/configurations/prompt-editor/utils';

interface MergeModalProps {
  isOpen: boolean;
  currentBranch: string;
  mergeToBranch: string;
  commits: UnifiedCommit[];
  onMergeToBranchChange: (branch: string) => void;
  onMerge: () => void;
  onClose: () => void;
}

export default function MergeModal({
  isOpen,
  currentBranch,
  mergeToBranch,
  commits,
  onMergeToBranchChange,
  onMerge,
  onClose
}: MergeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000
    }}>
      <div className="rounded-lg p-6 shadow-xl" style={{
        backgroundColor: colors.bg.primary,
        width: '450px'
      }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
          Merge Branch
        </h3>
        <div className="mb-4">
          <label className="block text-sm mb-2" style={{ color: colors.text.secondary }}>
            Merge <strong style={{ color: getUnifiedBranchColor(commits, currentBranch) }}>{currentBranch}</strong> into:
          </label>
          <select
            value={mergeToBranch}
            onChange={(e) => onMergeToBranchChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bg.primary,
              color: colors.text.primary
            }}
          >
            <option value="">Select target branch...</option>
            {getAllUnifiedBranches(commits).filter(b => b !== currentBranch).map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {mergeToBranch && (() => {
          const lastMerge = commits.filter(c => c.branch === mergeToBranch && c.mergeFrom === currentBranch).sort((a, b) => b.timestamp - a.timestamp)[0];
          const newCommits = lastMerge ? commits.filter(c => c.branch === currentBranch && c.timestamp > lastMerge.timestamp) : commits.filter(c => c.branch === currentBranch);
          return (
            <div className="p-3 rounded-md mb-4 text-xs" style={{
              backgroundColor: newCommits.length > 0 ? '#dafbe1' : '#fff8c5',
              border: `1px solid ${newCommits.length > 0 ? colors.status.success : colors.status.warning}`,
            }}>
              {newCommits.length > 0 ? (
                <>
                  <strong style={{ color: '#116329' }}>✓ Ready</strong>
                  <div style={{ color: '#116329', marginTop: '4px' }}>
                    {newCommits.length} new commit{newCommits.length > 1 ? 's' : ''}
                  </div>
                </>
              ) : (
                <>
                  <strong style={{ color: '#7d4e00' }}>⚠ No changes</strong>
                  <div style={{ color: '#7d4e00', marginTop: '4px' }}>
                    No new commits since last merge
                  </div>
                </>
              )}
            </div>
          );
        })()}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: colors.bg.secondary,
              color: colors.text.primary,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
          >
            Cancel
          </button>
          <button
            onClick={onMerge}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: colors.accent.primary,
              color: colors.bg.primary,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accent.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent.primary}
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}
