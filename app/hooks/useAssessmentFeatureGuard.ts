"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/hooks/useToast";
import { handleForbiddenError } from "@/app/lib/utils/assessment";
import { removeFeatureFromClient } from "@/app/lib/utils/features";
import { FeatureFlag } from "@/app/lib/constants";
import type { UseAssessmentFeatureGuardResult } from "@/app/lib/types/assessment";

export function useAssessmentFeatureGuard(): UseAssessmentFeatureGuardResult {
  const router = useRouter();
  const toast = useToast();
  const redirectingRef = useRef(false);

  const onForbidden = useCallback(() => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    toast.error(
      "Assessment feature is disabled for this organization/project.",
    );
    removeFeatureFromClient(FeatureFlag.ASSESSMENT);
    if (typeof window !== "undefined") router.replace("/");
  }, [router, toast]);

  const guard = useCallback(
    (error: unknown) => handleForbiddenError(error, onForbidden),
    [onForbidden],
  );

  return { guard };
}
