/**
 * Prompt Editor - Version Controlled Prompt + Config Editor
 *
 * A WYSIWYG editor for managing prompts and configs with linear versioning.
 * Features: save, load, compare configs with backend persistence.
 * Uses shared useConfigs hook for caching.
 * Supports URL query params for cross-navigation from Config Library/Evaluations.
 */

"use client"
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import { colors } from '@/app/lib/colors';
import { ConfigBlob, Tool } from './types';
import { hasConfigChanges } from './utils';
import {
  ConfigCreate,
  ConfigVersionCreate,
} from '@/app/lib/configTypes';
import Header from '@/app/components/prompt-editor/Header';
import HistorySidebar from '@/app/components/prompt-editor/HistorySidebar';
import PromptEditorPane from '@/app/components/prompt-editor/PromptEditorPane';
import ConfigEditorPane from '@/app/components/prompt-editor/ConfigEditorPane';
import DiffView from '@/app/components/prompt-editor/DiffView';
import { useToast } from '@/app/components/Toast';
import Loader from '@/app/components/Loader';
import { useConfigs, invalidateConfigCache, SavedConfig } from '@/app/lib/useConfigs';

function PromptEditorContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // URL query params for cross-navigation
  const urlConfigId = searchParams.get('config');
  const urlVersion = searchParams.get('version');
  const showHistory = searchParams.get('history') === 'true';
  const isNewConfig = searchParams.get('new') === 'true';

  // Evaluation context to preserve (when coming from evaluations page)
  const urlDatasetId = searchParams.get('dataset');
  const urlExperimentName = searchParams.get('experiment');
  const fromEvaluations = searchParams.get('from') === 'evaluations';

  // Default config for new versions
  const defaultConfig: ConfigBlob = {
    completion: {
      provider: 'openai',
      params: {
        model: 'gpt-4o-mini',
        instructions: '',
        temperature: 0.7,
        tools: [],
      },
    },
  };

  // Use shared configs hook with caching
  const { configs: savedConfigs, isLoading, refetch: refetchConfigs } = useConfigs();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const initialLoadComplete = !isLoading && savedConfigs.length >= 0;

  // Current working state
  const [currentContent, setCurrentContent] = useState<string>('You are a helpful AI assistant.\nYou provide clear and concise answers.\nYou are polite and professional.');
  const [currentConfigBlob, setCurrentConfigBlob] = useState<ConfigBlob>(defaultConfig);
  const [currentConfigName, setCurrentConfigName] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<string>(''); // Selected version ID
  const [currentConfigParentId, setCurrentConfigParentId] = useState<string>(''); // Parent config ID for evaluation
  const [currentConfigVersion, setCurrentConfigVersion] = useState<number>(0); // Version number for evaluation
  const [provider, setProvider] = useState<string>('openai');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [tools, setTools] = useState<Tool[]>([]);

  // UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [showHistorySidebar, setShowHistorySidebar] = useState<boolean>(true); // Default open, or from URL param
  const [showConfigPane, setShowConfigPane] = useState<boolean>(true); // Config pane collapse state

  // History viewing state
  const [selectedVersion, setSelectedVersion] = useState<SavedConfig | null>(null);
  const [compareWith, setCompareWith] = useState<SavedConfig | null>(null);

  // Get API key from localStorage
  const getApiKey = (): string | null => {
    try {
      const stored = localStorage.getItem('kaapi_api_keys');
      if (stored) {
        const keys = JSON.parse(stored);
        return keys.length > 0 ? keys[0].key : null;
      }
    } catch (e) {
      console.error('Failed to get API key:', e);
    }
    return null;
  };

  // Handle URL query params after configs are loaded
  useEffect(() => {
    if (!initialLoadComplete || savedConfigs.length === 0) return;

    // If new config is requested, reset to defaults
    if (isNewConfig) {
      setCurrentContent('');
      setCurrentConfigBlob(defaultConfig);
      setProvider('openai');
      setTemperature(0.7);
      setSelectedConfigId('');
      setCurrentConfigName('');
      setCurrentConfigParentId('');
      setCurrentConfigVersion(0);
      setTools([]);
      return;
    }

    // If a specific config/version is requested via URL params
    if (urlConfigId) {
      // Find the config by config_id and optionally version
      let targetConfig: SavedConfig | undefined;

      if (urlVersion) {
        // Find specific version
        targetConfig = savedConfigs.find(
          c => c.config_id === urlConfigId && c.version === parseInt(urlVersion)
        );
      } else {
        // Find latest version for this config
        const configVersions = savedConfigs.filter(c => c.config_id === urlConfigId);
        if (configVersions.length > 0) {
          targetConfig = configVersions.reduce((latest, current) =>
            current.version > latest.version ? current : latest
          );
        }
      }

      if (targetConfig) {
        // Load the config
        setCurrentContent(targetConfig.promptContent);
        setCurrentConfigBlob({
          completion: {
            provider: targetConfig.provider as any,
            params: {
              model: targetConfig.modelName,
              instructions: targetConfig.instructions,
              temperature: targetConfig.temperature,
              tools: targetConfig.tools || [],
            },
          },
        });
        setProvider(targetConfig.provider);
        setTemperature(targetConfig.temperature);
        setSelectedConfigId(targetConfig.id);
        setCurrentConfigName(targetConfig.name);
        setCurrentConfigParentId(targetConfig.config_id);
        setCurrentConfigVersion(targetConfig.version);
        setTools(targetConfig.tools || []);

        // If history is requested, show the history sidebar with this version selected
        if (showHistory) {
          setSelectedVersion(targetConfig);
        }
      }
    }
  }, [initialLoadComplete, savedConfigs, urlConfigId, urlVersion, showHistory, isNewConfig]);

  // Detect unsaved changes
  useEffect(() => {
    if (!selectedConfigId) {
      // New config - always has unsaved changes until saved
      setHasUnsavedChanges(true);
      return;
    }

    const selectedConfig = savedConfigs.find(c => c.id === selectedConfigId);
    if (!selectedConfig) {
      setHasUnsavedChanges(true);
      return;
    }

    // Compare current state with selected config
    const promptChanged = currentContent !== selectedConfig.promptContent;
    const configChanged = hasConfigChanges(currentConfigBlob, {
      completion: {
        provider: selectedConfig.provider as any,
        params: {
          model: selectedConfig.modelName,
          instructions: selectedConfig.instructions,
          temperature: selectedConfig.temperature,
          tools: selectedConfig.tools || [],
        },
      },
    });

    setHasUnsavedChanges(promptChanged || configChanged);
  }, [selectedConfigId, currentContent, currentConfigBlob, provider, temperature, tools, savedConfigs]);

  // Save current configuration
  const handleSaveConfig = async () => {
    if (!currentConfigName.trim()) {
      toast.error('Please enter a configuration name');
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error('No API key found. Please add an API key in the Keystore.');
      return;
    }

    setIsSaving(true);

    try {
      // Build config blob (store prompt in instructions field)
      const configBlob: ConfigBlob = {
        completion: {
          // provider: provider as 'openai' | 'anthropic' | 'google',
          provider:provider as 'openai',
          params: {
            model: currentConfigBlob.completion.params.model,
            instructions: currentContent, // Store prompt as instructions
            temperature: temperature,
            ...(tools.length > 0 && { tools }),
          },
        },
      };

      // Check if updating existing config (same name exists)
      const existingConfig = savedConfigs.find(c => c.name === currentConfigName.trim());

      if (existingConfig) {
        // Create new version for existing config
        const versionCreate: ConfigVersionCreate = {
          config_blob: configBlob,
          commit_message: commitMessage.trim() || `Updated prompt and config`,
        };

        const response = await fetch(`/api/configs/${existingConfig.config_id}/versions`, {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(versionCreate),
        });

        const data = await response.json();

        if (!data.success) {
          toast.error(`Failed to create version: ${data.error || 'Unknown error'}`);
          return;
        }

        toast.success(`Configuration "${currentConfigName}" updated! New version created.`);
      } else {
        // Create new config
        const configCreate: ConfigCreate = {
          name: currentConfigName.trim(),
          description: `${provider} configuration with prompt`,
          config_blob: configBlob,
          commit_message: commitMessage.trim() || 'Initial version',
        };

        const response = await fetch('/api/configs', {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(configCreate),
        });

        const data = await response.json();

        if (!data.success || !data.data) {
          toast.error(`Failed to create config: ${data.error || 'Unknown error'}`);
          return;
        }

        toast.success(`Configuration "${currentConfigName}" created successfully!`);
      }

      // Invalidate config cache and refresh from shared hook
      invalidateConfigCache();
      await refetchConfigs(true);

      // Reset unsaved changes flag and commit message after successful save
      setHasUnsavedChanges(false);
      setCommitMessage('');
    } catch (e) {
      console.error('Failed to save config:', e);
      toast.error('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load a saved configuration by ID
  const handleLoadConfigById = (configId: string) => {
    if (!configId) {
      // Reset to new config
      setCurrentContent('');
      setCurrentConfigBlob(defaultConfig);
      setProvider('openai');
      setTemperature(0.7);
      setSelectedConfigId('');
      setCurrentConfigName('');
      setCurrentConfigParentId('');
      setCurrentConfigVersion(0);
      setTools([]);
      return;
    }

    const config = savedConfigs.find(c => c.id === configId);
    if (!config) return;

    setCurrentContent(config.promptContent);
    setCurrentConfigBlob({
      completion: {
        provider: config.provider as any,
        params: {
          model: config.modelName,
          instructions: config.instructions,
          temperature: config.temperature,
          tools: config.tools || [],
        },
      },
    });
    setProvider(config.provider);
    setTemperature(config.temperature);
    setSelectedConfigId(config.id);
    setCurrentConfigName(config.name);
    setCurrentConfigParentId(config.config_id);
    setCurrentConfigVersion(config.version);
    setTools(config.tools || []);
  };


  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/configurations/prompt-editor" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            currentConfigId={currentConfigParentId}
            currentConfigVersion={currentConfigVersion}
            currentConfigName={currentConfigName}
            hasUnsavedChanges={hasUnsavedChanges}
            datasetId={urlDatasetId || undefined}
            experimentName={urlExperimentName || undefined}
            fromEvaluations={fromEvaluations}
          />

          <div className="flex flex-1 overflow-hidden">
            <HistorySidebar
              savedConfigs={savedConfigs}
              selectedVersion={selectedVersion}
              currentConfigId={currentConfigParentId || undefined}
              collapsed={!showHistorySidebar}
              onToggle={() => setShowHistorySidebar(!showHistorySidebar)}
              onSelectVersion={(version) => {
                setSelectedVersion(version);
                setCompareWith(null);
              }}
              onLoadVersion={(version) => {
                handleLoadConfigById(version.id);
              }}
              onBackToEditor={() => {
                setSelectedVersion(null);
                setCompareWith(null);
              }}
              isLoading={isLoading}
            />

            {/* Show DiffView only when comparing versions (sidebar open + version selected) */}
            {showHistorySidebar && selectedVersion ? (
              <DiffView
                selectedCommit={selectedVersion}
                compareWith={compareWith}
                commits={savedConfigs}
                onCompareChange={setCompareWith}
                onLoadVersion={(versionId) => {
                  handleLoadConfigById(versionId);
                  setSelectedVersion(null);
                  setCompareWith(null);
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Split View: Prompt (left) + Config (right) */}
                <div className="flex flex-1 overflow-hidden">
                  <div
                    className="flex"
                    style={{
                      flex: '1 1 0%',
                      transition: 'flex 0.2s ease-in-out',
                    }}
                  >
                    <PromptEditorPane
                      currentContent={currentContent}
                      onContentChange={setCurrentContent}
                      currentBranch={currentConfigName || 'Unsaved'}
                    />
                  </div>
                  <ConfigEditorPane
                    configBlob={currentConfigBlob}
                    onConfigChange={setCurrentConfigBlob}
                    configName={currentConfigName}
                    onConfigNameChange={setCurrentConfigName}
                    savedConfigs={savedConfigs}
                    selectedConfigId={selectedConfigId}
                    onLoadConfig={handleLoadConfigById}
                    commitMessage={commitMessage}
                    onCommitMessageChange={setCommitMessage}
                    onSave={handleSaveConfig}
                    isSaving={isSaving}
                    collapsed={!showConfigPane}
                    onToggle={() => setShowConfigPane(!showConfigPane)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function PromptEditorPage() {
  return (
    <Suspense fallback={<Loader size="lg" message="Loading..." fullScreen />}>
      <PromptEditorContent />
    </Suspense>
  );
}
