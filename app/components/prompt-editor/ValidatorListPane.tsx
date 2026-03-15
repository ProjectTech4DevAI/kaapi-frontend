import React from 'react';
import { colors } from '@/app/lib/colors';

export interface Validator {
  id: string;
  name: string;
  description: string;
  tags: string[];
  validator_config_id?: string; // ID returned from backend after saving
  config?: {
    threshold?: number;
    enabled?: boolean;
    stage?: string;
    [key: string]: any;
  };
}

export const AVAILABLE_VALIDATORS: Validator[] = [
  {
    id: 'ban-list',
    name: 'Ban List',
    description: 'Validates that the output does not contain banned words, using fuzzy search.',
    tags: ['STRING', 'BRAND RISK'],
  },
  {
    id: 'detect-pii',
    name: 'Detect PII',
    description: 'Detects personally identifiable information (PII) in text, using Microsoft Presidio.',
    tags: ['STRING', 'DATA LEAKAGE'],
  },
  {
    id: 'lexical-slur-match',
    name: 'Lexical Slur Match',
    description: 'Detects and filters offensive slurs in multiple languages using lexical matching.',
    tags: ['STRING', 'BRAND RISK'],
  },
  {
    id: 'gender-assumption-bias',
    name: 'Gender Assumption Bias',
    description: 'Detects gender assumption biases across different domains like healthcare and education.',
    tags: ['STRING', 'BRAND RISK'],
  },
];

interface ValidatorListPaneProps {
  selectedValidator: string | null;
  onSelectValidator: (validatorId: string) => void;
}

export default function ValidatorListPane({
  selectedValidator,
  onSelectValidator,
}: ValidatorListPaneProps) {
  return (
    <div
      className="flex-1 flex flex-col overflow-hidden border-r"
      style={{
        backgroundColor: colors.bg.primary,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: colors.border }}
      >
        <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
          Available Validators
        </h3>
      </div>

      {/* Validator List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {AVAILABLE_VALIDATORS.map((validator) => (
            <button
              key={validator.id}
              onClick={() => onSelectValidator(validator.id)}
              className="w-full text-left p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: selectedValidator === validator.id ? colors.bg.secondary : colors.bg.primary,
                border: `1px solid ${colors.border}`,
              }}
              onMouseEnter={(e) => {
                if (selectedValidator !== validator.id) {
                  e.currentTarget.style.backgroundColor = colors.bg.secondary;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedValidator !== validator.id) {
                  e.currentTarget.style.backgroundColor = colors.bg.primary;
                }
              }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: colors.text.primary }}>
                    {validator.name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                    {validator.description}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {validator.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: colors.bg.secondary,
                          color: colors.text.secondary,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
