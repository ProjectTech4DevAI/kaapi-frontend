"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEdge,
  Connection,
  Edge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { DEFAULT_CHATBOT_NAME } from "@/app/lib/constants";
import { useChatbotStore } from "@/app/lib/store/chatbot";
import {
  ChatbotFlowNode,
  ChatbotLlmNode,
  ChatbotNodeData,
} from "@/app/lib/types/chatbot";

const INPUT_ID = "input";
const OUTPUT_ID = "output";
// Fixed so server and client render the same id (avoids hydration mismatch).
const LLM_ID = "LLMResponseWithPrompt-1";

const DEFAULT_NODE_DATA: ChatbotNodeData = {
  label: DEFAULT_CHATBOT_NAME,
  systemPrompt: "",
  configId: "",
  configVersion: undefined,
};

function createInitialFlow(): { nodes: ChatbotFlowNode[]; edges: Edge[] } {
  return {
    nodes: [
      {
        id: INPUT_ID,
        type: "flowInput",
        position: { x: 0, y: 55 },
        data: { label: "Input" },
        deletable: false,
      },
      {
        id: LLM_ID,
        type: "llm",
        position: { x: 260, y: 0 },
        data: DEFAULT_NODE_DATA,
        deletable: false,
      },
      {
        id: OUTPUT_ID,
        type: "flowOutput",
        position: { x: 640, y: 230 },
        data: { label: "Output" },
        deletable: false,
      },
    ],
    edges: [
      { id: `${INPUT_ID}->${LLM_ID}`, source: INPUT_ID, target: LLM_ID },
      { id: `${LLM_ID}->${OUTPUT_ID}`, source: LLM_ID, target: OUTPUT_ID },
    ],
  };
}

function isLlmNode(node: ChatbotFlowNode): node is ChatbotLlmNode {
  return node.type === "llm";
}

function isSameData(a: ChatbotNodeData, b: ChatbotNodeData): boolean {
  return (
    a.label === b.label &&
    a.systemPrompt === b.systemPrompt &&
    a.configId === b.configId &&
    (a.configVersion ?? null) === (b.configVersion ?? null)
  );
}

/**
 * Owns the canvas graph (Input → LLM → Output) and tracks the LLM node's
 * edits against the last saved version, for the Save / Discard buttons.
 */
export function useChatbotFlow() {
  const [initial] = useState(createInitialFlow);
  const [nodes, setNodes, onNodesChange] = useNodesState<ChatbotFlowNode>(
    initial.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);

  const savedFlow = useChatbotStore((s) => s.savedFlow);
  const hasHydrated = useChatbotStore((s) => s.hasHydrated);
  const setSavedFlow = useChatbotStore((s) => s.setSavedFlow);

  const llmNode = nodes.find(isLlmNode) ?? null;
  const baseline = savedFlow ?? DEFAULT_NODE_DATA;
  const isDirty = !!llmNode && !isSameData(llmNode.data, baseline);

  const replaceNodeData = useCallback(
    (data: ChatbotNodeData) => {
      setNodes((prev) =>
        prev.map((n) => (isLlmNode(n) ? { ...n, data: { ...data } } : n)),
      );
    },
    [setNodes],
  );

  // Mirror the saved flow into the node whenever it changes (localStorage
  // rehydration, or the latest session restored from the backend), unless the
  // user has unsaved edits against the previously applied version.
  const appliedRef = useRef<ChatbotNodeData>(DEFAULT_NODE_DATA);
  useEffect(() => {
    if (!hasHydrated || !savedFlow || !llmNode) return;
    const untouched = isSameData(llmNode.data, appliedRef.current);
    appliedRef.current = savedFlow;
    if (untouched) replaceNodeData(savedFlow);
  }, [hasHydrated, savedFlow, replaceNodeData]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const updateNodeData = useCallback(
    (id: string, patch: Partial<ChatbotNodeData>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id && isLlmNode(n)
            ? { ...n, data: { ...n.data, ...patch } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const discard = useCallback(
    () => replaceNodeData(baseline),
    [baseline, replaceNodeData],
  );

  const markSaved = useCallback(
    (data: ChatbotNodeData) => setSavedFlow({ ...data }),
    [setSavedFlow],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    updateNodeData,
    llmNode,
    isDirty,
    discard,
    markSaved,
  };
}
