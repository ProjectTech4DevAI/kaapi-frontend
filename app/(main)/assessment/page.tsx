"use client";

import { Suspense } from "react";
import { Loader } from "@/app/components/ui";
import PageLayout from "@/app/components/assessment/PageLayout";
import { useAssessmentWorkflow } from "@/app/hooks/useAssessmentWorkflow";

function PageContent() {
  const layoutProps = useAssessmentWorkflow();
  return <PageLayout {...layoutProps} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Loader size="lg" message="Loading..." fullScreen />}>
      <PageContent />
    </Suspense>
  );
}
