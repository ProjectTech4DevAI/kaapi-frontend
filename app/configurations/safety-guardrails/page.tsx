"use client"

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { colors } from '@/app/lib/colors';
import Sidebar from '@/app/components/Sidebar';
import ValidatorListPane, { Validator, AVAILABLE_VALIDATORS } from '@/app/components/prompt-editor/ValidatorListPane';
import { useToast } from '@/app/components/Toast';

export default function SafetyGuardrailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configId = searchParams?.get('config_id');
  const versionParam = searchParams?.get('version');
  const toast = useToast();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState<string | null>(null);
  const [validatorConfig, setValidatorConfig] = useState<any>({});
  const [savedValidators, setSavedValidators] = useState<Validator[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingValidatorIndex, setEditingValidatorIndex] = useState<number | null>(null);
  const [editingValidatorId, setEditingValidatorId] = useState<string | null>(null);
  const [banLists, setBanLists] = useState<any[]>([]);
  const [showCreateBanListModal, setShowCreateBanListModal] = useState(false);
  const [newBanList, setNewBanList] = useState({ name: '', description: '', banned_words: '', domain: '', is_public: false });

  // Combined fetch: get validators from config AND all org validators
  const fetchAllValidators = useCallback(async () => {
    try {
      const stored = localStorage.getItem('kaapi_api_keys');
      if (!stored) {
        console.log('[SafetyGuardrails] No API key found');
        return;
      }

      const keys = JSON.parse(stored);
      if (keys.length === 0 || !keys[0].key) {
        console.log('[SafetyGuardrails] No valid API key found');
        return;
      }

      const apiKey = keys[0].key;

      // Get organization_id and project_id
      const verifyResponse = await fetch('/api/apikeys/verify', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!verifyResponse.ok) {
        console.error('[SafetyGuardrails] Failed to verify API key');
        return;
      }

      const verifyData = await verifyResponse.json();
      const organizationId = verifyData.data?.organization_id;
      const projectId = verifyData.data?.project_id;

      if (!organizationId || !projectId) {
        console.error('[SafetyGuardrails] Could not retrieve organization or project ID');
        return;
      }

      const queryParams = new URLSearchParams({
        organization_id: organizationId,
        project_id: projectId,
      });

      // Step 1: Fetch ALL validator configs for this org/project
      const allValidatorsResponse = await fetch(`/api/guardrails/validators/configs?${queryParams.toString()}`);
      const allValidatorsData = await allValidatorsResponse.json();

      const allValidatorConfigs: Validator[] = [];
      if (allValidatorsData.success && allValidatorsData.data) {
        for (const validatorConfig of allValidatorsData.data) {
          const validatorType = validatorConfig.type;
          const validatorInfo = AVAILABLE_VALIDATORS.find(v =>
            v.id === validatorType.replace('_', '-') ||
            v.id === 'ban-list' && validatorType === 'ban_list' ||
            v.id === 'detect-pii' && validatorType === 'pii_remover' ||
            v.id === 'lexical-slur-match' && validatorType === 'uli_slur_match' ||
            v.id === 'gender-assumption-bias' && validatorType === 'gender_assumption_bias'
          );

          if (validatorInfo) {
            allValidatorConfigs.push({
              id: validatorInfo.id,
              name: validatorInfo.name,
              description: validatorInfo.description,
              enabled: false, // Default to OFF
              validator_config_id: validatorConfig.id,
              config: validatorConfig,
            });
          }
        }
      }

      console.log('[SafetyGuardrails] Fetched all validator configs:', allValidatorConfigs);

      // Step 2: If viewing a specific config, get validators from that config
      let configValidatorIds = new Set<string>();
      if (configId) {
        const configResponse = await fetch(`/api/configs/${configId}/versions`, {
          headers: { 'X-API-KEY': apiKey },
        });

        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.success && configData.data && configData.data.length > 0) {
            // Get the specified version or latest version
            let targetVersion: any;
            if (versionParam) {
              targetVersion = configData.data.find((v: any) => v.version === parseInt(versionParam));
              if (!targetVersion) {
                console.warn('[SafetyGuardrails] Specified version not found, using latest');
                targetVersion = configData.data[0];
              }
            } else {
              targetVersion = configData.data[0];
            }

            // Fetch the full version details
            const versionResponse = await fetch(`/api/configs/${configId}/versions/${targetVersion.version}`, {
              headers: { 'X-API-KEY': apiKey },
            });

            if (versionResponse.ok) {
              const versionData = await versionResponse.json();
              if (versionData.success && versionData.data) {
                const configBlob = versionData.data.config_blob;
                const inputGuardrails = configBlob.input_guardrails || [];
                const outputGuardrails = configBlob.output_guardrails || [];

                // Collect all validator_config_ids from this config
                configValidatorIds = new Set([
                  ...inputGuardrails.map((g: any) => g.validator_config_id),
                  ...outputGuardrails.map((g: any) => g.validator_config_id),
                ]);

                console.log('[SafetyGuardrails] Config has these validators:', Array.from(configValidatorIds));
              }
            }
          }
        }
      }

      // Step 3: Merge - show all org validators, with toggles ON for ones in this config
      const mergedValidators = allValidatorConfigs.map(validator => ({
        ...validator,
        enabled: configValidatorIds.has(validator.validator_config_id!),
      }));

      console.log('[SafetyGuardrails] Final merged validators:', mergedValidators);
      setSavedValidators(mergedValidators);
    } catch (error) {
      console.error('[SafetyGuardrails] Error fetching validators:', error);
    }
  }, [configId, versionParam]);

  useEffect(() => {
    fetchAllValidators();
  }, [fetchAllValidators]);

  // Fetch ban lists when ban-list validator is selected
  useEffect(() => {
    if ((selectedValidator === 'ban-list' || editingValidatorId === 'ban-list')) {
      fetchBanLists();
    }
  }, [selectedValidator, editingValidatorId]);

  const fetchBanLists = async () => {
    try {
      const stored = localStorage.getItem('kaapi_api_keys');
      if (!stored) return;

      const keys = JSON.parse(stored);
      if (keys.length === 0 || !keys[0].key) return;

      const apiKey = keys[0].key;

      const response = await fetch('/api/guardrails/ban_lists', {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBanLists(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ban lists:', error);
    }
  };

  const handleCreateBanList = async () => {
    try {
      const stored = localStorage.getItem('kaapi_api_keys');
      if (!stored) {
        toast.error('No API key found. Please add an API key first.');
        return;
      }

      const keys = JSON.parse(stored);
      if (keys.length === 0 || !keys[0].key) {
        toast.error('No API key found. Please add an API key first.');
        return;
      }

      const apiKey = keys[0].key;

      const bannedWordsArray = newBanList.banned_words
        .split(/[\n,]+/)
        .map(word => word.trim())
        .filter(word => word.length > 0);

      const payload = {
        name: newBanList.name,
        description: newBanList.description,
        banned_words: bannedWordsArray,
        domain: newBanList.domain,
        is_public: newBanList.is_public,
      };

      const response = await fetch('/api/guardrails/ban_lists', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Ban list "${newBanList.name}" created successfully!`);
        await fetchBanLists();
        if (data.data && data.data.id) {
          setValidatorConfig({ ...validatorConfig, ban_list_id: data.data.id });
        }
        setNewBanList({ name: '', description: '', banned_words: '', domain: '', is_public: false });
        setShowCreateBanListModal(false);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create ban list: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating ban list:', error);
      toast.error('Failed to create ban list. Please try again.');
    }
  };

  const handleSaveValidator = async (validator: Validator) => {
    try {
      const stored = localStorage.getItem('kaapi_api_keys');
      if (!stored) {
        toast.error('No API key found. Please add an API key first.');
        return;
      }

      const keys = JSON.parse(stored);
      if (keys.length === 0 || !keys[0].key) {
        toast.error('No API key found. Please add an API key first.');
        return;
      }

      const apiKey = keys[0].key;

      // First, verify the API key to get organization_id and project_id
      const verifyResponse = await fetch('/api/apikeys/verify', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!verifyResponse.ok) {
        toast.error('Failed to verify API key.');
        return;
      }

      const verifyData = await verifyResponse.json();
      const organizationId = verifyData.data?.organization_id;
      const projectId = verifyData.data?.project_id;

      if (!organizationId || !projectId) {
        toast.error('Could not retrieve organization or project ID.');
        return;
      }

      // Build the request body with is_enabled field
      const requestBody = {
        type: validator.config.type,
        stage: validator.config.stage,
        is_enabled: validator.enabled !== undefined ? validator.enabled : true,
        ...validator.config,
      };

      // Create validator config via API with query parameters
      const queryParams = new URLSearchParams({
        organization_id: organizationId,
        project_id: projectId,
      });

      const response = await fetch(`/api/guardrails/validators/configs?${queryParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed to save validator: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();

      if (data.success && data.data && data.data.id) {
        // Add validator_config_id to the validator
        const validatorWithId = {
          ...validator,
          validator_config_id: data.data.id,
        };

        setSavedValidators([...savedValidators, validatorWithId]);
        setSelectedValidator(null);
      } else {
        toast.error('Failed to save validator configuration.');
      }
    } catch (error) {
      console.error('Error saving validator:', error);
      toast.error('Failed to save validator. Please try again.');
    }
  };

  const handleRemoveValidator = async (index: number) => {
    const validator = savedValidators[index];
    if (!validator || !validator.validator_config_id) {
      // If no validator_config_id, just remove from local state
      setSavedValidators(savedValidators.filter((_, i) => i !== index));
      return;
    }

    try {
      const stored = localStorage.getItem('kaapi_api_keys');
      if (!stored) {
        toast.error('No API key found. Please add an API key first.');
        return;
      }

      const keys = JSON.parse(stored);
      if (keys.length === 0 || !keys[0].key) {
        toast.error('No API key found. Please add an API key first.');
        return;
      }

      const apiKey = keys[0].key;

      // Get organization_id and project_id
      const verifyResponse = await fetch('/api/apikeys/verify', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!verifyResponse.ok) {
        toast.error('Failed to verify API key.');
        return;
      }

      const verifyData = await verifyResponse.json();
      const organizationId = verifyData.data?.organization_id;
      const projectId = verifyData.data?.project_id;

      if (!organizationId || !projectId) {
        toast.error('Could not retrieve organization or project ID.');
        return;
      }

      const queryParams = new URLSearchParams({
        organization_id: organizationId,
        project_id: projectId,
      });

      // Delete validator config via API
      const response = await fetch(
        `/api/guardrails/validators/configs/${validator.validator_config_id}?${queryParams.toString()}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed to delete validator: ${errorData.error || 'Unknown error'}`);
        return;
      }

      // Remove from local state after successful deletion
      const updatedValidators = savedValidators.filter((_, i) => i !== index);
      setSavedValidators(updatedValidators);

      toast.success(`Validator "${validator.name}" deleted successfully! Click "Save Configuration" in the main editor to persist changes.`);
    } catch (error) {
      console.error('Error deleting validator:', error);
      toast.error('Failed to delete validator. Please try again.');
    }
  };

  const handleToggleValidator = (index: number) => {
    const updatedValidators = [...savedValidators];
    const newEnabledState = !updatedValidators[index].enabled;
    updatedValidators[index] = {
      ...updatedValidators[index],
      enabled: newEnabledState,
    };
    console.log('[SafetyGuardrails] Toggled validator:', {
      name: updatedValidators[index].name,
      enabled: newEnabledState,
      validator_config_id: updatedValidators[index].validator_config_id
    });
    setSavedValidators(updatedValidators);
  };

  const handleEditValidator = (index: number) => {
    const validator = savedValidators[index];
    setEditingValidatorIndex(index);
    setEditingValidatorId(validator.id);
    setValidatorConfig(validator.config);
    setSelectedValidator(null);
    setIsEditMode(false); // Exit edit mode when viewing a validator
  };

  const handleGoBack = () => {
    // Build URL with validator IDs to pass back to main editor
    // Only include validators that are enabled (toggle is ON)
    const enabledValidators = savedValidators.filter(v => v.validator_config_id && v.enabled !== false);
    const validatorIds = enabledValidators.map(v => v.validator_config_id).join(',');

    console.log('[SafetyGuardrails] Going back with validators:', {
      total: savedValidators.length,
      enabled: enabledValidators.length,
      validators: enabledValidators,
      ids: validatorIds
    });

    // Always include &validators param to signal we're returning from guardrails page
    // Even if empty, this tells the main editor to update the config blob
    const url = configId
      ? `/configurations/prompt-editor?config=${configId}&validators=${validatorIds}`
      : `/configurations/prompt-editor?validators=${validatorIds}`;

    router.push(url);
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.primary }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/configurations" />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Section */}
          <div className="border-b px-6 py-4" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md transition-colors flex-shrink-0"
                style={{
                  borderWidth: '1px',
                  borderColor: colors.border,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {sidebarCollapsed ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  )}
                </svg>
              </button>
              <div className="flex-1">
                <h1 className="text-l font-semibold" style={{ color: colors.text.primary }}>Safety Guardrails</h1>
                <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>Configure validators for your AI configuration</p>
              </div>
              <button
                onClick={handleGoBack}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                style={{
                  borderWidth: '1px',
                  borderColor: colors.border,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Main Editor
              </button>
            </div>
          </div>

          {/* Content Area - Three Column Layout */}
          <div className="flex-1 overflow-hidden flex" style={{ backgroundColor: colors.bg.primary }}>
            {/* Left: Validator List */}
            <div style={{ width: '300px', borderColor: colors.border }} className="border-r flex-shrink-0 overflow-hidden">
              <ValidatorListPane
                selectedValidator={selectedValidator}
                onSelectValidator={setSelectedValidator}
              />
            </div>

            {/* Middle: Configuration Panel */}
            <div className="flex-1 overflow-hidden flex flex-col border-r" style={{ borderColor: colors.border, minWidth: '400px' }}>
              {/* Header */}
              <div className="border-b px-6 py-4 flex-shrink-0" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}>
                <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                  {(selectedValidator || editingValidatorId)
                    ? `${AVAILABLE_VALIDATORS.find(v => v.id === (editingValidatorId || selectedValidator))?.name} Configuration`
                    : 'Validator Configuration'
                  }
                </h3>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
              {/* Validator Configuration Form */}
              {(selectedValidator || editingValidatorId) && (
                <div>
                  <div
                    className="p-4 rounded-lg space-y-3"
                    style={{
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.bg.secondary,
                    }}
                  >
                    {/* Detect PII Validator */}
                    {(editingValidatorId || selectedValidator) === 'detect-pii' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Stage
                          </label>
                          <select
                            value={validatorConfig.stage || 'input'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, stage: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="input">Input</option>
                            <option value="output">Output</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            On Fail Action
                          </label>
                          <select
                            value={validatorConfig.on_fail_action || 'fix'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, on_fail_action: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="fix">Fix</option>
                            <option value="exception">Exception</option>
                            <option value="rephrase">Rephrase</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                            <input
                              type="checkbox"
                              checked={validatorConfig.is_enabled !== undefined ? validatorConfig.is_enabled : true}
                              onChange={(e) => setValidatorConfig({ ...validatorConfig, is_enabled: e.target.checked })}
                              style={{ accentColor: colors.accent.primary }}
                            />
                            Enabled
                          </label>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Entity Types
                          </label>
                          <div className="space-y-2">
                            {['PERSON', 'PHONE_NUMBER', 'IN_AADHAAR', 'EMAIL_ADDRESS', 'CREDIT_CARD', 'IP_ADDRESS'].map((entity) => (
                              <label key={entity} className="flex items-center gap-2 text-xs" style={{ color: colors.text.primary }}>
                                <input
                                  type="checkbox"
                                  checked={(validatorConfig.entity_types || ['PERSON', 'PHONE_NUMBER', 'IN_AADHAAR']).includes(entity)}
                                  onChange={(e) => {
                                    const current = validatorConfig.entity_types || ['PERSON', 'PHONE_NUMBER', 'IN_AADHAAR'];
                                    const updated = e.target.checked
                                      ? [...current, entity]
                                      : current.filter((t: string) => t !== entity);
                                    setValidatorConfig({ ...validatorConfig, entity_types: updated });
                                  }}
                                  style={{ accentColor: colors.accent.primary }}
                                />
                                {entity}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Threshold: {(validatorConfig.threshold !== undefined ? validatorConfig.threshold : 0.6).toFixed(1)}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={validatorConfig.threshold !== undefined ? validatorConfig.threshold : 0.6}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, threshold: parseFloat(e.target.value) })}
                            className="w-full"
                            style={{ accentColor: colors.accent.primary }}
                          />
                        </div>
                      </>
                    )}

                    {/* Lexical Slur Match Validator */}
                    {(editingValidatorId || selectedValidator) === 'lexical-slur-match' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Stage
                          </label>
                          <select
                            value={validatorConfig.stage || 'input'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, stage: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="input">Input</option>
                            <option value="output">Output</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            On Fail Action
                          </label>
                          <select
                            value={validatorConfig.on_fail_action || 'fix'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, on_fail_action: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="fix">Fix</option>
                            <option value="exception">Exception</option>
                            <option value="rephrase">Rephrase</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                            <input
                              type="checkbox"
                              checked={validatorConfig.enabled !== undefined ? validatorConfig.enabled : true}
                              onChange={(e) => setValidatorConfig({ ...validatorConfig, enabled: e.target.checked })}
                              style={{ accentColor: colors.accent.primary }}
                            />
                            Enabled
                          </label>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Languages
                          </label>
                          <div className="space-y-2">
                            {['en', 'hi'].map((lang) => (
                              <label key={lang} className="flex items-center gap-2 text-xs" style={{ color: colors.text.primary }}>
                                <input
                                  type="checkbox"
                                  checked={(validatorConfig.languages || ['en', 'hi']).includes(lang)}
                                  onChange={(e) => {
                                    const current = validatorConfig.languages || ['en', 'hi'];
                                    const updated = e.target.checked
                                      ? [...current, lang]
                                      : current.filter((l: string) => l !== lang);
                                    setValidatorConfig({ ...validatorConfig, languages: updated });
                                  }}
                                  style={{ accentColor: colors.accent.primary }}
                                />
                                {lang === 'en' ? 'English' : 'Hindi'}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Severity
                          </label>
                          <input
                            type="text"
                            value={validatorConfig.severity || 'All'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, severity: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          />
                        </div>
                      </>
                    )}

                    {/* Gender Assumption Bias Validator */}
                    {(editingValidatorId || selectedValidator) === 'gender-assumption-bias' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Stage
                          </label>
                          <select
                            value={validatorConfig.stage || 'output'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, stage: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="input">Input</option>
                            <option value="output">Output</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            On Fail Action
                          </label>
                          <select
                            value={validatorConfig.on_fail_action || 'fix'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, on_fail_action: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="fix">Fix</option>
                            <option value="exception">Exception</option>
                            <option value="rephrase">Rephrase</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                            <input
                              type="checkbox"
                              checked={validatorConfig.enabled !== undefined ? validatorConfig.enabled : true}
                              onChange={(e) => setValidatorConfig({ ...validatorConfig, enabled: e.target.checked })}
                              style={{ accentColor: colors.accent.primary }}
                            />
                            Enabled
                          </label>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Bias Category
                          </label>
                          <select
                            value={validatorConfig.bias_category || 'All'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, bias_category: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="generic">Generic</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="education">Education</option>
                            <option value="all">All</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Ban List Validator */}
                    {(editingValidatorId || selectedValidator) === 'ban-list' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Stage
                          </label>
                          <select
                            value={validatorConfig.stage || 'input'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, stage: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="input">Input</option>
                            <option value="output">Output</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                            <input
                              type="checkbox"
                              checked={validatorConfig.enabled !== undefined ? validatorConfig.enabled : true}
                              onChange={(e) => setValidatorConfig({ ...validatorConfig, enabled: e.target.checked })}
                              style={{ accentColor: colors.accent.primary }}
                            />
                            Enabled
                          </label>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            On Fail Action
                          </label>
                          <select
                            value={validatorConfig.on_fail_action || 'fix'}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, on_fail_action: e.target.value })}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="fix">Fix</option>
                            <option value="exception">Exception</option>
                            <option value="rephrase">Rephrase</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                            Ban List
                          </label>
                          <select
                            value={validatorConfig.ban_list_id || ''}
                            onChange={(e) => {
                              if (e.target.value === 'create-new') {
                                setShowCreateBanListModal(true);
                              } else {
                                setValidatorConfig({ ...validatorConfig, ban_list_id: e.target.value });
                              }
                            }}
                            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                            style={{
                              border: `1px solid ${colors.border}`,
                              backgroundColor: colors.bg.primary,
                              color: colors.text.primary,
                            }}
                          >
                            <option value="">Select a ban list...</option>
                            <option value="create-new" style={{ fontWeight: 600 }}>+ Create New Ban List</option>
                            {banLists.map((list) => (
                              <option key={list.id} value={list.id}>
                                {list.name} ({list.banned_words?.length || 0} words)
                              </option>
                            ))}
                          </select>

                          {/* Display selected ban list details */}
                          {validatorConfig.ban_list_id && (() => {
                            const selectedBanList = banLists.find(list => list.id === validatorConfig.ban_list_id);
                            return selectedBanList && (
                              <div className="mt-3 p-3 rounded-md" style={{ backgroundColor: colors.bg.primary, border: `1px solid ${colors.border}` }}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold" style={{ color: colors.text.primary }}>
                                    Banned Words ({selectedBanList.banned_words?.length || 0})
                                  </span>
                                  {selectedBanList.domain && (
                                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}>
                                      {selectedBanList.domain}
                                    </span>
                                  )}
                                </div>
                                {selectedBanList.description && (
                                  <p className="text-xs mb-2" style={{ color: colors.text.secondary }}>
                                    {selectedBanList.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
                                  {selectedBanList.banned_words?.map((word: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2 py-1 rounded"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        color: colors.text.primary,
                                        border: `1px solid ${colors.border}`
                                      }}
                                    >
                                      {word}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}

                    {selectedValidator && (
                      <button
                        onClick={async () => {
                          const currentValidatorId = editingValidatorId || selectedValidator;
                          const validator = AVAILABLE_VALIDATORS.find(v => v.id === currentValidatorId);
                          if (validator) {
                            let finalConfig = { ...validatorConfig };
                            let enabled = true;

                            if (currentValidatorId === 'detect-pii') {
                              enabled = validatorConfig.is_enabled !== undefined ? validatorConfig.is_enabled : true;
                              finalConfig = {
                                type: validatorConfig.type || 'pii_remover',
                                stage: validatorConfig.stage || 'input',
                                on_fail_action: validatorConfig.on_fail_action || 'fix',
                                entity_types: validatorConfig.entity_types || ['PERSON', 'PHONE_NUMBER', 'IN_AADHAAR'],
                                threshold: validatorConfig.threshold !== undefined ? validatorConfig.threshold : 0.6,
                              };
                            } else if (currentValidatorId === 'lexical-slur-match') {
                              enabled = validatorConfig.enabled !== undefined ? validatorConfig.enabled : true;
                              finalConfig = {
                                type: validatorConfig.type || 'uli_slur_match',
                                stage: validatorConfig.stage || 'input',
                                on_fail_action: validatorConfig.on_fail_action || 'fix',
                                languages: validatorConfig.languages || ['en', 'hi'],
                                severity: validatorConfig.severity || 'ALL',
                              };
                            } else if (currentValidatorId === 'gender-assumption-bias') {
                              enabled = validatorConfig.enabled !== undefined ? validatorConfig.enabled : true;
                              finalConfig = {
                                type: validatorConfig.type || 'gender_assumption_bias',
                                stage: validatorConfig.stage || 'output',
                                on_fail_action: validatorConfig.on_fail_action || 'fix',
                                categories: validatorConfig.bias_category || 'All',
                              };
                            } else if (currentValidatorId === 'ban-list') {
                              enabled = validatorConfig.enabled !== undefined ? validatorConfig.enabled : true;
                              finalConfig = {
                                type: validatorConfig.type || 'ban_list',
                                stage: validatorConfig.stage || 'input',
                                on_fail_action: validatorConfig.on_fail_action || 'exception',
                                ban_list_id: validatorConfig.ban_list_id || '',
                              };
                            }

                            if (editingValidatorIndex !== null) {
                              handleRemoveValidator(editingValidatorIndex);
                            }

                            await handleSaveValidator({
                              id: validator.id,
                              name: validator.name,
                              description: validator.description,
                              enabled: enabled,
                              config: finalConfig
                            });

                            setValidatorConfig({});
                            setEditingValidatorIndex(null);
                            setEditingValidatorId(null);
                          }
                        }}
                        className="w-full px-4 py-2 rounded-md text-sm font-semibold"
                        style={{
                          backgroundColor: colors.status.success,
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {editingValidatorId ? 'Update Validator' : 'Save Validator'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* No Validator Selected - Empty State */}
              {!selectedValidator && !editingValidatorId && (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <svg
                    className="w-16 h-16 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: colors.text.secondary, opacity: 0.5 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p
                    className="text-sm font-medium text-center"
                    style={{ color: colors.text.secondary }}
                  >
                    Select any validator from the list
                  </p>
                  <p
                    className="text-xs text-center mt-2"
                    style={{ color: colors.text.secondary, opacity: 0.7 }}
                  >
                    Choose a validator to configure its settings
                  </p>
                </div>
              )}
              </div>
            </div>

            {/* Right: Configured Validators Panel */}
            <div style={{ width: '350px', backgroundColor: colors.bg.primary }} className="flex-shrink-0 overflow-auto">
              {/* Header - Always visible */}
              <div className="border-b px-6 py-4 sticky top-0" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    Configured Validators {savedValidators.length > 0 && `(${savedValidators.length})`}
                  </h3>
                  {savedValidators.length > 0 && !isEditMode && (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5"
                      style={{
                        backgroundColor: colors.bg.primary,
                        color: colors.text.primary,
                        border: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Validators List Content */}
              <div className="p-6">
              {savedValidators.length > 0 ? (
                <div>

                  {/* Input Validators */}
                  {(() => {
                    const inputValidators = savedValidators.filter(v => (v.config?.stage || 'input') === 'input');
                    return inputValidators.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold mb-2" style={{ color: colors.text.secondary }}>
                          Input Validators
                        </h4>
                        <div className="space-y-2">
                          {inputValidators.map((validator) => {
                            const originalIdx = savedValidators.indexOf(validator);
                            const isSelected = editingValidatorIndex === originalIdx;
                            return (
                              <div
                                key={originalIdx}
                                className="p-3 rounded-lg cursor-pointer hover:bg-opacity-80"
                                style={{
                                  border: `1px solid ${isSelected ? colors.accent.primary : colors.border}`,
                                  backgroundColor: isSelected ? colors.bg.secondary : colors.bg.primary,
                                  transition: 'all 0.15s ease',
                                }}
                                onClick={() => !isEditMode && handleEditValidator(originalIdx)}
                                title={!isEditMode ? "Click to view configuration" : ""}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div
                                      className="font-semibold text-sm"
                                      style={{ color: colors.text.primary }}
                                    >
                                      {validator.name}
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={validator.enabled !== false}
                                        onChange={() => handleToggleValidator(originalIdx)}
                                        className="sr-only peer"
                                      />
                                      <div
                                        className="w-9 h-5 rounded-full peer peer-focus:outline-none transition-colors duration-200"
                                        style={{
                                          backgroundColor: validator.enabled !== false ? colors.status.success : colors.border,
                                        }}
                                      >
                                        <div
                                          className="absolute top-[2px] start-[2px] bg-white border border-gray-300 rounded-full h-4 w-4 transition-all duration-200"
                                          style={{
                                            transform: validator.enabled !== false ? 'translateX(16px)' : 'translateX(0)',
                                          }}
                                        ></div>
                                      </div>
                                    </label>
                                  </div>
                                  {isEditMode && (
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => handleRemoveValidator(originalIdx)}
                                        className="p-1.5 rounded-md transition-colors"
                                        style={{
                                          backgroundColor: colors.bg.secondary,
                                          border: 'none',
                                          cursor: 'pointer',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                                        title="Remove validator"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.status.error }}>
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Output Validators */}
                  {(() => {
                    const outputValidators = savedValidators.filter(v => v.config?.stage === 'output');
                    return outputValidators.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold mb-2" style={{ color: colors.text.secondary }}>
                          Output Validators
                        </h4>
                        <div className="space-y-2">
                          {outputValidators.map((validator) => {
                            const originalIdx = savedValidators.indexOf(validator);
                            const isSelected = editingValidatorIndex === originalIdx;
                            return (
                              <div
                                key={originalIdx}
                                className="p-3 rounded-lg cursor-pointer hover:bg-opacity-80"
                                style={{
                                  border: `1px solid ${isSelected ? colors.accent.primary : colors.border}`,
                                  backgroundColor: isSelected ? colors.bg.secondary : colors.bg.primary,
                                  transition: 'all 0.15s ease',
                                }}
                                onClick={() => !isEditMode && handleEditValidator(originalIdx)}
                                title={!isEditMode ? "Click to view configuration" : ""}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div
                                      className="font-semibold text-sm"
                                      style={{ color: colors.text.primary }}
                                    >
                                      {validator.name}
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={validator.enabled !== false}
                                        onChange={() => handleToggleValidator(originalIdx)}
                                        className="sr-only peer"
                                      />
                                      <div
                                        className="w-9 h-5 rounded-full peer peer-focus:outline-none transition-colors duration-200"
                                        style={{
                                          backgroundColor: validator.enabled !== false ? colors.status.success : colors.border,
                                        }}
                                      >
                                        <div
                                          className="absolute top-[2px] start-[2px] bg-white border border-gray-300 rounded-full h-4 w-4 transition-all duration-200"
                                          style={{
                                            transform: validator.enabled !== false ? 'translateX(16px)' : 'translateX(0)',
                                          }}
                                        ></div>
                                      </div>
                                    </label>
                                  </div>
                                  {isEditMode && (
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => handleRemoveValidator(originalIdx)}
                                        className="p-1.5 rounded-md transition-colors"
                                        style={{
                                          backgroundColor: colors.bg.secondary,
                                          border: 'none',
                                          cursor: 'pointer',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                                        title="Remove validator"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.status.error }}>
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <svg
                    className="w-12 h-12 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: colors.text.secondary, opacity: 0.3 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p
                    className="text-sm font-medium text-center"
                    style={{ color: colors.text.secondary }}
                  >
                    No validators configured
                  </p>
                  <p
                    className="text-xs text-center mt-2"
                    style={{ color: colors.text.secondary, opacity: 0.7 }}
                  >
                    Configure a validator to see it here
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Ban List Modal */}
      {showCreateBanListModal && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={() => {
              setShowCreateBanListModal(false);
              setNewBanList({ name: '', description: '', banned_words: '', domain: '', is_public: false });
            }}
          />
          <div
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg rounded-lg shadow-lg p-6"
            style={{
              transform: 'translate(-50%, -50%)',
              backgroundColor: colors.bg.primary,
              border: `1px solid ${colors.border}`,
            }}
          >
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: colors.text.primary }}
            >
              Create New Ban List
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={newBanList.name}
                  onChange={(e) => setNewBanList({ ...newBanList, name: e.target.value })}
                  placeholder="e.g., profanity-filter"
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>
                  Description *
                </label>
                <input
                  type="text"
                  value={newBanList.description}
                  onChange={(e) => setNewBanList({ ...newBanList, description: e.target.value })}
                  placeholder="e.g., Filter for offensive and inappropriate language"
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>
                  Banned Words *
                </label>
                <textarea
                  value={newBanList.banned_words}
                  onChange={(e) => setNewBanList({ ...newBanList, banned_words: e.target.value })}
                  placeholder={'Enter words separated by commas or new lines\ne.g., word1, word2\nword3'}
                  rows={5}
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none resize-none"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                  }}
                />
                <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                  Separate words with commas or new lines
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>
                  Domain
                </label>
                <input
                  type="text"
                  value={newBanList.domain}
                  onChange={(e) => setNewBanList({ ...newBanList, domain: e.target.value })}
                  placeholder="e.g., general, healthcare"
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                  <input
                    type="checkbox"
                    checked={newBanList.is_public}
                    onChange={(e) => setNewBanList({ ...newBanList, is_public: e.target.checked })}
                    style={{ accentColor: colors.accent.primary }}
                  />
                  Make this ban list public
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCreateBanListModal(false);
                  setNewBanList({ name: '', description: '', banned_words: '', domain: '', is_public: false });
                }}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBanList}
                disabled={!newBanList.name.trim() || !newBanList.description.trim() || !newBanList.banned_words.trim()}
                className="px-4 py-2 rounded-md text-sm font-semibold"
                style={{
                  backgroundColor: !newBanList.name.trim() || !newBanList.description.trim() || !newBanList.banned_words.trim()
                    ? colors.bg.secondary
                    : colors.status.success,
                  color: !newBanList.name.trim() || !newBanList.description.trim() || !newBanList.banned_words.trim()
                    ? colors.text.secondary
                    : '#ffffff',
                  border: 'none',
                  cursor: !newBanList.name.trim() || !newBanList.description.trim() || !newBanList.banned_words.trim()
                    ? 'not-allowed'
                    : 'pointer',
                }}
              >
                Create Ban List
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
