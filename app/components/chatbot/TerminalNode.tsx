"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { ChatbotTerminalNode } from "@/app/lib/types/chatbot";
import { FLOW_HANDLE_STYLE } from "@/app/components/chatbot/flowHandleStyle";

export default function TerminalNode({ type }: NodeProps<ChatbotTerminalNode>) {
  const isInput = type === "input";
  return (
    <div className="px-4 py-2.5 rounded-lg border border-border bg-bg-primary shadow-sm text-sm font-semibold text-text-primary">
      {isInput ? "Input" : "Output"}
      <Handle
        type={isInput ? "source" : "target"}
        position={isInput ? Position.Right : Position.Left}
        style={FLOW_HANDLE_STYLE}
      />
    </div>
  );
}
