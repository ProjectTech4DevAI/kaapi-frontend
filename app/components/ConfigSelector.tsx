/**
 * ConfigSelector - Read-only config selector for Evaluations page
 * Allows selecting a saved config with "Edit in Prompt Editor" link
 */

"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/app/lib/colors';
import { useConfigs, SavedConfig, formatRelativeTime } from '@/app/lib/useConfigs';

interface ConfigSelectorProps {
  selectedConfigId: string;
  selectedVersion: number;
  onConfigSelect: (configId: string, version: number) => void;
  disabled?: boolean;
  // Context to preserve when navigating to Prompt Editor
  datasetId?: string;
  experimentName?: string;
}

export default function ConfigSelector({
  selectedConfigId,
  selectedVersion,
  onConfigSelect,
  disabled = false,
  datasetId,
  experimentName,
}: ConfigSelectorProps) {
  const router = useRouter();
  const { configs, configGroups, isLoading, error } = useConfigs();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Find currently selected config
  const selectedConfig = configs.find(
    c => c.config_id === selectedConfigId && c.version === selectedVersion
  );

  // Handle config selection
  const handleSelect = (config: SavedConfig) => {
    onConfigSelect(config.config_id, config.version);
    setIsDropdownOpen(false);
  };

  // Build URL params preserving evaluation context
  const buildEditorUrl = (configId?: string, version?: number) => {
    const params = new URLSearchParams();
    if (configId && version) {
      params.set('config', configId);
      params.set('version', version.toString());
    } else {
      params.set('new', 'true');
    }
    // Preserve evaluation context
    if (datasetId) params.set('dataset', datasetId);
    if (experimentName) params.set('experiment', experimentName);
    params.set('from', 'evaluations'); // Mark that we came from evaluations
    return `/configurations/prompt-editor?${params.toString()}`;
  };

  // Navigate to Prompt Editor to edit
  const handleEditInPromptEditor = () => {
    router.push(buildEditorUrl(selectedConfigId, selectedVersion));
  };

  // Navigate to Config Library
  const handleBrowseLibrary = () => {
    const params = new URLSearchParams();
    if (datasetId) params.set('dataset', datasetId);
    if (experimentName) params.set('experiment', experimentName);
    params.set('from', 'evaluations');
    router.push(`/configurations?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div
        className="border rounded-lg p-6"
        style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
            Select Configuration
          </h2>
        </div>
        <div
          className="w-full px-4 py-3 rounded-md text-sm"
          style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
        >
          Loading configurations...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="border rounded-lg p-6"
        style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
            Select Configuration
          </h2>
        </div>
        <div
          className="rounded-lg p-4 text-sm"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      className="border rounded-lg p-6"
      style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
            Select Configuration
          </h2>
          <span className="text-xs" style={{ color: colors.text.secondary }}>
            (Required)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBrowseLibrary}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: colors.bg.primary,
              border: `1px solid ${colors.border}`,
              color: colors.text.secondary,
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
            Browse Library
          </button>
          <button
            onClick={handleEditInPromptEditor}
            className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
            style={{
              backgroundColor: colors.bg.primary,
              border: `1px solid ${colors.border}`,
              color: colors.text.primary,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {selectedConfig ? 'Edit Config' : 'Create Config'}
          </button>
        </div>
      </div>

      {/* No configs available */}
      {configGroups.length === 0 ? (
        <div
          className="rounded-lg p-6 text-center"
          style={{ backgroundColor: colors.bg.secondary, border: `2px dashed ${colors.border}` }}
        >
          <svg
            className="w-10 h-10 mx-auto mb-2"
            style={{ color: colors.text.secondary }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
            No configurations found
          </p>
          <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
            Create a configuration in the Prompt Editor first
          </p>
          <button
            onClick={handleEditInPromptEditor}
            className="mt-3 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ backgroundColor: colors.accent.primary, color: colors.bg.primary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accent.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent.primary}
          >
            Create Configuration
          </button>
        </div>
      ) : (
        <>
          {/* Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
              disabled={disabled}
              className="w-full px-4 py-3 rounded-md text-left flex items-center justify-between transition-colors"
              style={{
                backgroundColor: disabled ? colors.bg.secondary : colors.bg.primary,
                border: `1px solid ${selectedConfig ? colors.accent.primary : colors.border}`,
                color: colors.text.primary,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {selectedConfig ? (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{selectedConfig.name}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                    >
                      v{selectedConfig.version}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                    {selectedConfig.provider}/{selectedConfig.modelName} • T:{selectedConfig.temperature.toFixed(2)}
                  </div>
                </div>
              ) : (
                <span style={{ color: colors.text.secondary }}>Select a configuration...</span>
              )}
              <svg
                className="w-5 h-5 flex-shrink-0 ml-2 transition-transform"
                style={{
                  color: colors.text.secondary,
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className="absolute z-50 w-full mt-1 rounded-md shadow-lg max-h-64 overflow-auto"
                style={{
                  backgroundColor: colors.bg.primary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {configGroups.map((group) => (
                  <div key={group.config_id}>
                    {/* Config group header */}
                    <div
                      className="px-3 py-2 text-xs font-medium sticky top-0"
                      style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                    >
                      {group.name} ({group.totalVersions} version{group.totalVersions !== 1 ? 's' : ''})
                    </div>
                    {/* Versions */}
                    {group.versions.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => handleSelect(version)}
                        className="w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors"
                        style={{
                          backgroundColor: selectedConfig?.id === version.id ? colors.bg.secondary : colors.bg.primary,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = selectedConfig?.id === version.id
                            ? colors.bg.secondary
                            : colors.bg.primary;
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                            >
                              v{version.version}
                            </span>
                            <span className="text-sm truncate" style={{ color: colors.text.primary }}>
                              {version.commit_message || 'No message'}
                            </span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                            {version.provider}/{version.modelName} • {formatRelativeTime(version.timestamp)}
                          </div>
                        </div>
                        {selectedConfig?.id === version.id && (
                          <svg className="w-4 h-4 flex-shrink-0" style={{ color: colors.status.success }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Config Preview */}
          {selectedConfig && (
            <div
              className="mt-4 rounded-md p-4"
              style={{ backgroundColor: colors.bg.secondary }}
            >
              <div className="text-xs font-medium mb-2" style={{ color: colors.text.secondary }}>
                Prompt Preview
              </div>
              <div
                className="text-xs font-mono line-clamp-3"
                style={{ color: colors.text.primary }}
              >
                {selectedConfig.instructions || 'No instructions set'}
              </div>
            </div>
          )}
        </>
      )}

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
