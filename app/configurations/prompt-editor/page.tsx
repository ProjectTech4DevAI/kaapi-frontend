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
import ValidatorListPane, { Validator, AVAILABLE_VALIDATORS } from '@/app/components/prompt-editor/ValidatorListPane';
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

  // Guardrails state
  const [isGuardrailsMode, setIsGuardrailsMode] = useState<boolean>(false);
  const [selectedValidator, setSelectedValidator] = useState<string | null>(null);
  const [savedValidators, setSavedValidators] = useState<Validator[]>([]);

  // Mapping from backend validator type to frontend validator id
  const VALIDATOR_TYPE_TO_ID: Record<string, string> = {
    'pii_remover': 'detect-pii',
    'uli_slur_match': 'lexical-slur-match',
    'gender_assumption_bias': 'gender-assumption-bias',
    'ban_list': 'ban-list',
    'topic_relevance': 'topic-relevance',
  };

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

        // Load guardrails if this config has them
        if (targetConfig.hasGuardrails) {
          const apiKey = getApiKey();
          if (apiKey) {
            fetch(`/api/configs/${targetConfig.config_id}/versions/${targetConfig.version}`, {
              headers: { 'X-API-KEY': apiKey },
            })
              .then(res => res.json())
              .then(data => {
                if (data.success && data.data && data.data.config_blob) {
                  loadGuardrailsFromConfig(data.data.config_blob);
                }
              })
              .catch(error => console.error('Failed to load guardrails:', error));
          }
        } else {
          setSavedValidators([]);
        }

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

      // Build guardrails arrays from saved validators
      console.log('[DEBUG] Saved validators:', savedValidators);

      const inputGuardrails = savedValidators
        .filter(v => (v.config?.stage || 'input') === 'input' && v.validator_config_id)
        .map(v => ({ validator_config_id: v.validator_config_id! }));

      const outputGuardrails = savedValidators
        .filter(v => v.config?.stage === 'output' && v.validator_config_id)
        .map(v => ({ validator_config_id: v.validator_config_id! }));

      console.log('[DEBUG] Input guardrails:', inputGuardrails);
      console.log('[DEBUG] Output guardrails:', outputGuardrails);

      const configBlob: any = {
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
        // Include guardrails if any validators are configured
        ...(inputGuardrails.length > 0 && { input_guardrails: inputGuardrails }),
        ...(outputGuardrails.length > 0 && { output_guardrails: outputGuardrails }),
      };

      console.log('[DEBUG] Config blob being sent:', JSON.stringify(configBlob, null, 2));

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
  const handleLoadConfigById = async (configId: string) => {
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
      setSavedValidators([]);
      return;
    }

    const config = savedConfigs.find(c => c.id === configId);
    if (!config) return;

    setCurrentContent(config.promptContent);
    setCurrentConfigBlob({
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
    });
    setProvider(config.provider);
    setTemperature(config.temperature);
    setSelectedConfigId(config.id);
    setCurrentConfigName(config.name);
    setCurrentConfigParentId(config.config_id);
    setCurrentConfigVersion(config.version);
    setTools(config.tools || []);

    // Always fetch config blob to check for guardrails
    const apiKey = getApiKey();
    if (apiKey) {
      try {
        // Fetch full config version to get config_blob
        const response = await fetch(
          `/api/configs/${config.config_id}/versions/${config.version}`,
          {
            headers: { 'X-API-KEY': apiKey },
          }
        );
        const data = await response.json();
        if (data.success && data.data && data.data.config_blob) {
          await loadGuardrailsFromConfig(data.data.config_blob);
        } else {
          setSavedValidators([]);
        }
      } catch (error) {
        console.error('Failed to load guardrails:', error);
        setSavedValidators([]);
      }
    } else {
      setSavedValidators([]);
    }
  };

  // Guardrails handlers
  const handleEnterGuardrailsMode = () => {
    setIsGuardrailsMode(true);
    setSelectedValidator(null);
  };

  const handleExitGuardrailsMode = () => {
    setIsGuardrailsMode(false);
    setSelectedValidator(null);
  };

  const handleSelectValidator = (validatorId: string) => {
    setSelectedValidator(validatorId);
  };

  const handleSaveValidator = async (validator: Validator) => {
    // Get API key from localStorage
    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error('No API key found. Please add an API key in the Keystore.');
      return;
    }

    // Get guardrails token from localStorage
    const getGuardrailsToken = (): string | null => {
      try {
        const stored = localStorage.getItem('kaapi_api_keys');
        if (stored) {
          const keys = JSON.parse(stored);
          if (keys.length > 0 && keys[0].guardrails_token) {
            return keys[0].guardrails_token;
          }
        }
      } catch (e) {
        console.error('Failed to get guardrails token:', e);
      }
      return null;
    };

    const guardrailsToken = getGuardrailsToken();
    if (!guardrailsToken) {
      toast.error('No guardrails token found. Please add a guardrails token in the Keystore.');
      return;
    }

    try {
      // Get actual organization_id and project_id from API key verification
      const verifyResponse = await fetch('/api/apikeys/verify', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        toast.error('Failed to verify API key. Please check your credentials.');
        return;
      }

      const { organization_id, project_id } = verifyData.data;

      // Make API call to save validator configuration
      console.log('[DEBUG] Saving validator config:', JSON.stringify(validator.config, null, 2));
      console.log('[DEBUG] Request URL:', `/api/guardrails/validators/configs?organization_id=${organization_id}&project_id=${project_id}`);

      const response = await fetch(
        `/api/guardrails/validators/configs?organization_id=${organization_id}&project_id=${project_id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${guardrailsToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validator.config),
        }
      );

      console.log('[DEBUG] Response status:', response.status, response.statusText);

      // Try to parse response as JSON, fallback to text if it fails
      let data: any = {};
      const contentType = response.headers.get('content-type');
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.log('[DEBUG] Response text (non-JSON):', text);
          data = { error: text || 'Empty response' };
        }
      } catch (parseError) {
        console.error('[DEBUG] Failed to parse response:', parseError);
        const text = await response.text();
        console.log('[DEBUG] Raw response text:', text);
        data = { error: 'Failed to parse response' };
      }

      console.log('[DEBUG] Validator save response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('[DEBUG] Validator save failed with status:', response.status);
        console.error('[DEBUG] Response data:', data);
        toast.error(`Failed to save validator (${response.status}): ${data.error || data.detail || 'Unknown error'}`);
        return;
      }

      // Extract validator_config_id from response
      // Try multiple possible response structures
      const configId = data.id || data.validator_config_id || data.config_id || data.data?.id || data.data?.validator_config_id;

      console.log('[DEBUG] Extracted config ID:', configId);

      if (!configId) {
        console.error('[DEBUG] No config ID found in response. Full response:', data);
        toast.error('Validator saved but no ID returned from backend');
        return;
      }

      // Extract validator_config_id from response and add to validator
      const validatorWithId: Validator = {
        ...validator,
        validator_config_id: configId
      };

      console.log('[DEBUG] Validator with ID:', validatorWithId);

      // Add to local state on success
      setSavedValidators([...savedValidators, validatorWithId]);
      setSelectedValidator(null);
      toast.success(`Validator "${validator.name}" configured successfully!`);
    } catch (error) {
      console.error('Error saving validator:', error);
      toast.error('Failed to save validator configuration. Please try again.');
    }
  };

  const handleRemoveValidator = async (index: number) => {
    const validator = savedValidators[index];
    if (!validator || !validator.validator_config_id) {
      // No config ID, just remove from local state
      setSavedValidators(savedValidators.filter((_, i) => i !== index));
      return;
    }

    // Get API key and guardrails token
    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error('No API key found. Please add an API key in the Keystore.');
      return;
    }

    const getGuardrailsToken = (): string | null => {
      try {
        const stored = localStorage.getItem('kaapi_api_keys');
        if (stored) {
          const keys = JSON.parse(stored);
          if (keys.length > 0 && keys[0].guardrails_token) {
            return keys[0].guardrails_token;
          }
        }
      } catch (e) {
        console.error('Failed to get guardrails token:', e);
      }
      return null;
    };

    const guardrailsToken = getGuardrailsToken();
    if (!guardrailsToken) {
      toast.error('No guardrails token found. Please add a guardrails token in the Keystore.');
      return;
    }

    try {
      // Get organization and project IDs
      const verifyResponse = await fetch('/api/apikeys/verify', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyData.success) {
        toast.error('Failed to verify API key.');
        return;
      }

      const { organization_id, project_id } = verifyData.data;

      // Call DELETE API
      const response = await fetch(
        `/api/guardrails/validators/configs/${validator.validator_config_id}?organization_id=${organization_id}&project_id=${project_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${guardrailsToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast.error(`Failed to delete validator: ${data.error || 'Unknown error'}`);
        return;
      }

      // Remove from local state on success
      setSavedValidators(savedValidators.filter((_, i) => i !== index));
      toast.success(`Validator "${validator.name}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting validator:', error);
      toast.error('Failed to delete validator. Please try again.');
    }
  };

  // Load guardrails from config blob
  const loadGuardrailsFromConfig = async (configBlob: any) => {
    console.log('[DEBUG loadGuardrailsFromConfig] Config blob:', configBlob);
    const inputGuardrails = configBlob.input_guardrails || [];
    const outputGuardrails = configBlob.output_guardrails || [];

    console.log('[DEBUG loadGuardrailsFromConfig] Input guardrails:', inputGuardrails);
    console.log('[DEBUG loadGuardrailsFromConfig] Output guardrails:', outputGuardrails);

    const allGuardrailIds = [
      ...inputGuardrails.map((g: any) => ({ id: g.validator_config_id, stage: 'input' })),
      ...outputGuardrails.map((g: any) => ({ id: g.validator_config_id, stage: 'output' }))
    ];

    console.log('[DEBUG loadGuardrailsFromConfig] All guardrail IDs:', allGuardrailIds);

    if (allGuardrailIds.length === 0) {
      console.log('[DEBUG loadGuardrailsFromConfig] No guardrails found, clearing validators');
      setSavedValidators([]);
      return;
    }

    // Get API key and guardrails token
    const apiKey = getApiKey();
    if (!apiKey) return;

    const getGuardrailsToken = (): string | null => {
      try {
        const stored = localStorage.getItem('kaapi_api_keys');
        if (stored) {
          const keys = JSON.parse(stored);
          if (keys.length > 0 && keys[0].guardrails_token) {
            return keys[0].guardrails_token;
          }
        }
      } catch (e) {
        console.error('Failed to get guardrails token:', e);
      }
      return null;
    };

    const guardrailsToken = getGuardrailsToken();
    if (!guardrailsToken) {
      console.warn('No guardrails token found, cannot load validator details');
      return;
    }

    // Get organization and project IDs
    try {
      const verifyResponse = await fetch('/api/apikeys/verify', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyData.success) {
        console.error('Failed to verify API key');
        return;
      }

      const { organization_id, project_id } = verifyData.data;

      // Fetch all validator configs
      const validators: Validator[] = [];

      for (const { id: configId, stage } of allGuardrailIds) {
        try {
          console.log(`[DEBUG loadGuardrailsFromConfig] Fetching validator config ${configId} for stage ${stage}`);
          const response = await fetch(
            `/api/guardrails/validators/configs/${configId}?organization_id=${organization_id}&project_id=${project_id}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${guardrailsToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const data = await response.json();
          console.log(`[DEBUG loadGuardrailsFromConfig] Response for ${configId}:`, response.ok, data);

          if (response.ok && data && data.data) {
            const validatorData = data.data;

            // Map backend type to frontend validator id
            const backendType = validatorData.type || '';
            const validatorId = VALIDATOR_TYPE_TO_ID[backendType] || backendType;

            console.log(`[DEBUG loadGuardrailsFromConfig] Backend type: ${backendType}, Frontend ID: ${validatorId}`);

            // Find validator metadata from AVAILABLE_VALIDATORS
            const validatorMeta = AVAILABLE_VALIDATORS.find(v => v.id === validatorId);

            console.log(`[DEBUG loadGuardrailsFromConfig] Validator meta:`, validatorMeta);

            if (validatorMeta) {
              validators.push({
                id: validatorId,
                name: validatorMeta.name,
                description: validatorMeta.description,
                tags: validatorMeta.tags,
                validator_config_id: configId,
                config: {
                  ...validatorData,
                  stage: stage, // Ensure stage is set correctly
                }
              });
              console.log(`[DEBUG loadGuardrailsFromConfig] Added validator:`, validatorMeta.name);
            } else {
              console.warn(`[DEBUG loadGuardrailsFromConfig] No metadata found for validator ID: ${validatorId}`);
            }
          } else {
            // Validator config not found (likely deleted) - skip silently
            console.log(`[DEBUG loadGuardrailsFromConfig] Validator config ${configId} not found (may have been deleted), skipping`);
          }
        } catch (error) {
          console.error(`Failed to load validator config ${configId}:`, error);
        }
      }

      console.log('[DEBUG loadGuardrailsFromConfig] Loaded validators:', validators);
      setSavedValidators(validators);
    } catch (error) {
      console.error('Error loading guardrails:', error);
    }
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
                // Exit guardrails mode when loading a version
                setIsGuardrailsMode(false);
                setSelectedValidator(null);
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
                  // Exit guardrails mode when loading a version
                  setIsGuardrailsMode(false);
                  setSelectedValidator(null);
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Split View: Prompt (left) + Config (right) OR Validators (left) + Config (right) */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Left Panel - Conditionally render Prompt Editor or Validator List */}
                  <div
                    className="flex"
                    style={{
                      flex: '1 1 0%',
                      transition: 'flex 0.2s ease-in-out',
                    }}
                  >
                    {isGuardrailsMode ? (
                      <ValidatorListPane
                        selectedValidator={selectedValidator}
                        onSelectValidator={handleSelectValidator}
                      />
                    ) : (
                      <PromptEditorPane
                        currentContent={currentContent}
                        onContentChange={setCurrentContent}
                        currentBranch={currentConfigName || 'Unsaved'}
                      />
                    )}
                  </div>
                  {/* Right Panel - Config Editor */}
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
                    isGuardrailsMode={isGuardrailsMode}
                    onEnterGuardrailsMode={handleEnterGuardrailsMode}
                    onExitGuardrailsMode={handleExitGuardrailsMode}
                    selectedValidator={selectedValidator}
                    savedValidators={savedValidators}
                    onSaveValidator={handleSaveValidator}
                    onRemoveValidator={handleRemoveValidator}
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
