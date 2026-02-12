import React from 'react';
import { colors } from '@/app/lib/colors';
import { Config, Commit, LegacyVariant, TestResult } from '@/app/configurations/prompt-editor/types';

interface ABTestTabProps {
  variants: LegacyVariant[];
  testInput: string;
  testResults: TestResult[] | null;
  isRunningTest: boolean;
  commits: Commit[];
  configs: Config[];
  onVariantsChange: (variants: LegacyVariant[]) => void;
  onTestInputChange: (input: string) => void;
  onRunTest: () => void;
}

export default function ABTestTab({
  variants,
  testInput,
  testResults,
  isRunningTest,
  commits,
  configs,
  onVariantsChange,
  onTestInputChange,
  onRunTest,
}: ABTestTabProps) {
  const addVariant = () => {
    if (variants.length >= 4) return;
    const nextLetter = String.fromCharCode(65 + variants.length); // A, B, C, D
    onVariantsChange([
      ...variants,
      {
        id: nextLetter,
        configId: '',
        commitId: '',
        name: `Variant ${nextLetter}`,
      },
    ]);
  };

  const updateVariant = (index: number, field: keyof LegacyVariant, value: string) => {
    const newVariants = [...variants];
    (newVariants[index] as any)[field] = value;
    onVariantsChange(newVariants);
  };

  const getCommitDisplay = (commit: Commit) => {
    return `#${commit.id}: ${commit.message} (${commit.branch})`;
  };

  const getConfigByCommit = (commitId: string) => {
    const commit = commits.find((c) => c.id === commitId);
    if (!commit) return null;
    return {
      model: 'gpt-4o-mini', // Default for now
      temp: 0.7, // Default for now
      prompt: commit.content.split('\n')[0],
    };
  };

  const getBestVariant = () => {
    if (!testResults || testResults.length === 0) return null;
    return testResults.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  };

  const bestVariant = getBestVariant();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Variants Configuration */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: colors.text.primary,
            }}
          >
            Variants
          </label>
          {variants.length < 4 && (
            <button
              onClick={addVariant}
              style={{
                padding: '4px 8px',
                backgroundColor: colors.accent.primary,
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              + Add Variant
            </button>
          )}
        </div>

        {variants.map((variant, index) => {
          const config = configs.find((c) => c.id === variant.configId);
          const commit = commits.find((c) => c.id === variant.commitId);

          return (
            <div
              key={variant.id}
              style={{
                padding: '12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                marginBottom: '12px',
                backgroundColor: colors.bg.secondary,
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: colors.text.primary,
                }}
              >
                {variant.name}
              </div>

              {/* Config Dropdown */}
              <div style={{ marginBottom: '8px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    color: colors.text.secondary,
                    marginBottom: '4px',
                  }}
                >
                  Configuration
                </label>
                <select
                  value={variant.configId}
                  onChange={(e) => updateVariant(index, 'configId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: colors.bg.primary,
                  }}
                >
                  <option value="">Select config...</option>
                  {configs.map((cfg) => (
                    <option key={cfg.id} value={cfg.id}>
                      {cfg.name} (v{cfg.version})
                    </option>
                  ))}
                </select>
              </div>

              {/* Prompt Dropdown */}
              <div style={{ marginBottom: '8px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    color: colors.text.secondary,
                    marginBottom: '4px',
                  }}
                >
                  Prompt Version
                </label>
                <select
                  value={variant.commitId}
                  onChange={(e) => updateVariant(index, 'commitId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: colors.bg.primary,
                  }}
                >
                  <option value="">Select prompt...</option>
                  {commits.map((commit) => (
                    <option key={commit.id} value={commit.id}>
                      {getCommitDisplay(commit)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              {config && commit && (
                <div
                  style={{
                    padding: '8px',
                    backgroundColor: colors.bg.primary,
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: colors.text.secondary,
                  }}
                >
                  <div>
                    <strong>Type:</strong> {config.config_blob.completion.type || 'text'}
                  </div>
                  <div>
                    <strong>Model:</strong> {config.config_blob.completion.params.model}
                  </div>
                  <div>
                    <strong>Temp:</strong> {config.config_blob.completion.params.temperature}
                  </div>
                  <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                    {commit.content.split('\n')[0].substring(0, 50)}...
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Test Input Section */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: colors.text.primary,
            marginBottom: '6px',
          }}
        >
          Test Input
        </label>
        <textarea
          value={testInput}
          onChange={(e) => onTestInputChange(e.target.value)}
          placeholder="Enter test prompt..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '8px',
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            fontSize: '13px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Run Test Button */}
      <button
        onClick={onRunTest}
        disabled={!testInput.trim() || isRunningTest}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor:
            !testInput.trim() || isRunningTest
              ? colors.text.secondary
              : colors.status.success,
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: !testInput.trim() || isRunningTest ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          opacity: !testInput.trim() || isRunningTest ? 0.6 : 1,
        }}
      >
        {isRunningTest ? 'Running Test...' : '▶ Run Test'}
      </button>

      {/* Results Section */}
      {testResults && testResults.length > 0 && (
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: colors.text.primary,
              marginBottom: '12px',
            }}
          >
            Results
          </label>

          {/* Best Performer Highlight */}
          {bestVariant && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#d1fae5',
                border: `1px solid ${colors.status.success}`,
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '13px',
                fontWeight: 600,
                color: colors.status.success,
              }}
            >
              🏆 Best: Variant {bestVariant.variantId}
            </div>
          )}

          {/* Results Cards */}
          {testResults
            .sort((a, b) => b.score - a.score)
            .map((result) => {
              const variant = variants.find((v) => v.id === result.variantId);
              const config = configs.find((c) => c.id === variant?.configId);
              const commit = commits.find((c) => c.id === variant?.commitId);

              return (
                <div
                  key={result.variantId}
                  style={{
                    padding: '12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    marginBottom: '8px',
                    backgroundColor: colors.bg.primary,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: colors.text.primary,
                      }}
                    >
                      Variant {result.variantId}
                    </span>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: colors.accent.primary,
                      }}
                    >
                      {result.score.toFixed(2)}
                    </span>
                  </div>
                  {config && commit && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: colors.text.secondary,
                        marginBottom: '4px',
                      }}
                    >
                      {config.name} • {commit.message}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '11px',
                      color: colors.text.secondary,
                    }}
                  >
                    Latency: {result.latency.toFixed(0)}ms
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
