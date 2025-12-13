/**
 * ConfigModal - Displays detailed configuration for an evaluation job
 * Shows assistant config, model, temperature, instructions, tools, and vector stores
 */

"use client"
import React from 'react';
import { EvalJob, AssistantConfig } from './types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: EvalJob;
  assistantConfig?: AssistantConfig | null;
}

export default function ConfigModal({ isOpen, onClose, job, assistantConfig }: ConfigModalProps) {
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
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#e5e5e5' }}>
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
              {assistantConfig?.model || job.config?.model || 'N/A'}
            </div>
          </div>

          {(assistantConfig?.temperature !== undefined || job.config?.temperature !== undefined) && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Temperature</div>
              <div className="text-sm font-medium mb-4" style={{ color: '#171717' }}>
                {assistantConfig?.temperature !== undefined ? assistantConfig.temperature : job.config?.temperature}
              </div>
            </div>
          )}

          {(assistantConfig?.instructions || job.config?.instructions) && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Instructions</div>
              <div className="text-sm p-3 rounded-md font-mono whitespace-pre-wrap border" style={{
                backgroundColor: '#fafafa',
                borderColor: '#e5e5e5',
                color: '#171717',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {assistantConfig?.instructions || job.config?.instructions}
              </div>
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
                Array.isArray(tool.vector_store_ids) && tool.vector_store_ids.length > 0 && (
                  <div key={`vs-${idx}`} className="mb-4">
                    <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>
                      Vector Store IDs ({tool.type})
                    </div>
                    <div className="text-sm font-mono p-3 rounded-md border" style={{
                      backgroundColor: '#fafafa',
                      borderColor: '#e5e5e5',
                      color: '#171717'
                    }}>
                      {tool.vector_store_ids.join(', ')}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {Array.isArray(assistantConfig?.vector_store_ids) && assistantConfig.vector_store_ids.length > 0 && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: '#737373' }}>Vector Store IDs</div>
              <div className="text-sm font-mono p-3 rounded-md border" style={{
                backgroundColor: '#fafafa',
                borderColor: '#e5e5e5',
                color: '#171717'
              }}>
                {assistantConfig.vector_store_ids.join(', ')}
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
