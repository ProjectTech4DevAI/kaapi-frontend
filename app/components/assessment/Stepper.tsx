"use client";

import { Button } from "@/app/components";
import { CheckIcon } from "@/app/components/icons";
import type { StepperProps } from "@/app/lib/types/assessment";

export default function Stepper({
  steps,
  currentStep,
  onStepClick,
  completedSteps,
}: StepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-primary px-6 py-4">
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
                  isCompleted || isActive ? "bg-accent-primary" : "bg-border"
                }`}
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`!rounded-full !px-3 !py-1.5 !text-left !text-xs ${
                isActive
                  ? "!border-accent-primary !bg-accent-primary !text-white"
                  : isCompleted
                    ? "!bg-bg-secondary !text-text-primary"
                    : "!bg-transparent !text-text-secondary"
              } ${isClickable ? "opacity-100" : "cursor-default opacity-50"}`}
            >
              {isCompleted && !isActive ? (
                <CheckIcon className="w-3.5 h-3.5" />
              ) : (
                <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                  {step.id}
                </span>
              )}
              <span className="max-w-[9rem] leading-4">{step.label}</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
