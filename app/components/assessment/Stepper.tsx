"use client";

import { Button } from "@/app/components/ui";
import { CheckIcon, HomeIcon } from "@/app/components/icons";
import { getStepState, stepPillClasses } from "@/app/lib/assessment/wizard";
import type { StepperProps } from "@/app/lib/types/assessment";

export default function Stepper({
  steps,
  currentStep,
  onStepClick,
  completedSteps,
  locked = false,
  isStepAllowed,
  onHome,
  leading,
  trailing,
}: StepperProps) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg-primary px-6">
      {leading}

      {onHome && (
        <>
          <button
            type="button"
            onClick={onHome}
            title="Assessment home"
            aria-label="Assessment home"
            className="inline-flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-bg-primary text-text-secondary transition-colors hover:border-accent-primary hover:bg-accent-primary/5 hover:text-accent-primary"
          >
            <HomeIcon className="w-4 h-4" />
          </button>
          <div className="hidden h-px w-8 shrink-0 bg-border sm:block" />
        </>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2">
        {steps.map((step, index) => {
          const state = getStepState({
            step,
            steps,
            currentStep,
            completedSteps,
            locked,
            isStepAllowed,
          });

          return (
            <div key={step.id} className="flex shrink-0 items-center gap-2">
              {index > 0 && (
                <div
                  className={`h-px w-6 ${
                    state.isCompleted || state.isActive
                      ? "bg-accent-primary"
                      : "bg-border"
                  }`}
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => state.isClickable && onStepClick(step.id)}
                disabled={!state.isClickable}
                className={`rounded-full! px-3! py-1.5! text-left! text-xs! whitespace-nowrap ${stepPillClasses(
                  state,
                )} ${
                  state.isClickable
                    ? "opacity-100"
                    : "cursor-default opacity-50"
                }`}
              >
                {state.isCompleted && !state.isActive ? (
                  <CheckIcon className="w-3.5 h-3.5" />
                ) : (
                  <span className="flex items-center justify-center text-[10px] font-bold">
                    {step.id}
                  </span>
                )}
                <span className="leading-4">{step.label}</span>
              </Button>
            </div>
          );
        })}
      </div>

      {trailing}
    </div>
  );
}
