/**
 * Prompt Editor - Version Controlled Prompt + Config Editor
 *
 * A WYSIWYG editor for managing prompts and configs with linear versioning.
 * Features: save, load, compare configs with backend persistence.
 * Uses backend API for config storage and version management.
 */

"use client"
import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { colors } from '@/app/lib/colors';
import { ConfigBlob, Tool } from './types';
import { hasPromptChanges, hasConfigChanges } from './utils';
import {
  ConfigPublic,
  ConfigVersionPublic,
  ConfigCreate,
  ConfigVersionCreate,
  ConfigListResponse,
  ConfigVersionListResponse,
  ConfigVersionResponse,
} from '@/app/lib/configTypes';
import Header from '@/app/components/prompt-editor/Header';
import HistorySidebar from '@/app/components/prompt-editor/HistorySidebar';
import PromptEditorPane from '@/app/components/prompt-editor/PromptEditorPane';
import ConfigEditorPane from '@/app/components/prompt-editor/ConfigEditorPane';
import DiffView from '@/app/components/prompt-editor/DiffView';
import { useToast } from '@/app/components/Toast';

// UI representation of a config version (flattened for easier display)
interface SavedConfig {
  id: string; // version id
  config_id: string; // parent config id
  name: string;
  version: number;
  timestamp: string; // ISO datetime from backend
  instructions: string;
  promptContent: string;
  modelName: string;
  provider: string;
  temperature: number;
  tools?: Tool[];
  commit_message?: string | null;
}

export default function PromptEditorPage() {
  const toast = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Saved configurations (from backend)
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Current working state
  const [currentContent, setCurrentContent] = useState<string>('You are a helpful AI assistant.\nYou provide clear and concise answers.\nYou are polite and professional.');
  const [currentConfigBlob, setCurrentConfigBlob] = useState<ConfigBlob>(defaultConfig);
  const [currentConfigName, setCurrentConfigName] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<string>(''); // Selected version ID
  const [provider, setProvider] = useState<string>('openai');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [tools, setTools] = useState<Tool[]>([]);

  // UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>('');

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

  // Flatten config version for UI
  const flattenConfigVersion = (
    config: ConfigPublic,
    version: ConfigVersionPublic
  ): SavedConfig => {
    const blob = version.config_blob as ConfigBlob;
    const params = blob.completion.params;

    // Debug: log the params to see what we're getting
    console.log('Flattening config version:', {
      configName: config.name,
      version: version.version,
      instructions: params.instructions,
      instructionsLength: params.instructions?.length || 0,
    });

    return {
      id: version.id,
      config_id: config.id,
      name: config.name,
      version: version.version,
      timestamp: version.inserted_at,
      instructions: params.instructions || '',
      promptContent: params.instructions || '', // Using instructions as prompt content
      modelName: params.model || '',
      provider: blob.completion.provider,
      temperature: params.temperature || 0.7,
      tools: params.tools || [],
      commit_message: version.commit_message,
    };
  };

  // Load saved configs from backend
  useEffect(() => {
    const fetchConfigs = async () => {
      setIsLoading(true);
      const apiKey = getApiKey();
      if (!apiKey) {
        console.warn('No API key found. Please add an API key in the Keystore.');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch all configs
        const response = await fetch('/api/configs', {
          headers: { 'X-API-KEY': apiKey },
        });
        const data: ConfigListResponse = await response.json();

        if (!data.success || !data.data) {
          console.error('Failed to fetch configs:', data.error);
          setIsLoading(false);
          return;
        }

        // For each config, fetch its versions
        const allVersions: SavedConfig[] = [];
        for (const config of data.data) {
          try {
            const versionsResponse = await fetch(`/api/configs/${config.id}/versions`, {
              headers: { 'X-API-KEY': apiKey },
            });
            const versionsData: ConfigVersionListResponse = await versionsResponse.json();

            if (versionsData.success && versionsData.data) {
              // Fetch full version details for each version
              for (const versionItem of versionsData.data) {
                try {
                  const versionResponse = await fetch(
                    `/api/configs/${config.id}/versions/${versionItem.version}`,
                    { headers: { 'X-API-KEY': apiKey } }
                  );
                  const versionData: ConfigVersionResponse = await versionResponse.json();

                  if (versionData.success && versionData.data) {
                    allVersions.push(flattenConfigVersion(config, versionData.data));
                  }
                } catch (e) {
                  console.error(`Failed to fetch version ${versionItem.version}:`, e);
                }
              }
            }
          } catch (e) {
            console.error(`Failed to fetch versions for config ${config.id}:`, e);
          }
        }

        setSavedConfigs(allVersions);
      } catch (e) {
        console.error('Failed to load saved configs:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfigs();
  }, []);

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

      // Refresh configs list
      const response = await fetch('/api/configs', {
        headers: { 'X-API-KEY': apiKey },
      });
      const data: ConfigListResponse = await response.json();

      if (data.success && data.data) {
        const allVersions: SavedConfig[] = [];
        for (const config of data.data) {
          try {
            const versionsResponse = await fetch(`/api/configs/${config.id}/versions`, {
              headers: { 'X-API-KEY': apiKey },
            });
            const versionsData: ConfigVersionListResponse = await versionsResponse.json();

            if (versionsData.success && versionsData.data) {
              for (const versionItem of versionsData.data) {
                try {
                  const versionResponse = await fetch(
                    `/api/configs/${config.id}/versions/${versionItem.version}`,
                    { headers: { 'X-API-KEY': apiKey } }
                  );
                  const versionData: ConfigVersionResponse = await versionResponse.json();

                  if (versionData.success && versionData.data) {
                    allVersions.push(flattenConfigVersion(config, versionData.data));
                  }
                } catch (e) {
                  console.error('Failed to fetch version:', e);
                }
              }
            }
          } catch (e) {
            console.error('Failed to fetch versions:', e);
          }
        }
        setSavedConfigs(allVersions);
      }

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
          />

          <div className="flex flex-1 overflow-hidden">
            <HistorySidebar
              savedConfigs={savedConfigs}
              selectedVersion={selectedVersion}
              onSelectVersion={(version) => {
                setSelectedVersion(version);
                setCompareWith(null);
              }}
              onBackToEditor={() => {
                setSelectedVersion(null);
                setCompareWith(null);
              }}
              isLoading={isLoading}
            />

            {!selectedVersion ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Split View: Prompt (left) + Config (right) */}
                <div className="flex flex-1 overflow-hidden">
                  <div className="flex-1 flex border-r" style={{ borderColor: colors.border }}>
                    <PromptEditorPane
                      currentContent={currentContent}
                      onContentChange={setCurrentContent}
                      currentBranch={currentConfigName || 'Unsaved'}
                    />
                  </div>
                  <div className="flex-1 flex">
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
                    />
                  </div>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
