"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  NodeChange,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import OnboardingNode from "@/app/components/chatbot/OnboardingNode";
import TerminalNode from "@/app/components/chatbot/TerminalNode";
import { ChatbotFlowContext } from "@/app/components/chatbot/ChatbotFlowContext";
import { ChatbotFlowNode, OnboardingNodeData } from "@/app/lib/types/chatbot";

const NODE_TYPES = {
  input: TerminalNode,
  output: TerminalNode,
  onboarding: OnboardingNode,
};

const DEFAULT_EDGE_OPTIONS = { style: { stroke: "#a3a3a3", strokeWidth: 1 } };

interface ChatbotFlowCanvasProps {
  nodes: ChatbotFlowNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<ChatbotFlowNode>[]) => void;
  updateNodeData: (id: string, patch: Partial<OnboardingNodeData>) => void;
}

export default function ChatbotFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  updateNodeData,
}: ChatbotFlowCanvasProps) {
  const contextValue = useMemo(() => ({ updateNodeData }), [updateNodeData]);

  return (
    <ChatbotFlowContext.Provider value={contextValue}>
      <ReactFlow
        className="chatbot-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        onNodesChange={onNodesChange}
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} />
        <Controls />
      </ReactFlow>
    </ChatbotFlowContext.Provider>
  );
}
