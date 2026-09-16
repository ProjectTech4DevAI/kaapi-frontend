"use client";

/**
 * Single access point for assessment data: the API-backed source bound to the
 * active API key.
 */
import { useMemo } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { createApiAssessmentSource } from "@/app/lib/assessment/apiSource";
import type { AssessmentDataSource } from "@/app/lib/types/assessment";

export function useAssessmentData(): AssessmentDataSource {
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";

  return useMemo(() => createApiAssessmentSource(apiKey), [apiKey]);
}
