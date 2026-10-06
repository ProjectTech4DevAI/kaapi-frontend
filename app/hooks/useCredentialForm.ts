"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import {
  PROVIDERS,
  type Credential,
  type ProviderDef,
  type UseCredentialFormResult,
} from "@/app/lib/types/credentials";
import {
  buildCredentialPayload,
  getExistingForProvider,
  hasCredentialChanges,
  missingCredentialFields,
  populateCredentialForm,
} from "@/app/lib/utils";

export function useCredentialForm(
  credentials: Credential[],
): UseCredentialFormResult {
  const toast = useToast();
  const [selectedProvider, setSelectedProvider] = useState<ProviderDef>(
    PROVIDERS[0],
  );
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [existingCredential, setExistingCredential] =
    useState<Credential | null>(null);

  const resetForm = useCallback(() => {
    const existing = getExistingForProvider(selectedProvider, credentials);
    setExistingCredential(existing);
    setIsActive(existing ? existing.is_active : true);
    setFormValues(populateCredentialForm(selectedProvider, existing));
  }, [credentials, selectedProvider]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validatePayload = useCallback(() => {
    const missing = missingCredentialFields(selectedProvider, formValues);
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return null;
    }
    const built = buildCredentialPayload(selectedProvider, formValues);
    if (built.error) {
      toast.error(built.error);
      return null;
    }
    if (Object.keys(built.payload).length === 0) {
      toast.error("No changes to save");
      return null;
    }
    return built.payload;
  }, [formValues, selectedProvider, toast]);

  return {
    selectedProvider,
    setSelectedProvider,
    formValues,
    isActive,
    setIsActive,
    existingCredential,
    hasChanges: hasCredentialChanges(
      selectedProvider,
      formValues,
      existingCredential,
      isActive,
    ),
    handleFieldChange,
    resetForm,
    validatePayload,
  };
}
