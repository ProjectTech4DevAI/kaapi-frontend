/**
 * SimplifiedConfigEditor - Clean config management with drawer
 *
 * Features:
 * - Clean main view with dropdown selector
 * - Drawer for advanced config management
 * - Save/load configs with auto-versioning
 * - Comparison in drawer
 * - Backend integration for persistent config storage
 */

"use client"
import { useState, useEffect } from 'react';
import ConfigDrawer from './ConfigDrawer';
import { useToast } from './Toast';
import {
  ConfigPublic,
  ConfigVersionPublic,
  ConfigCreate,
  ConfigVersionCreate,
  ConfigBlob,
  Tool,
  ConfigListResponse,
  ConfigWithVersionResponse,
  ConfigVersionListResponse,
} from '@/app/lib/configTypes';

// UI representation of a config version (flattened for easier display)
export interface SavedConfig {
  id: string; // version id
  config_id: string; // parent config id
  name: string;
  version: number;
  timestamp: string; // ISO datetime from backend
  instructions: string;
  modelName: string;
  provider: string;
  temperature: number;
  vectorStoreIds: string;
  tools?: Tool[];
  commit_message?: string | null;
}

interface SimplifiedConfigEditorProps {
  experimentName: string;
  instructions: string;
  modelName: string;
  vectorStoreIds: string;
  isEvaluating: boolean;
  onExperimentNameChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
  onModelNameChange: (value: string) => void;
  onVectorStoreIdsChange: (value: string) => void;
  onRunEvaluation: () => void;
  onConfigSelect?: (configId: string, configVersion: number) => void;
}

export default function SimplifiedConfigEditor({
  experimentName,
  instructions,
  modelName,
  vectorStoreIds,
  isEvaluating,
  onExperimentNameChange,
  onInstructionsChange,
  onModelNameChange,
  onVectorStoreIdsChange,
  onRunEvaluation,
  onConfigSelect,
}: SimplifiedConfigEditorProps) {
  const toast = useToast();
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [configName, setConfigName] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [provider, setProvider] = useState<string>('openai');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>('');

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

  // Flatten config versions for UI
  const flattenConfigVersion = (
    config: ConfigPublic,
    version: ConfigVersionPublic
  ): SavedConfig => {
    const blob = version.config_blob;
    const params = blob.completion.params;

    return {
      id: version.id,
      config_id: config.id,
      name: config.name,
      version: version.version,
      timestamp: version.inserted_at,
      instructions: params.instructions || '',
      modelName: params.model || '',
      provider: blob.completion.provider,
      temperature: params.temperature || 0.7,
      vectorStoreIds: params.tools?.[0]?.vector_store_ids?.[0] || '',
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
                  const versionData = await versionResponse.json();

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
    const hasChanges =
      instructions !== selectedConfig.instructions ||
      modelName !== selectedConfig.modelName ||
      vectorStoreIds !== selectedConfig.vectorStoreIds ||
      provider !== selectedConfig.provider ||
      temperature !== selectedConfig.temperature;

    setHasUnsavedChanges(hasChanges);
  }, [selectedConfigId, instructions, modelName, vectorStoreIds, provider, temperature, savedConfigs]);

  // Save current configuration
  const handleSaveConfig = async () => {
    if (!configName.trim()) {
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
      // Build config blob
      const configBlob: ConfigBlob = {
        completion: {
          provider: provider as 'openai', // | 'anthropic' | 'google', // Only OpenAI supported for now
          params: {
            model: modelName,
            instructions: instructions,
            temperature: temperature,
            ...(tools.length > 0 && { tools }),
          },
        },
      };

      // Check if updating existing config (same name exists)
      const existingConfig = savedConfigs.find(c => c.name === configName.trim());

      if (existingConfig) {
        // Create new version for existing config
        const versionCreate: ConfigVersionCreate = {
          config_blob: configBlob,
          commit_message: commitMessage.trim() || `Updated to ${modelName} with temperature ${temperature}`,
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

        toast.success(`Configuration "${configName}" updated! New version created.`);
      } else {
        // Create new config
        const configCreate: ConfigCreate = {
          name: configName.trim(),
          description: `${provider} ${modelName} configuration`,
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

        const data: ConfigWithVersionResponse = await response.json();

        if (!data.success || !data.data) {
          toast.error(`Failed to create config: ${data.error || 'Unknown error'}`);
          return;
        }

        toast.success(`Configuration "${configName}" created successfully!`);
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
                  const versionData = await versionResponse.json();

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

  // Load a saved configuration
  const handleLoadConfig = (config: SavedConfig) => {
    onInstructionsChange(config.instructions);
    onModelNameChange(config.modelName);
    onVectorStoreIdsChange(config.vectorStoreIds);
    setProvider(config.provider);
    setTemperature(config.temperature);
    setSelectedConfigId(config.id);
    setConfigName(config.name);
    setTools(config.tools || []);

    // Notify parent about config selection
    if (onConfigSelect) {
      onConfigSelect(config.config_id, config.version);
    }
  };

  // Handle config selection from dropdown
  const handleConfigSelect = (configId: string) => {
    if (configId === '') {
      // New config - clear config selection
      setSelectedConfigId('');
      setConfigName('');
      setProvider('openai');
      setTemperature(0.7);
      setTools([]);
      onModelNameChange('gpt-4');
      onInstructionsChange('You are a helpful FAQ assistant.');
      onVectorStoreIdsChange('');

      // Notify parent to clear config selection
      if (onConfigSelect) {
        onConfigSelect('', 0);
      }
      return;
    }

    const config = savedConfigs.find(c => c.id === configId);
    if (config) {
      handleLoadConfig(config);
    }
  };

  // Handle config changes from drawer
  const handleConfigChange = (field: string, value: any) => {
    switch (field) {
      case 'name':
        setConfigName(value);
        break;
      case 'provider':
        setProvider(value);
        break;
      case 'modelName':
        onModelNameChange(value);
        break;
      case 'temperature':
        setTemperature(value);
        break;
      case 'vectorStoreIds':
        onVectorStoreIdsChange(value);
        break;
      case 'instructions':
        onInstructionsChange(value);
        break;
      case 'tools':
        setTools(value);
        break;
      case 'selectedConfigId':
        setSelectedConfigId(value);
        break;
      case 'commitMessage':
        setCommitMessage(value);
        break;
    }
  };

  // Apply config from comparison
  const handleApplyConfig = (configId: string) => {
    if (configId === 'current') return;
    const config = savedConfigs.find(c => c.id === configId);
    if (config) {
      handleLoadConfig(config);
    }
  };

  // Get current selected config
  const selectedConfig = savedConfigs.find(c => c.id === selectedConfigId);

  // Format timestamp - calculate relative time from UTC timestamps
  const formatTimestamp = (timestamp: string | number) => {
    const now = Date.now(); // Current time in UTC milliseconds
    const date = typeof timestamp === 'string'
      ? new Date(timestamp).getTime() // Parse UTC timestamp to milliseconds
      : timestamp;

    // Calculate difference (works the same in any timezone)
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <>
      <div className="border rounded-lg p-6" style={{
        backgroundColor: '#ffffff',
        borderColor: '#e5e5e5',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold" style={{ color: '#171717' }}>
            Evaluation Configuration
          </h2>

          <div className="flex items-center gap-2">
            {/* Config Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 relative"
              style={{
                backgroundColor: hasUnsavedChanges ? '#fffbeb' : '#ffffff',
                borderWidth: '1px',
                borderColor: hasUnsavedChanges ? '#fcd34d' : '#e5e5e5',
                color: hasUnsavedChanges ? '#b45309' : '#171717',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hasUnsavedChanges ? '#fef3c7' : '#fafafa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = hasUnsavedChanges ? '#fffbeb' : '#ffffff'}
            >
              {hasUnsavedChanges && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
              )}
              ⚙️ Config
            </button>

            {/* Run Evaluation Button */}
            <button
              onClick={onRunEvaluation}
              disabled={!experimentName.trim() || !modelName.trim() || !instructions.trim() || isEvaluating || hasUnsavedChanges}
              className="rounded-full p-4"
              style={{
                background: !experimentName.trim() || !modelName.trim() || !instructions.trim() || isEvaluating || hasUnsavedChanges
                  ? '#fafafa'
                  : '#171717',
                color: !experimentName.trim() || !modelName.trim() || !instructions.trim() || isEvaluating || hasUnsavedChanges
                  ? '#737373'
                  : '#ffffff',
                cursor: !experimentName.trim() || !modelName.trim() || !instructions.trim() || isEvaluating || hasUnsavedChanges
                  ? 'not-allowed'
                  : 'pointer',
                borderWidth: !experimentName.trim() || !modelName.trim() || !instructions.trim() || isEvaluating || hasUnsavedChanges
                  ? '1px'
                  : '0',
                borderColor: '#e5e5e5',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (experimentName.trim() && modelName.trim() && instructions.trim() && !isEvaluating && !hasUnsavedChanges) {
                  e.currentTarget.style.background = '#404040';
                }
              }}
              onMouseLeave={(e) => {
                if (experimentName.trim() && modelName.trim() && instructions.trim() && !isEvaluating && !hasUnsavedChanges) {
                  e.currentTarget.style.background = '#171717';
                }
              }}
            >
              {isEvaluating ? (
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="mt-4 border rounded-lg p-4" style={{
            backgroundColor: '#fffbeb',
            borderColor: '#fcd34d',
          }}>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#f59e0b' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#b45309' }}>
                  Configuration has unsaved changes
                </p>
                <p className="text-xs mt-1" style={{ color: '#b45309' }}>
                  Please save your configuration using the <strong>⚙️ Config</strong> button before running an evaluation.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Experiment Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#171717' }}>
              Experiment Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={experimentName}
              onChange={(e) => onExperimentNameChange(e.target.value)}
              placeholder="e.g., test_run_1"
              disabled={isEvaluating}
              className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none"
              style={{
                borderColor: experimentName ? '#171717' : '#e5e5e5',
                backgroundColor: isEvaluating ? '#fafafa' : '#ffffff',
                color: '#171717',
                transition: 'all 0.15s ease'
              }}
            />
          </div>

          {/* Load Saved Config (Dropdown Selector) */}
          {isLoading ? (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#171717' }}>
                Load Saved Configuration
              </label>
              <div className="w-full px-4 py-2 rounded-md border text-sm" style={{
                borderColor: '#e5e5e5',
                backgroundColor: '#fafafa',
                color: '#737373',
              }}>
                Loading configurations...
              </div>
            </div>
          ) : savedConfigs.length > 0 ? (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#171717' }}>
                Load Saved Configuration
              </label>
              <select
                value={selectedConfigId}
                onChange={(e) => handleConfigSelect(e.target.value)}
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none"
                style={{
                  borderColor: '#e5e5e5',
                  backgroundColor: isEvaluating ? '#fafafa' : '#ffffff',
                  color: '#171717',
                  transition: 'all 0.15s ease'
                }}
              >
                <option value="">+ New Config</option>
                {savedConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} v{config.version} • {config.provider}/{config.modelName} • T:{config.temperature}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: '#737373' }}>
                Select a saved config to load or create a new one
              </p>
            </div>
          ) : null}

          {/* Prompt Instructions */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#171717' }}>
              Prompt Instructions <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => onInstructionsChange(e.target.value)}
              placeholder="System instructions for the model"
              rows={10}
              disabled={isEvaluating}
              className="w-full px-4 py-3 rounded-md border text-sm focus:outline-none font-mono"
              style={{
                borderColor: instructions ? '#171717' : '#e5e5e5',
                backgroundColor: isEvaluating ? '#fafafa' : '#ffffff',
                color: '#171717',
                transition: 'all 0.15s ease'
              }}
            />
          </div>

          {/* Model Info (Read-only display) */}
          <div className="border rounded-lg p-4" style={{ backgroundColor: '#fafafa', borderColor: '#e5e5e5' }}>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: '#737373' }}>Provider</div>
                <div className="font-medium" style={{ color: '#171717' }}>{provider}</div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: '#737373' }}>Model</div>
                <div className="font-medium" style={{ color: '#171717' }}>{modelName}</div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: '#737373' }}>Temperature</div>
                <div className="font-medium" style={{ color: '#171717' }}>{temperature.toFixed(2)}</div>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: '#737373' }}>
              💡 Click "⚙️ Config" to edit model settings, save configs, or compare versions
            </p>
          </div>
        </div>
      </div>

      {/* Config Drawer */}
      <ConfigDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        savedConfigs={savedConfigs}
        currentConfig={{
          name: configName,
          instructions,
          modelName,
          provider,
          temperature,
          vectorStoreIds,
          tools,
          commitMessage,
        }}
        selectedConfigId={selectedConfigId}
        onConfigChange={handleConfigChange}
        onSaveConfig={handleSaveConfig}
        onLoadConfig={handleLoadConfig}
        onApplyConfig={handleApplyConfig}
      />
    </>
  );
}
