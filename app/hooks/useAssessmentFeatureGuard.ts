"use client";

/**
 * A 403 from the assessment API means the feature is off for this org/project:
 * drop the client flag and leave the page. Data hooks call `guard(error)` in their
 * catch blocks and skip their own toast when it returns true.
 */
import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/hooks/useToast";
import { handleForbiddenError } from "@/app/lib/utils/assessment";
import { removeFeatureFromClient } from "@/app/lib/utils/features";
import { FeatureFlag } from "@/app/lib/constants";

export interface UseAssessmentFeatureGuardResult {
  guard: (error: unknown) => boolean;
}

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
