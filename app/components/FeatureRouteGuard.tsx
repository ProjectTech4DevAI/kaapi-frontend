"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import { useFeatureFlags } from "@/app/lib/FeatureFlagProvider";
import type { FeatureFlagKey } from "@/app/lib/constants/featureFlags";

interface FeatureRouteGuardProps {
  featureFlag: FeatureFlagKey;
  fallbackPath?: string;
  children: React.ReactNode;
}

export default function FeatureRouteGuard({
  featureFlag,
  fallbackPath = "/evaluations",
  children,
}: FeatureRouteGuardProps) {
  const router = useRouter();
  const { isLoaded, isEnabled } = useFeatureFlags();
  const enabled = isEnabled(featureFlag);

  useEffect(() => {
    if (isLoaded && !enabled) {
      router.replace(fallbackPath);
    }
  }, [enabled, fallbackPath, isLoaded, router]);

  if (!isLoaded || !enabled) {
    return <Loader size="lg" message="Checking access..." fullScreen />;
  }

  return <>{children}</>;
}
