"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNodesState } from "@xyflow/react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import {
  getChatbotFlow,
  publishChatbotFlow,
  saveChatbotFlow,
} from "@/app/lib/chatbotClient";
import {
  createDefaultFlow,
  flowSignature,
  isAgentType,
  toFlowPayload,
  withRouteEdges,
} from "@/app/lib/utils/chatbotFlow";
import {
  AgentNodeData,
  ChatbotFlowEdge,
  ChatbotFlowGraph,
  ChatbotFlowNode,
  RouteEdgeData,
} from "@/app/lib/types/chatbot";

interface FlowVersion {
  version: number;
  isLive: boolean;
}

export function useChatbotFlow(chatbotId: string) {
  const { activeKey, isAuthenticated, isHydrated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const toast = useToast();

  const [nodes, setNodes, onNodesChange] = useNodesState<ChatbotFlowNode>([]);
  const [edges, setEdges] = useState<ChatbotFlowEdge[]>([]);
  const [saved, setSaved] = useState<ChatbotFlowGraph | null>(null);
  const [flowVersion, setFlowVersion] = useState<FlowVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Nodes are fixed (no add/delete), so lock them on the canvas.
  const showFlow = useCallback(
    (flow: ChatbotFlowGraph) => {
      const shown = withRouteEdges(flow);
      setNodes(shown.nodes.map((n) => ({ ...n, deletable: false })));
      setEdges(shown.edges);
      setSaved(flow);
    },
    [setNodes],
  );

  // Load: saved flow, or a fresh default canvas when nothing is saved yet.
  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);
    getChatbotFlow(chatbotId, apiKey)
      .then((flow) => {
        if (cancelled) return;
        if (flow) {
          showFlow({ nodes: flow.nodes, edges: flow.edges });
          setFlowVersion({ version: flow.version, isLive: flow.is_live });
        } else {
          showFlow(createDefaultFlow());
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load the flow.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chatbotId, apiKey, isAuthenticated, isHydrated, showFlow]);

  const savedSignature = useMemo(
    () => (saved ? flowSignature(saved) : null),
    [saved],
  );
  const isDirty =
    savedSignature !== null &&
    flowSignature({ nodes, edges }) !== savedSignature;

  const updateNodeData = useCallback(
    (id: string, patch: Partial<AgentNodeData>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id && isAgentType(n.type)
            ? { ...n, data: { ...n.data, ...patch } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const updateEdgeData = useCallback(
    (id: string, patch: Partial<RouteEdgeData>) => {
      setEdges((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, data: { ...e.data, ...patch } } : e,
        ),
      );
    },
    [],
  );

  /**
   * Saves the canvas. The first save goes live directly (and is fully
   * validated, so it may fail with 422); later saves are drafts.
   */
  const save = useCallback(async (): Promise<boolean> => {
    const payload = toFlowPayload(nodes, edges);
    setIsSaving(true);
    try {
      const flow = await saveChatbotFlow(chatbotId, payload, apiKey);
      setSaved(payload);
      setFlowVersion({ version: flow.version, isLive: flow.is_live });
      toast.success(
        flow.is_live
          ? `Saved and live (version ${flow.version}).`
          : `Draft saved (version ${flow.version}). Publish to make it live.`,
      );
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the flow.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, chatbotId, edges, nodes, toast]);

  const publish = useCallback(async (): Promise<void> => {
    setIsPublishing(true);
    try {
      const flow = await publishChatbotFlow(chatbotId, apiKey);
      setFlowVersion({ version: flow.version, isLive: flow.is_live });
      toast.success(`Published version ${flow.version}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish the flow.",
      );
    } finally {
      setIsPublishing(false);
    }
  }, [apiKey, chatbotId, toast]);

  const discard = useCallback(() => {
    if (saved) showFlow(saved);
  }, [saved, showFlow]);

  return {
    nodes,
    edges,
    onNodesChange,
    updateNodeData,
    updateEdgeData,
    isLoading,
    isDirty,
    isSaving,
    isPublishing,
    flowVersion,
    save,
    publish,
    discard,
  };
}
