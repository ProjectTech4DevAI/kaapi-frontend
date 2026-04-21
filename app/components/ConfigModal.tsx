/**
 * ConfigModal - Displays detailed configuration for an evaluation job
 * Shows assistant config, model, temperature, instructions, tools, and vector stores
 */

"use client";

import React, { useState, useEffect } from "react";
import { colors } from "@/app/lib/colors";
import CopyableCodeBlock from "@/app/components/CopyableCodeBlock";
import CodeBlock from "@/app/components/CodeBlock";
import Tag from "@/app/components/Tag";
import { CloseIcon } from "@/app/components/icons";
import { EvalJob, AssistantConfig } from "@/app/lib/types/evaluation";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import {
  Tool,
  ConfigVersionPublic,
  CompletionParams,
} from "@/app/lib/types/configs";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: EvalJob;
  assistantConfig?: AssistantConfig | null;
}

interface ConfigVersionInfo {
  name: string;
  version: number;
  model?: string;
  instructions?: string;
  temperature?: number;
  tools?: Tool[];
  provider?: string;
  type?: "text" | "stt" | "tts";
  knowledge_base_ids?: string[];
}

const ConfigField = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <div
      className="text-xs font-medium mb-1.5"
      style={{ color: colors.text.secondary }}
    >
      {label}
    </div>
    {children}
  </div>
);

export default function ConfigModal({
  isOpen,
  onClose,
  job,
  assistantConfig,
}: ConfigModalProps) {
  const { activeKey, isAuthenticated } = useAuth();
  const [configVersionInfo, setConfigVersionInfo] =
    useState<ConfigVersionInfo | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Fetch full config version details when modal opens
  useEffect(() => {
    if (!isOpen || !job.config_id || !job.config_version) {
      setConfigVersionInfo(null);
      return;
    }

    const fetchConfigVersionInfo = async () => {
      if (!isAuthenticated) return;
      const apiKey = activeKey?.key ?? "";

      setIsLoadingConfig(true);
      try {
        // Fetch config name first
        const configData = await apiFetch<{
          success: boolean;
          data?: { name: string };
        }>(`/api/configs/${job.config_id}`, apiKey);
        const configName =
          configData.success && configData.data ? configData.data.name : null;

        // Fetch full version details including config_blob
        const versionData = await apiFetch<{
          success: boolean;
          data?: ConfigVersionPublic;
        }>(
          `/api/configs/${job.config_id}/versions/${job.config_version}`,
          apiKey,
        );
        if (versionData.success && versionData.data) {
          const blob = versionData.data.config_blob;
          const params: CompletionParams =
            blob?.completion?.params || ({} as CompletionParams);

          const knowledgeBaseIds: string[] = [];

          // Check direct params.knowledge_base_ids
          if (Array.isArray(params.knowledge_base_ids)) {
            knowledgeBaseIds.push(...params.knowledge_base_ids);
          }

          // Check tools array for knowledge_base_ids
          if (params.tools) {
            const toolKbIds = params.tools
              .filter(
                (tool: Tool) =>
                  Array.isArray(tool.knowledge_base_ids) &&
                  tool.knowledge_base_ids.length > 0,
              )
              .flatMap((tool: Tool) => tool.knowledge_base_ids);
            knowledgeBaseIds.push(...toolKbIds);
          }

          const uniqueKbIds = [...new Set(knowledgeBaseIds)];

          setConfigVersionInfo({
            name: configName || "Unknown Config",
            version: job.config_version!,
            model: params.model,
            instructions: params.instructions,
            temperature: params.temperature,
            tools: params.tools,
            provider: blob?.completion?.provider,
            type: blob?.completion?.type || "text",
            knowledge_base_ids:
              uniqueKbIds.length > 0 ? uniqueKbIds : undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching config version info:", error);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchConfigVersionInfo();
  }, [isOpen, job.config_id, job.config_version, activeKey]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg shadow-xl flex flex-col"
        style={{ backgroundColor: colors.bg.primary, maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: colors.border }}
        >
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: colors.text.primary }}
            >
              {configVersionInfo?.name || "Configuration"}
              {configVersionInfo?.version && (
                <span
                  className="text-xs font-normal ml-1.5"
                  style={{ color: colors.text.secondary }}
                >
                  v{configVersionInfo.version}
                </span>
              )}
            </h3>
            {configVersionInfo?.provider && (
              <p
                className="text-xs mt-0.5"
                style={{ color: colors.text.secondary }}
              >
                {configVersionInfo.provider}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded"
            style={{ color: colors.text.secondary }}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isLoadingConfig ? (
            <div className="py-8 text-center">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                style={{
                  borderColor: colors.text.secondary,
                  borderTopColor: "transparent",
                }}
              />
              <p className="text-xs" style={{ color: colors.text.secondary }}>
                Loading configuration...
              </p>
            </div>
          ) : (
            <>
              {assistantConfig?.name && (
                <ConfigField label="Assistant">
                  <div
                    className="text-sm font-medium"
                    style={{ color: colors.text.primary }}
                  >
                    {assistantConfig.name}
                  </div>
                </ConfigField>
              )}

              {job.assistant_id && (
                <ConfigField label="Assistant ID">
                  <div
                    className="text-xs font-mono"
                    style={{ color: colors.text.primary }}
                  >
                    {job.assistant_id}
                  </div>
                </ConfigField>
              )}

              <ConfigField label="Model">
                <Tag>
                  {configVersionInfo?.model ||
                    assistantConfig?.model ||
                    job.config?.model ||
                    "N/A"}
                </Tag>
              </ConfigField>

              {(configVersionInfo?.temperature !== undefined ||
                assistantConfig?.temperature !== undefined ||
                job.config?.temperature !== undefined) && (
                <ConfigField label="Temperature">
                  <Tag>
                    {configVersionInfo?.temperature !== undefined
                      ? configVersionInfo.temperature
                      : assistantConfig?.temperature !== undefined
                        ? assistantConfig.temperature
                        : job.config?.temperature}
                  </Tag>
                </ConfigField>
              )}

              {configVersionInfo?.knowledge_base_ids &&
                configVersionInfo.knowledge_base_ids.length > 0 && (
                  <ConfigField label="Knowledge Base IDs">
                    <CopyableCodeBlock
                      copyText={configVersionInfo.knowledge_base_ids.join("\n")}
                    >
                      {configVersionInfo.knowledge_base_ids.join("\n")}
                    </CopyableCodeBlock>
                  </ConfigField>
                )}

              {(configVersionInfo?.instructions ||
                assistantConfig?.instructions ||
                job.config?.instructions) && (
                <ConfigField label="Instructions">
                  <CopyableCodeBlock
                    copyText={
                      (configVersionInfo?.instructions ||
                        assistantConfig?.instructions ||
                        job.config?.instructions) as string
                    }
                  >
                    {configVersionInfo?.instructions ||
                      assistantConfig?.instructions ||
                      job.config?.instructions}
                  </CopyableCodeBlock>
                </ConfigField>
              )}

              {Array.isArray(configVersionInfo?.tools) &&
                configVersionInfo.tools.length > 0 && (
                  <ConfigField label="Tools">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {configVersionInfo.tools.map((tool, idx) => (
                          <Tag key={idx}>{tool.type}</Tag>
                        ))}
                      </div>
                      {configVersionInfo.tools.map((tool, idx) => (
                        <React.Fragment key={`tool-details-${idx}`}>
                          {Array.isArray(tool.knowledge_base_ids) &&
                            tool.knowledge_base_ids.length > 0 && (
                              <div>
                                <div
                                  className="text-xs font-medium mb-1"
                                  style={{ color: colors.text.secondary }}
                                >
                                  Knowledge Base IDs ({tool.type})
                                </div>
                                <CodeBlock>
                                  {tool.knowledge_base_ids.join("\n")}
                                </CodeBlock>
                              </div>
                            )}
                          {tool.max_num_results !== undefined && (
                            <div>
                              <div
                                className="text-xs font-medium mb-1"
                                style={{ color: colors.text.secondary }}
                              >
                                Max Results ({tool.type})
                              </div>
                              <div
                                className="text-sm"
                                style={{ color: colors.text.primary }}
                              >
                                {String(tool.max_num_results)}
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </ConfigField>
                )}

              {Array.isArray(job.config?.tools) &&
                job.config.tools.length > 0 &&
                !configVersionInfo?.tools?.length && (
                  <ConfigField label="Tools">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {job.config.tools.map((tool: any, idx) => (
                          <Tag key={idx}>{tool.type}</Tag>
                        ))}
                      </div>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {job.config.tools.map((tool: any, idx: number) => (
                        <React.Fragment key={`tool-details-${idx}`}>
                          {Array.isArray(tool.knowledge_base_ids) &&
                            tool.knowledge_base_ids.length > 0 && (
                              <div>
                                <div
                                  className="text-xs font-medium mb-1"
                                  style={{ color: colors.text.secondary }}
                                >
                                  Knowledge Base IDs ({tool.type})
                                </div>
                                <CodeBlock>
                                  {tool.knowledge_base_ids.join("\n")}
                                </CodeBlock>
                              </div>
                            )}
                          {tool.max_num_results !== undefined && (
                            <div>
                              <div
                                className="text-xs font-medium mb-1"
                                style={{ color: colors.text.secondary }}
                              >
                                Max Results ({tool.type})
                              </div>
                              <div
                                className="text-sm"
                                style={{ color: colors.text.primary }}
                              >
                                {String(tool.max_num_results)}
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </ConfigField>
                )}

              {Array.isArray(assistantConfig?.knowledge_base_ids) &&
                assistantConfig.knowledge_base_ids.length > 0 && (
                  <ConfigField label="Knowledge Base IDs">
                    <CodeBlock>
                      {assistantConfig.knowledge_base_ids.join("\n")}
                    </CodeBlock>
                  </ConfigField>
                )}

              {Array.isArray(job.config?.include) &&
                job.config.include.length > 0 && (
                  <ConfigField label="Include">
                    <div className="flex flex-wrap gap-2">
                      {job.config.include.map((item, idx) => (
                        <Tag key={idx}>{item}</Tag>
                      ))}
                    </div>
                  </ConfigField>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
