"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  NodeChange,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import LlmNode from "@/app/components/chatbot/LlmNode";
import TerminalNode from "@/app/components/chatbot/TerminalNode";
import { ChatbotFlowContext } from "@/app/components/chatbot/ChatbotFlowContext";
import { ChatbotFlowNode, ChatbotNodeData } from "@/app/lib/types/chatbot";

const NODE_TYPES = {
  llm: LlmNode,
  flowInput: TerminalNode,
  flowOutput: TerminalNode,
};

const DEFAULT_EDGE_OPTIONS = { style: { stroke: "#a3a3a3", strokeWidth: 1 } };

interface ChatbotFlowCanvasProps {
  nodes: ChatbotFlowNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<ChatbotFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  onConnect: (connection: Connection) => void;
  onSelectNode: (id: string) => void;
  updateNodeData: (id: string, patch: Partial<ChatbotNodeData>) => void;
}

export default function ChatbotFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode,
  updateNodeData,
}: ChatbotFlowCanvasProps) {
  const contextValue = useMemo(() => ({ updateNodeData }), [updateNodeData]);

  return (
    <ChatbotFlowContext.Provider value={contextValue}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onSelectNode(node.id)}
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
