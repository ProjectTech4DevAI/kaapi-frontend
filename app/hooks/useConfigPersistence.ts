import { useState } from "react";
import { useToast } from "@/app/components/ui/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { invalidateConfigCache } from "@/app/lib/utils";
import { isGpt5Model } from "@/app/lib/models";
import {
  ConfigCreate,
  ConfigVersionCreate,
  ConfigPublic,
} from "@/app/lib/types/configs";
import { ConfigBlob } from "@/app/lib/types/promptEditor";

interface UseConfigPersistenceArgs {
  allConfigMeta: ConfigPublic[];
  refetchConfigs: (force?: boolean) => Promise<void>;
}

interface SaveArgs {
  currentConfigName: string;
  currentConfigBlob: ConfigBlob;
  currentContent: string;
  commitMessage: string;
  provider: string;
}

interface UseConfigPersistenceResult {
  isSaving: boolean;
  saveConfig: (args: SaveArgs) => Promise<boolean>;
  renameConfig: (
    configId: string,
    newName: string,
    currentName: string,
  ) => Promise<boolean>;
}

/**
 * Owns the network plumbing for creating/versioning/renaming configs.
 * Returns a `saveConfig` that creates either a new config or a new version
 * of an existing config (matched by name), and a `renameConfig` that PATCHes
 * the metadata only (no version row).
 */
export function useConfigPersistence({
  allConfigMeta,
  refetchConfigs,
}: UseConfigPersistenceArgs): UseConfigPersistenceResult {
  const toast = useToast();
  const { activeKey, isAuthenticated } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const saveConfig = async (args: SaveArgs): Promise<boolean> => {
    const {
      currentConfigName,
      currentConfigBlob,
      currentContent,
      commitMessage,
      provider,
    } = args;

    if (!currentConfigName.trim()) {
      toast.error("Please enter a configuration name");
      return false;
    }

    const apiKey = activeKey?.key ?? "";
    if (!isAuthenticated) {
      toast.error("Please log in to save configurations.");
      return false;
    }

    setIsSaving(true);

    try {
      const tools = currentConfigBlob.completion.params.tools || [];
      const allKnowledgeBaseIds: string[] = [];
      let maxNumResults = 20;

      tools.forEach((tool) => {
        allKnowledgeBaseIds.push(...tool.knowledge_base_ids);
        if (allKnowledgeBaseIds.length === tool.knowledge_base_ids.length) {
          maxNumResults = tool.max_num_results;
        }
      });

      const model = currentConfigBlob.completion.params.model;
      const gpt5 = isGpt5Model(model);

      const configBlob: ConfigBlob = {
        completion: {
          provider: currentConfigBlob.completion.provider,
          type: currentConfigBlob.completion.type || "text",
          params: {
            model,
            instructions: currentContent,
            ...(!gpt5 && {
              temperature: currentConfigBlob.completion.params.temperature,
            }),
            ...(allKnowledgeBaseIds.length > 0 && {
              knowledge_base_ids: allKnowledgeBaseIds,
              ...(!gpt5 && { max_num_results: maxNumResults }),
            }),
          },
        },
        ...(currentConfigBlob.input_guardrails?.length && {
          input_guardrails: currentConfigBlob.input_guardrails,
        }),
        ...(currentConfigBlob.output_guardrails?.length && {
          output_guardrails: currentConfigBlob.output_guardrails,
        }),
      };

      const existingConfigMeta = allConfigMeta.find(
        (m) => m.name === currentConfigName.trim(),
      );

      if (existingConfigMeta) {
        const versionCreate: ConfigVersionCreate = {
          config_blob: configBlob,
          commit_message: commitMessage.trim() || `Updated prompt and config`,
        };

        const data = await apiFetch<{ success: boolean; error?: string }>(
          `/api/configs/${existingConfigMeta.id}/versions`,
          apiKey,
          { method: "POST", body: JSON.stringify(versionCreate) },
        );

        if (!data.success) {
          toast.error(
            `Failed to create version: ${data.error || "Unknown error"}`,
          );
          return false;
        }

        toast.success(
          `Configuration "${currentConfigName}" updated! New version created.`,
        );
      } else {
        const configCreate: ConfigCreate = {
          name: currentConfigName.trim(),
          description: `${provider} configuration with prompt`,
          config_blob: configBlob,
          commit_message: commitMessage.trim() || "Initial version",
        };

        const data = await apiFetch<{
          success: boolean;
          data?: unknown;
          error?: string;
        }>("/api/configs", apiKey, {
          method: "POST",
          body: JSON.stringify(configCreate),
        });

        if (!data.success || !data.data) {
          toast.error(
            `Failed to create config: ${data.error || "Unknown error"}`,
          );
          return false;
        }

        toast.success(
          `Configuration "${currentConfigName}" created successfully!`,
        );
      }

      invalidateConfigCache();
      await refetchConfigs(true);
      return true;
    } catch (e) {
      console.error("Failed to save config:", e);
      toast.error("Failed to save configuration. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const renameConfig = async (
    configId: string,
    newName: string,
    currentName: string,
  ): Promise<boolean> => {
    const apiKey = activeKey?.key ?? "";
    if (!isAuthenticated) {
      toast.error("Please log in to rename configurations.");
      return false;
    }
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty.");
      return false;
    }
    if (trimmed === currentName) return true;

    const conflict = allConfigMeta.find(
      (m) => m.name === trimmed && m.id !== configId,
    );
    if (conflict) {
      toast.error(`A configuration named "${trimmed}" already exists.`);
      return false;
    }

    try {
      const data = await apiFetch<{ success: boolean; error?: string }>(
        `/api/configs/${configId}`,
        apiKey,
        { method: "PATCH", body: JSON.stringify({ name: trimmed }) },
      );
      if (!data.success) {
        toast.error(`Failed to rename: ${data.error || "Unknown error"}`);
        return false;
      }
      invalidateConfigCache();
      await refetchConfigs(true);
      toast.success(`Renamed to "${trimmed}"`);
      return true;
    } catch (e) {
      console.error("Failed to rename config:", e);
      toast.error("Failed to rename configuration.");
      return false;
    }
  };

  return { isSaving, saveConfig, renameConfig };
}
