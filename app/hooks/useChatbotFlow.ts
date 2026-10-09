"use client";

import { useCallback, useState } from "react";
import {
  addEdge,
  Connection,
  Edge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import {
  CHATBOT_DEFAULT_HISTORY_TOKEN_LIMIT,
  CHATBOT_DEFAULT_MAX_TOKENS,
} from "@/app/lib/constants";
import {
  ChatbotFlowNode,
  ChatbotLlmNode,
  ChatbotNodeData,
} from "@/app/lib/types/chatbot";

const INPUT_ID = "input";
const OUTPUT_ID = "output";
const LLM_ID_PREFIX = "LLMResponseWithPrompt";
const INITIAL_LLM_ID = `${LLM_ID_PREFIX}-1`;

function shortId(): string {
  return Math.random().toString(16).slice(2, 7);
}

function createLlmNode(
  position: { x: number; y: number },
  label = "New step",
  id = `${LLM_ID_PREFIX}-${shortId()}`,
): ChatbotLlmNode {
  return {
    id,
    type: "llm",
    position,
    data: {
      label,
      systemPrompt: "",
      configId: "",
      configVersion: undefined,
      maxTokens: CHATBOT_DEFAULT_MAX_TOKENS,
      historyTokenLimit: CHATBOT_DEFAULT_HISTORY_TOKEN_LIMIT,
    },
  };
}

function createInitialFlow(): { nodes: ChatbotFlowNode[]; edges: Edge[] } {
  const llm = createLlmNode({ x: 260, y: 0 }, "Onboarding", INITIAL_LLM_ID);
  return {
    nodes: [
      {
        id: INPUT_ID,
        type: "flowInput",
        position: { x: 0, y: 55 },
        data: { label: "Input" },
        deletable: false,
      },
      llm,
      {
        id: OUTPUT_ID,
        type: "flowOutput",
        position: { x: 640, y: 270 },
        data: { label: "Output" },
        deletable: false,
      },
    ],
    edges: [
      { id: `${INPUT_ID}->${llm.id}`, source: INPUT_ID, target: llm.id },
      { id: `${llm.id}->${OUTPUT_ID}`, source: llm.id, target: OUTPUT_ID },
    ],
  };
}

function isLlmNode(node: ChatbotFlowNode): node is ChatbotLlmNode {
  return node.type === "llm";
}

/** Owns the in-memory (unsaved) chatbot flow graph and the node under test. */
export function useChatbotFlow() {
  const [initial] = useState(createInitialFlow);
  const [nodes, setNodes, onNodesChange] = useNodesState<ChatbotFlowNode>(
    initial.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const llmNodes = nodes.filter(isLlmNode);
  // Fall back to the first LLM node so the test panel always has a target.
  const selectedNode =
    llmNodes.find((n) => n.id === selectedId) ?? llmNodes[0] ?? null;

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const addNode = useCallback(() => {
    const node = createLlmNode({ x: 260, y: 160 + llmNodes.length * 60 });
    setNodes((prev) => [...prev, node]);
    setSelectedId(node.id);
  }, [llmNodes.length, setNodes]);

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

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNode,
    setSelectedId,
    addNode,
    updateNodeData,
  };
}
