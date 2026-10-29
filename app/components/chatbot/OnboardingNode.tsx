"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { ChatConfigPicker } from "@/app/components/chat";
import {
  ChatbotOnboardingNode,
  OnboardingNodeData,
} from "@/app/lib/types/chatbot";
import { useChatbotFlowContext } from "@/app/components/chatbot/ChatbotFlowContext";
import { FLOW_HANDLE_STYLE } from "@/app/components/chatbot/flowHandleStyle";
import NodeFieldLabel from "@/app/components/chatbot/NodeFieldLabel";
import LlmNodePromptField from "@/app/components/chatbot/LlmNodePromptField";

const PORT_LABEL_CLASS = "text-sm font-semibold font-mono text-text-primary";

export default function OnboardingNode({
  id,
  data,
  selected,
}: NodeProps<ChatbotOnboardingNode>) {
  const { updateNodeData } = useChatbotFlowContext();
  const update = (patch: Partial<OnboardingNodeData>) =>
    updateNodeData(id, patch);

  return (
    <div
      className={`w-72 rounded-xl border bg-bg-primary shadow-md transition-colors ${
        selected
          ? "border-accent-primary ring-2 ring-accent-primary/20"
          : "border-border"
      }`}
    >
      <div className="px-4 pt-3 pb-1 text-center">
        <p className="text-base font-semibold text-text-primary">Onboarding</p>
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
            configId={data.config_id ?? ""}
            version={data.config_version ?? 0}
            onSelect={(config_id, config_version) =>
              update({ config_id, config_version })
            }
            alignLeft
          />
        </div>

        <LlmNodePromptField
          value={data.prompt ?? ""}
          onChange={(prompt) => update({ prompt })}
        />
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
