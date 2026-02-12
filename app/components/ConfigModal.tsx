/**
 * ConfigModal - Displays detailed configuration for an evaluation job
 * Shows assistant config, model, temperature, instructions, tools, and vector stores
 */

"use client"
import React, { useState, useEffect } from 'react';
import { EvalJob, AssistantConfig } from './types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: EvalJob;
  assistantConfig?: AssistantConfig | null;
}

interface ConfigVersionInfo {
  name: string;
  version: number;
  model?: string;
  instructions?: string;
  temperature?: number;
  tools?: any[];
  provider?: string;
  type?: 'text' | 'stt' | 'tts';
}

export default function ConfigModal({ isOpen, onClose, job, assistantConfig }: ConfigModalProps) {
  const [configVersionInfo, setConfigVersionInfo] = useState<ConfigVersionInfo | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Fetch full config version details when modal opens
  useEffect(() => {
    if (!isOpen || !job.config_id || !job.config_version) {
      setConfigVersionInfo(null);
      return;
    }

    const fetchConfigVersionInfo = async () => {
      setIsLoadingConfig(true);
      try {
        // Get API key from localStorage
        const stored = localStorage.getItem('kaapi_api_keys');
        if (!stored) {
          console.error('No API key found');
          return;
        }
        const keys = JSON.parse(stored);
        const apiKey = keys.length > 0 ? keys[0].key : null;
        if (!apiKey) {
          console.error('No API key found');
          return;
        }

        // Fetch config name first
        const configResponse = await fetch(`/api/configs/${job.config_id}`, {
          headers: { 'X-API-KEY': apiKey },
        });

        if (!configResponse.ok) {
          console.error('Failed to fetch config info');
          return;
        }

        const configData = await configResponse.json();
        const configName = configData.success && configData.data ? configData.data.name : null;

        // Fetch full version details including config_blob
        const versionResponse = await fetch(
          `/api/configs/${job.config_id}/versions/${job.config_version}`,
          {
            headers: { 'X-API-KEY': apiKey },
          }
        );

        if (!versionResponse.ok) {
          console.error('Failed to fetch version details');
          return;
        }

        const versionData = await versionResponse.json();
        if (versionData.success && versionData.data) {
          const blob = versionData.data.config_blob;
          const params = blob?.completion?.params || {};

          setConfigVersionInfo({
            name: configName || 'Unknown Config',
            version: job.config_version!,
            model: params.model,
            instructions: params.instructions,
            temperature: params.temperature,
            tools: params.tools,
            provider: blob?.completion?.provider,
            type: blob?.completion?.type || 'text',
          });
        }
      } catch (error) {
        console.error('Error fetching config version info:', error);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchConfigVersionInfo();
  }, [isOpen, job.config_id, job.config_version]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', animation: 'fadeIn 0.2s ease' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e5e5',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          animation: 'modalSlideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e5e5' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#737373' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-semibold" style={{ color: '#171717' }}>Detailed Configuration</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md"
              style={{
                color: '#737373',
                backgroundColor: 'transparent',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fafafa';
                e.currentTarget.style.color = '#171717';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#737373';
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Config Name and Version */}
          {job.config_id && job.config_version && (
            <div className="mt-2 px-4 py-3 rounded-lg" style={{ backgroundColor: '#f0f9ff', borderWidth: '1px', borderColor: '#bae6fd' }}>
              {isLoadingConfig ? (
                <div className="text-sm" style={{ color: '#0369a1' }}>Loading config info...</div>
              ) : configVersionInfo ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#0369a1' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm font-semibold" style={{ color: '#0369a1' }}>
                      {configVersionInfo.name} <span className="font-normal">v{configVersionInfo.version}</span>
                    </span>
                  </div>
                  <div className="text-xs ml-6 space-y-1" style={{ color: '#0369a1' }}>
                    {configVersionInfo.provider && configVersionInfo.model && (
                      <div>
                        <span className="font-medium">Model:</span> {configVersionInfo.provider}/{configVersionInfo.model}
                      </div>
                    )}
                    {configVersionInfo.type && (
                      <div>
                        <span className="font-medium">Type:</span> {configVersionInfo.type.toUpperCase()}
                      </div>
                    )}
                    {configVersionInfo.temperature !== undefined && (
                      <div>
                        <span className="font-medium">Temperature:</span> {configVersionInfo.temperature}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm" style={{ color: '#0369a1' }}>
                  Config ID: {job.config_id} (v{job.config_version})
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {assistantConfig && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Assistant Name</div>
              <div className="text-sm font-medium mb-4" style={{ color: '#171717' }}>{assistantConfig.name}</div>
            </div>
          )}

          {job.assistant_id && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Assistant ID</div>
              <div className="text-sm font-mono mb-4" style={{ color: '#171717' }}>{job.assistant_id}</div>
            </div>
          )}

          <div>
            <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Model</div>
            <div className="text-sm font-medium mb-4" style={{ color: '#171717' }}>
              {configVersionInfo?.model || assistantConfig?.model || job.config?.model || 'N/A'}
            </div>
          </div>

          {(configVersionInfo?.temperature !== undefined || assistantConfig?.temperature !== undefined || job.config?.temperature !== undefined) && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Temperature</div>
              <div className="text-sm font-medium mb-4" style={{ color: '#171717' }}>
                {configVersionInfo?.temperature !== undefined
                  ? configVersionInfo.temperature
                  : (assistantConfig?.temperature !== undefined ? assistantConfig.temperature : job.config?.temperature)}
              </div>
            </div>
          )}

          {(configVersionInfo?.instructions || assistantConfig?.instructions || job.config?.instructions) && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Instructions</div>
              <div className="text-sm p-3 rounded-md font-mono whitespace-pre-wrap border" style={{
                backgroundColor: '#fafafa',
                borderColor: '#e5e5e5',
                color: '#171717',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {configVersionInfo?.instructions || assistantConfig?.instructions || job.config?.instructions}
              </div>
            </div>
          )}

          {(Array.isArray(configVersionInfo?.tools) && configVersionInfo.tools.length > 0) && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Tools (from Config Version)</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {configVersionInfo.tools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: '#fafafa',
                      borderWidth: '1px',
                      borderColor: '#e5e5e5',
                      color: '#171717'
                    }}
                  >
                    {tool.type}
                  </span>
                ))}
              </div>
              {configVersionInfo.tools.map((tool, idx) => (
                Array.isArray(tool.knowledge_base_ids) && tool.knowledge_base_ids.length > 0 && (
                  <div key={`vs-${idx}`} className="mb-4">
                    <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>
                      Vector Store IDs ({tool.type})
                    </div>
                    <div className="text-sm font-mono p-3 rounded-md border" style={{
                      backgroundColor: '#fafafa',
                      borderColor: '#e5e5e5',
                      color: '#171717'
                    }}>
                      {tool.knowledge_base_ids.join(', ')}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {Array.isArray(job.config?.tools) && job.config.tools.length > 0 && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Tools</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {job.config.tools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: '#fafafa',
                      borderWidth: '1px',
                      borderColor: '#e5e5e5',
                      color: '#171717'
                    }}
                  >
                    {tool.type}
                  </span>
                ))}
              </div>
              {job.config.tools.map((tool, idx) => (
                Array.isArray(tool.knowledge_base_ids) && tool.knowledge_base_ids.length > 0 && (
                  <div key={`vs-${idx}`} className="mb-4">
                    <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>
                      Vector Store IDs ({tool.type})
                    </div>
                    <div className="text-sm font-mono p-3 rounded-md border" style={{
                      backgroundColor: '#fafafa',
                      borderColor: '#e5e5e5',
                      color: '#171717'
                    }}>
                      {tool.knowledge_base_ids.join(', ')}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {Array.isArray(assistantConfig?.knowledge_base_ids) && assistantConfig.knowledge_base_ids.length > 0 && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Vector Store IDs</div>
              <div className="text-sm font-mono p-3 rounded-md border" style={{
                backgroundColor: '#fafafa',
                borderColor: '#e5e5e5',
                color: '#171717'
              }}>
                {assistantConfig.knowledge_base_ids.join(', ')}
              </div>
            </div>
          )}

          {Array.isArray(job.config?.include) && job.config.include.length > 0 && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Include</div>
              <div className="flex flex-wrap gap-2">
                {job.config.include.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: '#fafafa',
                      borderWidth: '1px',
                      borderColor: '#e5e5e5',
                      color: '#171717'
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: '#e5e5e5', backgroundColor: '#fafafa' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: '#171717',
              color: '#ffffff',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#404040'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#171717'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
