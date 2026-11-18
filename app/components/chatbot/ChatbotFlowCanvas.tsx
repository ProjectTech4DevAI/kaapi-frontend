"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  NodeChange,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import AgentNode from "@/app/components/chatbot/AgentNode";
import RouteEdge from "@/app/components/chatbot/RouteEdge";
import TerminalNode from "@/app/components/chatbot/TerminalNode";
import { ChatbotFlowContext } from "@/app/components/chatbot/ChatbotFlowContext";
import { ROUTE_EDGE_TYPE } from "@/app/lib/utils/chatbotFlow";
import {
  AgentNodeData,
  ChatbotFlowEdge,
  ChatbotFlowNode,
  RouteEdgeData,
} from "@/app/lib/types/chatbot";

const NODE_TYPES = {
  input: TerminalNode,
  output: TerminalNode,
  coordinator: AgentNode,
  onboarding: AgentNode,
  rag: AgentNode,
};

const EDGE_TYPES = { [ROUTE_EDGE_TYPE]: RouteEdge };

const DEFAULT_EDGE_OPTIONS = { style: { stroke: "#a3a3a3", strokeWidth: 1 } };

interface ChatbotFlowCanvasProps {
  nodes: ChatbotFlowNode[];
  edges: ChatbotFlowEdge[];
  onNodesChange: (changes: NodeChange<ChatbotFlowNode>[]) => void;
  updateNodeData: (id: string, patch: Partial<AgentNodeData>) => void;
  updateEdgeData: (id: string, patch: Partial<RouteEdgeData>) => void;
}

export default function ChatbotFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  updateNodeData,
  updateEdgeData,
}: ChatbotFlowCanvasProps) {
  const contextValue = useMemo(
    () => ({ updateNodeData, updateEdgeData }),
    [updateNodeData, updateEdgeData],
  );

  return (
    <ChatbotFlowContext.Provider value={contextValue}>
      <ReactFlow
        className="chatbot-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
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
