import React from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/app/lib/colors';

interface HeaderProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  currentConfigId?: string;
  currentConfigVersion?: number;
  currentConfigName?: string;
  hasUnsavedChanges?: boolean;
  // Context from evaluations page to preserve
  datasetId?: string;
  experimentName?: string;
  fromEvaluations?: boolean;
}

export default function Header({
  sidebarCollapsed,
  setSidebarCollapsed,
  currentConfigId,
  currentConfigVersion,
  currentConfigName,
  hasUnsavedChanges = false,
  datasetId,
  experimentName,
  fromEvaluations = false,
}: HeaderProps) {
  const router = useRouter();

  const handleUseInEvaluation = () => {
    const params = new URLSearchParams();
    if (currentConfigId && currentConfigVersion) {
      params.set('config', currentConfigId);
      params.set('version', currentConfigVersion.toString());
    }
    // Preserve evaluation context when returning
    if (datasetId) params.set('dataset', datasetId);
    if (experimentName) params.set('experiment', experimentName);

    router.push(`/evaluations?${params.toString()}`);
  };

  return (
    <div className="border-b px-6 py-3" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}>
      <div className="flex items-center justify-between">
        {/* Left: Sidebar toggle + Breadcrumb navigation */}
        <div className="flex items-center gap-3">
          {/* Main Sidebar Toggle */}
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
            title={sidebarCollapsed ? 'Show navigation' : 'Hide navigation'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>

          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push('/configurations')}
              className="font-medium transition-colors"
              style={{ color: colors.text.secondary }}
              onMouseEnter={(e) => e.currentTarget.style.color = colors.accent.primary}
              onMouseLeave={(e) => e.currentTarget.style.color = colors.text.secondary}
            >
              Configurations
            </button>
            <svg className="w-4 h-4" style={{ color: colors.text.secondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-semibold" style={{ color: colors.text.primary }}>
              {currentConfigName || 'New Config'}
            </span>
            {currentConfigVersion && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
              >
                v{currentConfigVersion}
              </span>
            )}
          </nav>

          {/* Status indicators - inline with breadcrumb */}
          <div className="flex items-center gap-2 ml-2">
            {hasUnsavedChanges && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: '#fffbeb',
                  color: '#b45309',
                  border: '1px solid #fcd34d'
                }}
              >
                Unsaved
              </span>
            )}
            {fromEvaluations && datasetId && (
              <span
                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #86efac'
                }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Dataset ready
              </span>
            )}
          </div>
        </div>

        {/* Right: Primary action only */}
        <button
          onClick={handleUseInEvaluation}
          disabled={hasUnsavedChanges}
          className="px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
          style={{
            backgroundColor: hasUnsavedChanges ? colors.bg.secondary : colors.accent.primary,
            color: hasUnsavedChanges ? colors.text.secondary : colors.bg.primary,
            border: hasUnsavedChanges ? `1px solid ${colors.border}` : 'none',
            cursor: hasUnsavedChanges ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!hasUnsavedChanges) {
              e.currentTarget.style.backgroundColor = colors.accent.hover;
            }
          }}
          onMouseLeave={(e) => {
            if (!hasUnsavedChanges) {
              e.currentTarget.style.backgroundColor = colors.accent.primary;
            }
          }}
          title={hasUnsavedChanges ? 'Save your changes first' : (fromEvaluations ? 'Return to evaluation with this config' : 'Use this config in an evaluation')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {fromEvaluations ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            ) : (
              <>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </>
            )}
          </svg>
          {fromEvaluations ? 'Back to Evaluation' : 'Run Evaluation'}
        </button>
      </div>
    </div>
  );
}
