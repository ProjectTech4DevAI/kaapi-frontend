"use client";

import { CheckIcon } from "@/app/components/icons";
import { colors } from "@/app/lib/colors";

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

export default function Stepper({
  steps,
  currentStep,
  onStepClick,
  completedSteps,
}: StepperProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 px-6 py-4 border-b"
      style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}
    >
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = completedSteps.has(step.id);
        const isSequentiallyUnlocked =
          step.id > currentStep &&
          steps
            .filter((s) => s.id < step.id)
            .every((s) => completedSteps.has(s.id));
        const isClickable =
          isCompleted || step.id <= currentStep || isSequentiallyUnlocked;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className="w-8 h-px"
                style={{
                  backgroundColor:
                    isCompleted || isActive
                      ? colors.accent.primary
                      : colors.border,
                }}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-left transition-colors"
              style={{
                backgroundColor: isActive
                  ? colors.accent.primary
                  : isCompleted
                    ? colors.bg.secondary
                    : "transparent",
                color: isActive
                  ? "#ffffff"
                  : isCompleted
                    ? colors.text.primary
                    : colors.text.secondary,
                border: `1px solid ${isActive ? colors.accent.primary : isCompleted ? colors.border : colors.border}`,
                cursor: isClickable ? "pointer" : "default",
                opacity: isClickable ? 1 : 0.5,
              }}
            >
              {isCompleted && !isActive ? (
                <CheckIcon className="w-3.5 h-3.5" />
              ) : (
                <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                  {step.id}
                </span>
              )}
              <span className="max-w-[9rem] leading-4">{step.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
