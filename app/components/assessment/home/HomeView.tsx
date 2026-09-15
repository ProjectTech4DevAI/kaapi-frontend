"use client";

import { LoaderBox } from "@/app/components/ui";
import Stepper from "@/app/components/assessment/Stepper";
import { ASSESSMENT_WIZARD_STEPS } from "@/app/lib/assessment/constants";
import { useAssessmentHome } from "@/app/hooks/useAssessmentHome";
import AssessorsPanel from "./AssessorsPanel";
import RunsPanel from "./RunsPanel";
import type { HomeViewProps, WizardContext } from "@/app/lib/types/assessment";

const NO_COMPLETED_STEPS = new Set<number>();
const NO_STEP_CLICK = () => {};

export default function HomeView({
  initialSelection,
  onNewAssessor,
  onEditVersion,
  onNewRun,
}: HomeViewProps) {
  const home = useAssessmentHome(initialSelection);
  const { selection } = home;

  const contextForSelection = (): WizardContext | null => {
    if (!selection) return null;
    const assessor = home.assessors.find(
      (item) => item.id === selection.configId,
    );
    return {
      configId: selection.configId,
      version: selection.version,
      assessorName: assessor?.name ?? "Assessor",
    };
  };

  const openWith = (open: (context: WizardContext) => void) => () => {
    const context = contextForSelection();
    if (context) open(context);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Stepper
        steps={ASSESSMENT_WIZARD_STEPS}
        currentStep={0}
        completedSteps={NO_COMPLETED_STEPS}
        onStepClick={NO_STEP_CLICK}
        locked
        onHome={() => {}}
        trailing={
          <span className="hidden shrink-0 text-xs text-text-secondary xl:block">
            Start with “New”, or select a version to edit or run
          </span>
        }
      />

      {home.error && (
        <p
          role="alert"
          className="border-b border-status-error-border bg-status-error-bg px-6 py-2 text-xs text-status-error-text"
        >
          {home.error}
        </p>
      )}

      {home.isLoading ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <LoaderBox message="Loading assessors and runs..." />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <AssessorsPanel
            home={home}
            onNewAssessor={onNewAssessor}
            onEditVersion={openWith(onEditVersion)}
          />
          <RunsPanel home={home} onNewRun={openWith(onNewRun)} />
        </div>
      )}
    </div>
  );
}
