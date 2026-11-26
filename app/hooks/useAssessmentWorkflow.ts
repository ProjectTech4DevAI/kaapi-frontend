"use client";

import { useCallback, useState } from "react";
import { useAssessmentWizard } from "@/app/hooks/useAssessmentWizard";
import type {
  AssessmentView,
  AssessorSelection,
  PageLayoutProps,
  WizardContext,
} from "@/app/lib/types/assessment";

export function useAssessmentWorkflow(): PageLayoutProps {
  const [view, setView] = useState<AssessmentView>("home");
  const [homeSelection, setHomeSelection] = useState<AssessorSelection | null>(
    null,
  );

  const onGoHome = useCallback(() => setView("home"), []);

  const onRunCreated = useCallback((context: WizardContext) => {
    setHomeSelection({
      configId: context.configId,
      version: context.version,
    });
    setView("home");
  }, []);

  const wizard = useAssessmentWizard({ onExit: onGoHome, onRunCreated });

  const openWizard = useCallback((start: () => void) => {
    start();
    setView("wizard");
  }, []);

  return {
    view,
    homeSelection,
    onGoHome,
    wizard: {
      ...wizard,
      startNew: () => openWizard(wizard.startNew),
      startEdit: (context: WizardContext) =>
        openWizard(() => wizard.startEdit(context)),
      startRun: (context: WizardContext) =>
        openWizard(() => wizard.startRun(context)),
    },
  };
}
