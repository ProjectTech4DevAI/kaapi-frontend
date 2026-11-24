"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { ChatConfigPicker } from "@/app/components/chat";
import {
  AgentNodeData,
  AgentNodeType,
  ChatbotAgentNode,
} from "@/app/lib/types/chatbot";
import { useChatbotFlowContext } from "@/app/components/chatbot/ChatbotFlowContext";
import { FLOW_HANDLE_STYLE } from "@/app/components/chatbot/flowHandleStyle";
import NodeFieldLabel from "@/app/components/chatbot/NodeFieldLabel";
import LlmNodePromptField from "@/app/components/chatbot/LlmNodePromptField";

const PORT_LABEL_CLASS = "text-sm font-semibold font-mono text-text-primary";

const AGENT_INFO: Record<
  AgentNodeType,
  { title: string; hint: string; placeholder: string }
> = {
  coordinator: {
    title: "Coordinator",
    hint: "Routes each message to the right agent.",
    placeholder:
      "You are the front desk of Knowledge in Action. Greet users warmly and help them register or answer their questions.",
  },
  onboarding: {
    title: "Onboarding",
    hint: "Collects the fields its prompt asks for.",
    placeholder:
      "Goal: Register a student. Collect name, school and grade, one question at a time.",
  },
  rag: {
    title: "RAG",
    hint: "Answers questions from the config's knowledge base.",
    placeholder:
      "Answer questions about the program using the knowledge base. Keep replies short.",
  },
};

export default function AgentNode({
  id,
  type,
  data,
  selected,
}: NodeProps<ChatbotAgentNode>) {
  const { updateNodeData } = useChatbotFlowContext();
  const update = (patch: Partial<AgentNodeData>) => updateNodeData(id, patch);
  const info = AGENT_INFO[type];

  return (
    <div
      className={`w-72 rounded-xl border bg-bg-primary shadow-md transition-colors ${
        selected
          ? "border-accent-primary ring-2 ring-accent-primary/20"
          : "border-border"
      }`}
    >
      <div className="px-4 pt-3 pb-1 text-center">
        <p className="text-base font-semibold text-text-primary">
          {info.title}
        </p>
        <p className="text-[11px] text-text-secondary truncate">{id}</p>
        <p className="mt-1 text-xs text-text-secondary">{info.hint}</p>
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
          placeholder={info.placeholder}
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
