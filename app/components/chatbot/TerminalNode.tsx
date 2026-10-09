/**
 * TerminalNode - Fixed "Input" / "Output" pill marking where the flow starts and ends.
 */

"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { ChatbotTerminalNode } from "@/app/lib/types/chatbot";
import { FLOW_HANDLE_STYLE } from "@/app/components/chatbot/flowHandleStyle";

export default function TerminalNode({
  type,
  data,
}: NodeProps<ChatbotTerminalNode>) {
  const isInput = type === "flowInput";
  return (
    <div className="px-4 py-2.5 rounded-lg border border-border bg-bg-primary shadow-sm text-sm font-semibold text-text-primary">
      {data.label}
      <Handle
        type={isInput ? "source" : "target"}
        position={isInput ? Position.Right : Position.Left}
        style={FLOW_HANDLE_STYLE}
      />
    </div>
  );
}
