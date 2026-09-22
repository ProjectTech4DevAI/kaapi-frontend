"use client";

// Shared body for every /assessment sub-route. The route decides which tab is
// active via `initialTab`; the page shell for each route just renders this.
import { Suspense } from "react";
import { Loader } from "@/app/components/ui";
import PageLayout from "@/app/components/assessment/PageLayout";
import { useAssessmentWorkflow } from "@/app/hooks/useAssessmentWorkflow";
import type { AssessmentTabId } from "@/app/lib/types/assessment";

function WorkspaceContent({ initialTab }: { initialTab: AssessmentTabId }) {
  const layoutProps = useAssessmentWorkflow(initialTab);
  return <PageLayout {...layoutProps} />;
}

export default function AssessmentWorkspace({
  initialTab = "datasets",
}: {
  initialTab?: AssessmentTabId;
}) {
  return (
    <Suspense fallback={<Loader size="lg" message="Loading..." fullScreen />}>
      <WorkspaceContent initialTab={initialTab} />
    </Suspense>
  );
}
