"use client";

import { useState } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { Organization, Project } from "@/app/lib/types/onboarding";
import { useToast } from "@/app/hooks/useToast";

export function useOnboardingActivation({
  apiKey,
  onOrgActivated,
  onProjectActivated,
}: {
  apiKey: string;
  onOrgActivated?: () => void | Promise<void>;
  onProjectActivated?: () => void | Promise<void>;
}) {
  const toast = useToast();
  const [activatingOrgId, setActivatingOrgId] = useState<number | null>(null);
  const [activatingProjectId, setActivatingProjectId] = useState<number | null>(
    null,
  );

  const activateOrg = async (org: Organization) => {
    setActivatingOrgId(org.id);
    try {
      await apiFetch(`/api/organization/${org.id}`, apiKey, {
        method: "PATCH",
        body: JSON.stringify({ name: org.name, is_active: true }),
      });
      toast.success(`"${org.name}" activated`);
      await onOrgActivated?.();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to activate organization",
      );
    } finally {
      setActivatingOrgId(null);
    }
  };

  const activateProject = async (project: Project) => {
    setActivatingProjectId(project.id);
    try {
      await apiFetch(`/api/projects/${project.id}`, apiKey, {
        method: "PATCH",
        body: JSON.stringify({
          name: project.name,
          description: project.description ?? "",
          is_active: true,
        }),
      });
      toast.success(`"${project.name}" activated`);
      await onProjectActivated?.();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to activate project",
      );
    } finally {
      setActivatingProjectId(null);
    }
  };

  return { activatingOrgId, activatingProjectId, activateOrg, activateProject };
}
