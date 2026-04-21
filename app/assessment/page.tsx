import { notFound } from "next/navigation";
import AssessmentPageClient from "@/app/assessment/AssessmentPageClient";
import FeatureRouteGuard from "@/app/components/FeatureRouteGuard";
import { FeatureFlag } from "@/app/lib/constants/featureFlags";
import { getServerFeatureFlags } from "@/app/lib/featureFlags.server";

export default async function AssessmentPage() {
  const initialFlags = await getServerFeatureFlags();

  if (!initialFlags[FeatureFlag.ASSESSMENT]) {
    notFound();
  }

  return (
    <FeatureRouteGuard featureFlag={FeatureFlag.ASSESSMENT}>
      <AssessmentPageClient />
    </FeatureRouteGuard>
  );
}
