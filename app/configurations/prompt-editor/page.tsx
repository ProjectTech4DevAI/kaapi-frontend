/**
 * Prompt Editor - Version Controlled Prompt + Config Editor
 *
 * A WYSIWYG editor for managing prompts and configs with linear versioning.
 * Features: save, load, compare configs with backend persistence.
 * Uses shared useConfigs hook for caching.
 * Supports URL query params for cross-navigation from Config Library/Evaluations.
 */

"use client"
import React, { useState, useEffect, Suspense, useRef } from 'react';
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
  const urlValidators = searchParams.get('validators'); // Comma-separated validator_config_ids

  // Evaluation context to preserve (when coming from evaluations page)
  const urlDatasetId = searchParams.get('dataset');
  const urlExperimentName = searchParams.get('experiment');
  const fromEvaluations = searchParams.get('from') === 'evaluations';

  // Default config for new versions
  const defaultConfig: ConfigBlob = {
    completion: {
      provider: 'openai',
      type: 'text',
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

  // Guardrails validators state
  const [savedValidators, setSavedValidators] = useState<any[]>([]);
  const isLoadingFromUrl = useRef<boolean>(false);

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

        // Parse config blob to extract guardrails if present
        const loadedConfigBlob: any = {
          completion: {
            provider: targetConfig.provider as any,
            params: {
              model: targetConfig.modelName,
              instructions: targetConfig.instructions,
              temperature: targetConfig.temperature,
              tools: targetConfig.tools || [],
            },
          },
        };

        // Check if this config has guardrails in the blob
        // Note: SavedConfig type needs to be checked for these fields
        const savedConfig = targetConfig as any;

        if (savedConfig.input_guardrails || savedConfig.output_guardrails) {
          console.log('[DEBUG] Found guardrails in saved config');
          // Store guardrails in the blob for later saving
          if (savedConfig.input_guardrails) {
            loadedConfigBlob.input_guardrails = savedConfig.input_guardrails;
          }
          if (savedConfig.output_guardrails) {
            loadedConfigBlob.output_guardrails = savedConfig.output_guardrails;
          }
        } else {
          console.log('[DEBUG] No guardrails found in saved config');
        }

        console.log('[DEBUG] Final loadedConfigBlob:', loadedConfigBlob);
        setCurrentConfigBlob(loadedConfigBlob);
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

  // Load validators from config blob
  useEffect(() => {
    const loadValidators = async () => {
      // Skip if we're currently loading from URL parameters
      if (isLoadingFromUrl.current) {
        console.log('[ValidatorLoad] Skipping - loading from URL');
        return;
      }

      try {
        // Check if the config blob has guardrails
        const inputGuardrails = (currentConfigBlob as any).input_guardrails || [];
        const outputGuardrails = (currentConfigBlob as any).output_guardrails || [];

        if (inputGuardrails.length === 0 && outputGuardrails.length === 0) {
          setSavedValidators([]);
          return;
        }

        const apiKey = getApiKey();
        if (!apiKey) {
          console.error('[ValidatorLoad] No API key found');
          setSavedValidators([]);
          return;
        }

        // Get organization_id and project_id
        const verifyResponse = await fetch('/api/apikeys/verify', {
          method: 'GET',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!verifyResponse.ok) {
          console.error('[ValidatorLoad] Failed to verify API key');
          setSavedValidators([]);
          return;
        }

        const verifyData = await verifyResponse.json();
        const organizationId = verifyData.data?.organization_id;
        const projectId = verifyData.data?.project_id;

        if (!organizationId || !projectId) {
          console.error('[ValidatorLoad] Could not retrieve organization or project ID');
          setSavedValidators([]);
          return;
        }

        const queryParams = new URLSearchParams({
          organization_id: organizationId,
          project_id: projectId,
        });

        // Fetch all validators from both input and output guardrails
        const allGuardrails = [
          ...inputGuardrails.map((g: any) => ({ ...g, stage: 'input' })),
          ...outputGuardrails.map((g: any) => ({ ...g, stage: 'output' })),
        ];

        const validatorPromises = allGuardrails.map(async (guardrail: any) => {
          try {
            const response = await fetch(
              `/api/guardrails/validators/configs/${guardrail.validator_config_id}?${queryParams.toString()}`
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                // Map backend response to validator format
                return {
                  id: data.data.type,
                  name: data.data.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                  description: 'Configured guardrail',
                  enabled: data.data.is_enabled !== undefined ? data.data.is_enabled : true,
                  validator_config_id: guardrail.validator_config_id,
                  config: {
                    stage: guardrail.stage,
                    type: data.data.type,
                    ...data.data,
                  }
                };
              }
            }
          } catch (error) {
            console.error(`[ValidatorLoad] Failed to fetch validator ${guardrail.validator_config_id}:`, error);
          }
          return null;
        });

        const fetchedValidators = await Promise.all(validatorPromises);
        const validValidators = fetchedValidators.filter(v => v !== null);
        console.log('[ValidatorLoad] Loaded validators from config blob:', validValidators.length, validValidators);
        setSavedValidators(validValidators);
      } catch (e) {
        console.error('Failed to load validators:', e);
        setSavedValidators([]);
      }
    };

    loadValidators();
  }, [currentConfigBlob]);

  // Handle validators from URL query param (when returning from safety-guardrails page)
  useEffect(() => {
    const fetchValidatorsFromUrl = async () => {
      // If urlValidators is null/undefined, don't do anything (not returning from guardrails page)
      // If urlValidators is empty string, it means all validators were removed
      if (urlValidators === null || urlValidators === undefined) {
        isLoadingFromUrl.current = false;
        return;
      }

      // Set flag to prevent config blob effect from interfering
      isLoadingFromUrl.current = true;

      // Handle empty validators (all removed)
      if (urlValidators === '') {
        setSavedValidators([]);
        setCurrentConfigBlob(prev => {
          const updated = { ...prev };
          delete (updated as any).input_guardrails;
          delete (updated as any).output_guardrails;
          return updated;
        });
        console.log('[ValidatorURL] All validators removed from config');
        // Reset flag after a longer delay to ensure config blob updates are complete
        setTimeout(() => {
          isLoadingFromUrl.current = false;
          console.log('[ValidatorURL] Reset loading flag');
        }, 500);
        return;
      }

      const apiKey = getApiKey();
      if (!apiKey) {
        console.error('[ValidatorURL] No API key found');
        return;
      }

      try {
        // Get organization_id and project_id
        const verifyResponse = await fetch('/api/apikeys/verify', {
          method: 'GET',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (!verifyResponse.ok) {
          console.error('[ValidatorURL] Failed to verify API key');
          return;
        }

        const verifyData = await verifyResponse.json();
        const organizationId = verifyData.data?.organization_id;
        const projectId = verifyData.data?.project_id;

        if (!organizationId || !projectId) {
          console.error('[ValidatorURL] Could not retrieve organization or project ID');
          return;
        }

        // Parse validator IDs from URL
        const validatorIds = urlValidators.split(',').filter(id => id.trim());

        const queryParams = new URLSearchParams({
          organization_id: organizationId,
          project_id: projectId,
        });

        // Fetch each validator from backend
        const validatorPromises = validatorIds.map(async (validatorId) => {
          try {
            const response = await fetch(
              `/api/guardrails/validators/configs/${validatorId}?${queryParams.toString()}`
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                // Map backend response to validator format
                return {
                  id: data.data.type,
                  name: data.data.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                  description: 'Configured guardrail',
                  enabled: data.data.is_enabled !== undefined ? data.data.is_enabled : true,
                  validator_config_id: validatorId,
                  config: {
                    stage: data.data.stage || 'input',
                    type: data.data.type,
                    ...data.data,
                  }
                };
              }
            }
          } catch (error) {
            console.error(`[ValidatorURL] Failed to fetch validator ${validatorId}:`, error);
          }
          return null;
        });

        const fetchedValidators = await Promise.all(validatorPromises);
        const validValidators = fetchedValidators.filter(v => v !== null);

        console.log('[ValidatorURL] Fetched validators from URL:', validValidators.length, validValidators);

        if (validValidators.length > 0) {
          setSavedValidators(validValidators);

          // IMPORTANT: Update the currentConfigBlob with the new validators
          // This ensures the changes are detected and can be saved as a new version
          const inputGuardrails = validValidators
            .filter(v => (v.config?.stage || 'input') === 'input' && v.validator_config_id)
            .map(v => ({ validator_config_id: v.validator_config_id }));

          const outputGuardrails = validValidators
            .filter(v => v.config?.stage === 'output' && v.validator_config_id)
            .map(v => ({ validator_config_id: v.validator_config_id }));

          setCurrentConfigBlob(prev => ({
            ...prev,
            ...(inputGuardrails.length > 0 ? { input_guardrails: inputGuardrails } : {}),
            ...(outputGuardrails.length > 0 ? { output_guardrails: outputGuardrails } : {}),
          }));

          console.log('[ValidatorURL] Updated config blob with validators from URL');
        } else {
          // No validators in URL - remove guardrails from config blob
          setSavedValidators([]);
          setCurrentConfigBlob(prev => {
            const updated = { ...prev };
            delete (updated as any).input_guardrails;
            delete (updated as any).output_guardrails;
            return updated;
          });
          console.log('[ValidatorURL] Removed all guardrails from config blob');
        }

        // Reset flag after a longer delay to ensure config blob updates are complete
        setTimeout(() => {
          isLoadingFromUrl.current = false;
          console.log('[ValidatorURL] Reset loading flag');
        }, 500);
      } catch (error) {
        console.error('[ValidatorURL] Error fetching validators from URL:', error);
        isLoadingFromUrl.current = false;
      }
    };

    fetchValidatorsFromUrl();
  }, [urlValidators]);

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

    // Build comparison config including guardrails if present
    const savedConfigForComparison: any = {
      completion: {
        provider: selectedConfig.provider as any,
        params: {
          model: selectedConfig.modelName,
          instructions: selectedConfig.instructions,
          temperature: selectedConfig.temperature,
          tools: selectedConfig.tools || [],
        },
      },
    };

    // Include guardrails from saved config for proper comparison
    const savedConfigAny = selectedConfig as any;
    if (savedConfigAny.input_guardrails) {
      savedConfigForComparison.input_guardrails = savedConfigAny.input_guardrails;
    }
    if (savedConfigAny.output_guardrails) {
      savedConfigForComparison.output_guardrails = savedConfigAny.output_guardrails;
    }

    const configChanged = hasConfigChanges(currentConfigBlob, savedConfigForComparison);

    setHasUnsavedChanges(promptChanged || configChanged);
  }, [selectedConfigId, currentContent, currentConfigBlob, provider, temperature, tools, savedConfigs, savedValidators]);

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
      // Extract tools array and flatten to direct params fields for backend compatibility
      const tools = currentConfigBlob.completion.params.tools || [];

      // Collect ALL knowledge_base_ids from ALL tools into a single array
      const allKnowledgeBaseIds: string[] = [];
      let maxNumResults = 20; // default

      tools.forEach((tool) => {
        // Add all knowledge_base_ids from this tool
        allKnowledgeBaseIds.push(...tool.knowledge_base_ids);
        // Use max_num_results from first tool (could be made configurable)
        if (allKnowledgeBaseIds.length === tool.knowledge_base_ids.length) {
          maxNumResults = tool.max_num_results;
        }
      });

      // IMPORTANT: Only include validators that are enabled (toggle is ON)
      const inputGuardrails = savedValidators
        .filter(v => (v.config?.stage || 'input') === 'input' && v.validator_config_id && v.enabled !== false)
        .map(v => ({ validator_config_id: v.validator_config_id! }));

      const outputGuardrails = savedValidators
        .filter(v => v.config?.stage === 'output' && v.validator_config_id && v.enabled !== false)
        .map(v => ({ validator_config_id: v.validator_config_id! }));


      const configBlob: ConfigBlob = {
        completion: {
          provider: currentConfigBlob.completion.provider,
          type: currentConfigBlob.completion.type || 'text', // Default to 'text'
          params: {
            model: currentConfigBlob.completion.params.model,
            instructions: currentContent, // Store prompt as instructions
            temperature: currentConfigBlob.completion.params.temperature,
            // Flatten tools array to direct fields for backend - support multiple knowledge bases
            ...(allKnowledgeBaseIds.length > 0 && {
              knowledge_base_ids: allKnowledgeBaseIds,
              max_num_results: maxNumResults,
            }),
          },
        },

        // IMPORTANT: Always send guardrails fields - use empty arrays if no validators
        // This ensures the backend removes validators that were toggled off
        input_guardrails: inputGuardrails.length > 0 ? inputGuardrails : [],
        output_guardrails: outputGuardrails.length > 0 ? outputGuardrails : [],
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

    // Build config blob with guardrails if present
    const loadedConfigBlob: any = {
      completion: {
        provider: config.provider as any,
        type: config.type,
        params: {
          model: config.modelName,
          instructions: config.instructions,
          temperature: config.temperature,
          tools: config.tools || [],
        },
      },
    };

    // Include guardrails if present
    const savedConfig = config as any;
    if (savedConfig.input_guardrails) {
      loadedConfigBlob.input_guardrails = savedConfig.input_guardrails;
    }
    if (savedConfig.output_guardrails) {
      loadedConfigBlob.output_guardrails = savedConfig.output_guardrails;
    }

    setCurrentConfigBlob(loadedConfigBlob);
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
                    savedValidators={savedValidators}
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
