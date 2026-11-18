import type {
  AgentNodeType,
  ChatbotFlowEdge,
  ChatbotFlowGraph,
  ChatbotFlowNode,
} from "@/app/lib/types/chatbot";

const INPUT_ID = "input";
const OUTPUT_ID = "output";

export const ROUTE_EDGE_TYPE = "route";

const AGENT_NODE_TYPES: AgentNodeType[] = ["coordinator", "onboarding", "rag"];

export function isAgentType(type: string | undefined): type is AgentNodeType {
  return AGENT_NODE_TYPES.includes(type as AgentNodeType);
}

function newAgentNodeId(): string {
  return `LLMResponseWithPrompt-${Math.random().toString(16).slice(2, 7)}`;
}

export function createDefaultFlow(): ChatbotFlowGraph {
  const coordinatorId = newAgentNodeId();
  const onboardingId = newAgentNodeId();
  const ragId = newAgentNodeId();

  return {
    nodes: [
      { id: INPUT_ID, type: "input", position: { x: 0, y: 200 }, data: {} },
      {
        id: coordinatorId,
        type: "coordinator",
        position: { x: 220, y: 40 },
        data: {},
      },
      {
        id: onboardingId,
        type: "onboarding",
        position: { x: 820, y: -260 },
        data: {},
      },
      { id: ragId, type: "rag", position: { x: 820, y: 300 }, data: {} },
      {
        id: OUTPUT_ID,
        type: "output",
        position: { x: 1300, y: 200 },
        data: {},
      },
    ],
    edges: [
      {
        id: `${INPUT_ID}->${coordinatorId}`,
        source: INPUT_ID,
        target: coordinatorId,
      },
      {
        id: `${coordinatorId}->${onboardingId}`,
        source: coordinatorId,
        target: onboardingId,
        data: {
          intent: "onboarding",
          description: "The user wants to register or share their details.",
        },
      },
      {
        id: `${coordinatorId}->${ragId}`,
        source: coordinatorId,
        target: ragId,
        data: {
          intent: "questions",
          description: "The user asks a question about the program.",
        },
      },
      {
        id: `${onboardingId}->${OUTPUT_ID}`,
        source: onboardingId,
        target: OUTPUT_ID,
      },
      { id: `${ragId}->${OUTPUT_ID}`, source: ragId, target: OUTPUT_ID },
    ],
  };
}

/** Marks coordinator → agent edges as route edges so their intent is editable. */
export function withRouteEdges(flow: ChatbotFlowGraph): ChatbotFlowGraph {
  const coordinatorIds = new Set(
    flow.nodes.filter((n) => n.type === "coordinator").map((n) => n.id),
  );
  return {
    nodes: flow.nodes,
    edges: flow.edges.map((edge) =>
      coordinatorIds.has(edge.source)
        ? { ...edge, type: ROUTE_EDGE_TYPE }
        : edge,
    ),
  };
}

export function toFlowPayload(
  nodes: ChatbotFlowNode[],
  edges: ChatbotFlowEdge[],
): ChatbotFlowGraph {
  return {
    nodes: nodes.map(
      ({ id, type, position, data }) =>
        ({ id, type, position, data }) as ChatbotFlowNode,
    ),
    edges: edges.map(({ id, source, target, data }) =>
      data && Object.keys(data).length > 0
        ? { id, source, target, data }
        : { id, source, target },
    ),
  };
}

export function flowSignature(flow: ChatbotFlowGraph): string {
  const { nodes, edges } = toFlowPayload(flow.nodes, flow.edges);
  return JSON.stringify({ nodes, edges });
}
