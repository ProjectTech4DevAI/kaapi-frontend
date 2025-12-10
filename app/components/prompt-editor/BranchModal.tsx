import { colors } from '@/app/lib/colors';
import { Commit } from '@/app/configurations/prompt-editor/types';

interface BranchModalProps {
  isOpen: boolean;
  branchFromCommit: Commit | null;
  newBranchName: string;
  onBranchNameChange: (name: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export default function BranchModal({
  isOpen,
  branchFromCommit,
  newBranchName,
  onBranchNameChange,
  onCreate,
  onClose
}: BranchModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000
    }}>
      <div className="rounded-lg p-6 shadow-xl" style={{
        backgroundColor: colors.bg.primary,
        width: '400px'
      }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
          Create New Branch
        </h3>
        <div className="mb-4">
          <label className="block text-sm mb-2" style={{ color: colors.text.secondary }}>
            From: <strong>#{branchFromCommit?.id}</strong> - {branchFromCommit?.message}
          </label>
          <input
            type="text"
            placeholder="Branch name"
            value={newBranchName}
            onChange={(e) => onBranchNameChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bg.primary,
              color: colors.text.primary
            }}
            onKeyDown={(e) => e.key === 'Enter' && onCreate()}
            autoFocus
          />
        </div>
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
            onClick={onCreate}
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
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
