import React from 'react';
import { colors } from '@/app/lib/colors';
import { Commit } from '@/app/configurations/prompt-editor/types';
import { getAllBranches } from '@/app/configurations/prompt-editor/utils';

interface HeaderProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  currentBranch: string;
  commits: Commit[];
  onSwitchBranch: (branch: string) => void;
  onCreateBranch: () => void;
  onMerge: () => void;
  onOpenConfig: () => void;
}

export default function Header({
  sidebarCollapsed,
  setSidebarCollapsed,
  currentBranch,
  commits,
  onSwitchBranch,
  onCreateBranch,
  onMerge,
  onOpenConfig
}: HeaderProps) {
  return (
    <div className="border-b px-6 py-4" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded flex-shrink-0"
            style={{
              borderWidth: '1px',
              borderColor: colors.border,
              backgroundColor: colors.bg.primary,
              color: colors.text.secondary,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.bg.secondary;
              e.currentTarget.style.color = colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.bg.primary;
              e.currentTarget.style.color = colors.text.secondary;
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: colors.text.primary, letterSpacing: '-0.01em' }}>Prompt Editor</h1>
            <p className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>Version-controlled prompt editor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={currentBranch}
            onChange={(e) => onSwitchBranch(e.target.value)}
            className="px-3 py-2 rounded-md text-sm"
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bg.primary,
              color: colors.text.primary,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {getAllBranches(commits).map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button
            onClick={onCreateBranch}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: colors.accent.primary,
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accent.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent.primary}
          >
            + Branch
          </button>
          <button
            onClick={onMerge}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: colors.bg.secondary,
              color: colors.text.primary,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.bg.secondary;
            }}
          >
            Merge
          </button>
          <button
            onClick={onOpenConfig}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: '#525252',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#737373';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#525252';
            }}
          >
            Config
          </button>
        </div>
      </div>
    </div>
  );
}
