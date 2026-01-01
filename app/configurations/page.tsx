/**
 * Config Library - Central hub for managing configurations
 *
 * Features:
 * - View all configs with their versions
 * - Quick actions: Edit, Use in Evaluation, View History
 * - Shows evaluation usage count per config
 * - Create new config navigation
 */

"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import { colors } from '@/app/lib/colors';
import { useConfigs, ConfigGroup, SavedConfig } from '@/app/lib/useConfigs';
import ConfigCard from '@/app/components/ConfigCard';
import { LoaderBox } from '@/app/components/Loader';
import { EvalJob } from '@/app/components/types';

export default function ConfigLibraryPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { configGroups, isLoading, error, refetch, isCached } = useConfigs();
  const [searchQuery, setSearchQuery] = useState('');
  const [evaluationCounts, setEvaluationCounts] = useState<Record<string, number>>({});

  // Fetch evaluation counts for each config
  useEffect(() => {
    const fetchEvaluationCounts = async () => {
      try {
        const stored = localStorage.getItem('kaapi_api_keys');
        if (!stored) return;

        const keys = JSON.parse(stored);
        if (keys.length === 0) return;

        const response = await fetch('/api/evaluations', {
          headers: { 'X-API-KEY': keys[0].key },
        });

        if (!response.ok) return;

        const data = await response.json();
        const jobs: EvalJob[] = Array.isArray(data) ? data : (data.data || []);

        // Count evaluations per config_id
        const counts: Record<string, number> = {};
        jobs.forEach((job) => {
          if (job.config_id) {
            counts[job.config_id] = (counts[job.config_id] || 0) + 1;
          }
        });

        setEvaluationCounts(counts);
      } catch (e) {
        console.error('Failed to fetch evaluation counts:', e);
      }
    };

    fetchEvaluationCounts();
  }, []);

  // Filter configs based on search query
  const filteredConfigs = configGroups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.latestVersion.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.latestVersion.instructions.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    router.push('/configurations/prompt-editor?new=true');
  };

  const handleUseInEvaluation = (config: SavedConfig) => {
    router.push(`/evaluations?config=${config.config_id}&version=${config.version}`);
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/configurations" />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="border-b px-6 py-4"
            style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded flex-shrink-0 transition-colors"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bg.primary,
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {sidebarCollapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  )}
                </svg>
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold" style={{ color: colors.text.primary }}>
                  Configuration Library
                </h1>
                <p className="text-sm mt-0.5" style={{ color: colors.text.secondary }}>
                  Manage your prompts and model configurations
                </p>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div
            className="px-6 py-4 flex items-center gap-4"
            style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg.primary }}
          >
            {/* Search */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: colors.text.secondary }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search configs..."
                className="w-full pl-10 pr-4 py-2 rounded-md text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: colors.bg.secondary,
                  border: `1px solid ${colors.border}`,
                  color: colors.text.primary,
                }}
              />
            </div>

            {/* Cache Indicator */}
            {isCached && !isLoading && (
              <span
                className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #86efac'
                }}
                title="Showing cached data. Click refresh to get latest."
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Cached
              </span>
            )}

            {/* Refresh */}
            <button
              onClick={() => refetch(true)}
              disabled={isLoading}
              className="p-2 rounded-md transition-colors flex items-center gap-1"
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
              title="Force refresh from server"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Create New */}
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: colors.accent.primary,
                color: colors.bg.primary,
                border: 'none',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accent.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent.primary}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Config
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <LoaderBox message="Loading configurations..." size="md" />
            ) : error ? (
              <div
                className="rounded-lg p-6 text-center"
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                }}
              >
                <svg
                  className="w-12 h-12 mx-auto mb-3"
                  style={{ color: '#dc2626' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{error}</p>
                <button
                  onClick={() => router.push('/keystore')}
                  className="mt-4 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: colors.bg.primary,
                  }}
                >
                  Go to Keystore
                </button>
              </div>
            ) : filteredConfigs.length === 0 ? (
              <div
                className="rounded-lg p-8 text-center"
                style={{
                  backgroundColor: colors.bg.primary,
                  border: `2px dashed ${colors.border}`,
                }}
              >
                {searchQuery ? (
                  <>
                    <svg
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: colors.text.secondary }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                      No configs match "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-sm underline"
                      style={{ color: colors.text.secondary }}
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: colors.text.secondary }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                      No configurations yet
                    </p>
                    <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>
                      Create your first configuration to get started
                    </p>
                    <button
                      onClick={handleCreateNew}
                      className="mt-4 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: colors.accent.primary,
                        color: colors.bg.primary,
                      }}
                    >
                      Create Config
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredConfigs.map((configGroup) => (
                  <ConfigCard
                    key={configGroup.config_id}
                    configGroup={configGroup}
                    evaluationCount={evaluationCounts[configGroup.config_id] || 0}
                    onUseInEvaluation={handleUseInEvaluation}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
