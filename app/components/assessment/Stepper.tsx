"use client";

import { CheckIcon } from "@/app/components/icons";

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
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-6 py-4">
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
                className={`h-px w-8 ${
                  isCompleted || isActive ? "bg-neutral-900" : "bg-neutral-200"
                }`}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : isCompleted
                    ? "border-neutral-200 bg-neutral-50 text-neutral-900"
                    : "border-neutral-200 bg-transparent text-neutral-500"
              } ${isClickable ? "cursor-pointer opacity-100" : "cursor-default opacity-50"}`}
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
