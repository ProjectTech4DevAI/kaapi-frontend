/**
 * LlmNode - Editable LLM step on the chatbot canvas: config, prompt and limits
 * are edited inline, mirroring the node's data used by the test panel.
 */

"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { ChatConfigPicker } from "@/app/components/chat";
import { ChatbotLlmNode, ChatbotNodeData } from "@/app/lib/types/chatbot";
import { useChatbotFlowContext } from "@/app/components/chatbot/ChatbotFlowContext";
import { FLOW_HANDLE_STYLE } from "@/app/components/chatbot/flowHandleStyle";
import NodeFieldLabel from "@/app/components/chatbot/NodeFieldLabel";
import LlmNodePromptField from "@/app/components/chatbot/LlmNodePromptField";
import LlmNodeAdvanced from "@/app/components/chatbot/LlmNodeAdvanced";

const PORT_LABEL_CLASS = "text-sm font-semibold font-mono text-text-primary";

export default function LlmNode({
  id,
  data,
  selected,
}: NodeProps<ChatbotLlmNode>) {
  const { updateNodeData } = useChatbotFlowContext();
  const update = (patch: Partial<ChatbotNodeData>) => updateNodeData(id, patch);

  return (
    <div
      className={`w-72 rounded-xl border bg-bg-primary shadow-md transition-colors ${
        selected
          ? "border-accent-primary ring-2 ring-accent-primary/20"
          : "border-border"
      }`}
    >
      <div className="relative px-4 pt-3 pb-1 text-center">
        <input
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Untitled step"
          className="nodrag w-full px-6 text-center text-base font-semibold text-text-primary bg-transparent focus:outline-none"
        />
        <p className="text-[11px] text-text-secondary truncate">{id}</p>
      </div>

      <div className="relative px-4 py-1">
        <Handle
          type="target"
          position={Position.Left}
          style={FLOW_HANDLE_STYLE}
        />
        <span className={PORT_LABEL_CLASS}>Input</span>
      </div>

      <div className="px-4 pt-2 pb-3 space-y-3">
        <div className="nodrag nowheel">
          <NodeFieldLabel
            label="Configuration"
            hint="Saved config and version used to call the model."
          />
          <ChatConfigPicker
            configId={data.configId}
            version={data.configVersion ?? 0}
            onSelect={(configId, configVersion) =>
              update({ configId, configVersion })
            }
            alignLeft
          />
        </div>

        <LlmNodePromptField
          value={data.systemPrompt}
          onChange={(systemPrompt) => update({ systemPrompt })}
        />

        <LlmNodeAdvanced data={data} onChange={update} />
      </div>

      <div className="relative px-4 py-2.5 border-t-2 border-text-primary text-right">
        <span className={PORT_LABEL_CLASS}>Output</span>
        <Handle
          type="source"
          position={Position.Right}
          style={FLOW_HANDLE_STYLE}
        />
      </div>
    </div>
  );
}
