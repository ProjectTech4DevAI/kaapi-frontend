import React from 'react';
import { colors } from '@/app/lib/colors';
import { Config, Commit, LegacyVariant, TestResult } from '@/app/configurations/prompt-editor/types';
import CurrentConfigTab from './CurrentConfigTab';
import HistoryTab from './HistoryTab';
import ABTestTab from './ABTestTab';

interface ConfigDrawerProps {
  isOpen: boolean;
  activeTab: string;
  onClose: () => void;
  onTabChange: (tab: string) => void;

  // Current Config Tab Props
  configs: Config[];
  selectedConfigId: string;
  configName: string;
  provider: string;
  model: string;
  instructions: string;
  temperature: number;
  tools: any[];
  configCommitMsg: string;
  currentContent: string;
  onConfigNameChange: (name: string) => void;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onInstructionsChange: (instructions: string) => void;
  onTemperatureChange: (temp: number) => void;
  onToolsChange: (tools: any[]) => void;
  onConfigCommitMsgChange: (msg: string) => void;
  onSaveConfig: () => void;
  onLoadConfig: (configId: string) => void;
  onUseCurrentPrompt: () => void;

  // A/B Test Tab Props
  variants: LegacyVariant[];
  testInput: string;
  testResults: TestResult[] | null;
  isRunningTest: boolean;
  commits: Commit[];
  onVariantsChange: (variants: LegacyVariant[]) => void;
  onTestInputChange: (input: string) => void;
  onRunTest: () => void;
}

export default function ConfigDrawer({
  isOpen,
  activeTab,
  onClose,
  onTabChange,
  configs,
  selectedConfigId,
  configName,
  provider,
  model,
  instructions,
  temperature,
  tools,
  configCommitMsg,
  currentContent,
  onConfigNameChange,
  onProviderChange,
  onModelChange,
  onInstructionsChange,
  onTemperatureChange,
  onToolsChange,
  onConfigCommitMsgChange,
  onSaveConfig,
  onLoadConfig,
  onUseCurrentPrompt,
  variants,
  testInput,
  testResults,
  isRunningTest,
  commits,
  onVariantsChange,
  onTestInputChange,
  onRunTest,
}: ConfigDrawerProps) {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: `rgba(0, 0, 0, ${isAnimating ? 0.3 : 0})`,
          zIndex: 1001,
          transition: 'background-color 0.3s ease',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '420px',
          height: '100vh',
          backgroundColor: colors.bg.primary,
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1002,
          display: 'flex',
          flexDirection: 'column',
          transform: `translateX(${isAnimating ? '0' : '100%'})`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => onTabChange('current')}
              style={{
                padding: '6px 12px',
                backgroundColor: activeTab === 'current' ? colors.accent.primary : 'transparent',
                color: activeTab === 'current' ? '#ffffff' : colors.text.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Current
            </button>
            <button
              onClick={() => onTabChange('history')}
              style={{
                padding: '6px 12px',
                backgroundColor: activeTab === 'history' ? colors.accent.primary : 'transparent',
                color: activeTab === 'history' ? '#ffffff' : colors.text.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              History
            </button>
            <button
              onClick={() => onTabChange('abtest')}
              style={{
                padding: '6px 12px',
                backgroundColor: activeTab === 'abtest' ? colors.accent.primary : 'transparent',
                color: activeTab === 'abtest' ? '#ffffff' : colors.text.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              A/B Test
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: colors.text.secondary,
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          <div
            key={activeTab}
            style={{
              animation: 'fadeIn 0.2s ease-in',
            }}
          >
            {activeTab === 'current' && (
              <CurrentConfigTab
              configs={configs}
              selectedConfigId={selectedConfigId}
              configName={configName}
              provider={provider}
              model={model}
              instructions={instructions}
              temperature={temperature}
              tools={tools}
              configCommitMsg={configCommitMsg}
              onConfigNameChange={onConfigNameChange}
              onProviderChange={onProviderChange}
              onModelChange={onModelChange}
              onInstructionsChange={onInstructionsChange}
              onTemperatureChange={onTemperatureChange}
              onToolsChange={onToolsChange}
              onConfigCommitMsgChange={onConfigCommitMsgChange}
              onSaveConfig={onSaveConfig}
              onLoadConfig={onLoadConfig}
              onUseCurrentPrompt={onUseCurrentPrompt}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              configs={configs}
              selectedConfigId={selectedConfigId}
              onLoadConfig={onLoadConfig}
            />
          )}

            {activeTab === 'abtest' && (
              <ABTestTab
                variants={variants}
                testInput={testInput}
                testResults={testResults}
                isRunningTest={isRunningTest}
                commits={commits}
                configs={configs}
                onVariantsChange={onVariantsChange}
                onTestInputChange={onTestInputChange}
                onRunTest={onRunTest}
              />
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
