"use client";

import { notFound, useParams } from "next/navigation";
import { ASSESSMENT_ROUTE_SEGMENT_TO_TAB } from "@/app/lib/assessment/constants";
import AssessmentWorkspace from "../AssessmentWorkspace";

// Sub-routes /assessment/config | /assessment/experiment | /assessment/runs.
// Datasets lives at the base /assessment route.
export default function AssessmentTabPage() {
  const params = useParams<{ tab: string }>();
  const tab = ASSESSMENT_ROUTE_SEGMENT_TO_TAB[params?.tab ?? ""];
  if (!tab) notFound();
  return <AssessmentWorkspace initialTab={tab} />;
}
