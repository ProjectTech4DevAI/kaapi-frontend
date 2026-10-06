"use client";

import { useCallback, useState } from "react";
import { rewriteToken } from "@/app/lib/assessment/promptTokens";
import { draftFromVersion, emptyDraft } from "@/app/lib/assessment/draft";
import {
  buildDefaultParams,
  getDefaultModelForProvider,
} from "@/app/lib/data/assessmentModels";
import type {
  AssessorVersionDetail,
  PromptFieldType,
  PromptStepId,
  PromptZoneId,
  PromptZones,
  SchemaProperty,
  UseWizardDraftResult,
  WizardDraft,
} from "@/app/lib/types/assessment";
import type { ProviderType } from "@/app/lib/types/configs";

export function useWizardDraft(): UseWizardDraftResult {
  const [draft, setDraft] = useState<WizardDraft>(emptyDraft);

  const setPrefilterEnabled = useCallback((prefilterEnabled: boolean) => {
    setDraft((current) => ({ ...current, prefilterEnabled }));
  }, []);

  const setZone = useCallback(
    (step: PromptStepId, zone: PromptZoneId, value: string) => {
      setDraft((current) => ({
        ...current,
        [step]: { ...current[step], [zone]: value },
      }));
    },
    [],
  );

  const setFieldType = useCallback((name: string, type: PromptFieldType) => {
    setDraft((current) => ({
      ...current,
      fieldTypes: { ...current.fieldTypes, [name]: type },
      prefilter: rewriteZones(current.prefilter, name, type),
      assessment: rewriteZones(current.assessment, name, type),
    }));
  }, []);

  const setFieldStrict = useCallback((name: string, strict: boolean) => {
    setDraft((current) => ({
      ...current,
      fieldStrict: { ...current.fieldStrict, [name]: strict },
    }));
  }, []);

  const setOutputSchema = useCallback((outputSchema: SchemaProperty[]) => {
    setDraft((current) => ({ ...current, outputSchema }));
  }, []);

  const setModel = useCallback(
    (step: PromptStepId, provider: ProviderType, model: string) => {
      const next = model || getDefaultModelForProvider(provider);
      setDraft((current) => ({
        ...current,
        models: {
          ...current.models,
          [step]: { provider, model: next, params: buildDefaultParams(next) },
        },
      }));
    },
    [],
  );

  const setModelParam = useCallback(
    (step: PromptStepId, key: string, value: string | number) => {
      setDraft((current) => ({
        ...current,
        models: {
          ...current.models,
          [step]: {
            ...current.models[step],
            params: { ...current.models[step].params, [key]: value },
          },
        },
      }));
    },
    [],
  );

  const loadFromVersion = useCallback((detail: AssessorVersionDetail) => {
    setDraft(draftFromVersion(detail));
  }, []);

  const reset = useCallback(() => setDraft(emptyDraft()), []);

  return {
    draft,
    setPrefilterEnabled,
    setZone,
    setFieldType,
    setFieldStrict,
    setOutputSchema,
    setModel,
    setModelParam,
    loadFromVersion,
    reset,
  };
}

function rewriteZones(
  zones: PromptZones,
  name: string,
  type: PromptFieldType,
): PromptZones {
  return {
    instructions: rewriteToken(zones.instructions, name, type),
    submission: rewriteToken(zones.submission, name, type),
  };
}
