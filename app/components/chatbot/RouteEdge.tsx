"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { ChatbotFlowEdge } from "@/app/lib/types/chatbot";
import { useChatbotFlowContext } from "@/app/components/chatbot/ChatbotFlowContext";

const FIELD_CLASS =
  "w-full px-2 py-1 rounded-md border border-border text-xs placeholder:text-neutral-400 focus:outline-none focus:border-accent-primary";
const INPUT_CLASS = `${FIELD_CLASS} bg-bg-primary text-text-primary`;
const READONLY_CLASS = `${FIELD_CLASS} bg-bg-secondary text-text-secondary cursor-not-allowed`;

/**
 * Coordinator → agent edge. Its card shows the route the coordinator picks:
 * a fixed `intent` label and an editable `description` (when to send users
 * here), which the coordinator reads to decide.
 */
export default function RouteEdge({
  id,
  data,
  style,
  markerEnd,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps<ChatbotFlowEdge>) {
  const { updateEdgeData } = useChatbotFlowContext();
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute w-52 p-2 space-y-1.5 rounded-lg bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <p className="text-[11px] font-semibold text-text-secondary">Route</p>
          <input
            value={data?.intent ?? ""}
            disabled
            aria-label="Route intent"
            className={`${READONLY_CLASS} font-mono`}
          />
          <input
            value={data?.description ?? ""}
            onChange={(e) =>
              updateEdgeData(id, { description: e.target.value })
            }
            placeholder="When to route here"
            aria-label="Route description"
            className={INPUT_CLASS}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
