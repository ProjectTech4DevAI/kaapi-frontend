"use client";

import { colors } from '@/app/lib/colors';

export interface Step {
  id: number;
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: Set<number>;
}

export default function Stepper({ steps, currentStep, onStepClick, completedSteps }: StepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-b" style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}>
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = completedSteps.has(step.id);
        const isClickable = isCompleted || step.id <= currentStep;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className="w-8 h-px"
                style={{ backgroundColor: isCompleted || isActive ? colors.accent.primary : colors.border }}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: isActive ? colors.accent.primary : isCompleted ? colors.bg.secondary : 'transparent',
                color: isActive ? '#ffffff' : isCompleted ? colors.text.primary : colors.text.secondary,
                border: `1px solid ${isActive ? colors.accent.primary : isCompleted ? colors.border : colors.border}`,
                cursor: isClickable ? 'pointer' : 'default',
                opacity: isClickable ? 1 : 0.5,
              }}
            >
              {isCompleted && !isActive ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold">{step.id}</span>
              )}
              {step.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
