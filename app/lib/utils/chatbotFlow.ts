import type { Edge } from "@xyflow/react";
import type {
  ChatbotFlowGraph,
  ChatbotFlowNode,
} from "@/app/lib/types/chatbot";

const INPUT_ID = "input";
const OUTPUT_ID = "output";

function newAgentNodeId(): string {
  return `LLMResponseWithPrompt-${Math.random().toString(16).slice(2, 7)}`;
}

export function createDefaultFlow(): ChatbotFlowGraph {
  const agentId = newAgentNodeId();
  return {
    nodes: [
      { id: INPUT_ID, type: "input", position: { x: 0, y: 55 }, data: {} },
      { id: agentId, type: "onboarding", position: { x: 260, y: 0 }, data: {} },
      { id: OUTPUT_ID, type: "output", position: { x: 640, y: 230 }, data: {} },
    ],
    edges: [
      { id: `${INPUT_ID}->${agentId}`, source: INPUT_ID, target: agentId },
      { id: `${agentId}->${OUTPUT_ID}`, source: agentId, target: OUTPUT_ID },
    ],
  };
}

export function toFlowPayload(
  nodes: ChatbotFlowNode[],
  edges: Edge[],
): ChatbotFlowGraph {
  return {
    nodes: nodes.map(
      ({ id, type, position, data }) =>
        ({ id, type, position, data }) as ChatbotFlowNode,
    ),
    edges: edges.map(({ id, source, target }) => ({ id, source, target })),
  };
}

export function flowSignature(flow: ChatbotFlowGraph): string {
  const { nodes, edges } = toFlowPayload(flow.nodes, flow.edges);
  return JSON.stringify({ nodes, edges });
}
