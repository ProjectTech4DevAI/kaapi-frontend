"use client";

import { useCallback } from "react";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { Button } from "@/app/components/ui";
import { PlayIcon } from "@/app/components/icons";
import { ChatbotFlowCanvas } from "@/app/components/chatbot";
import { useApp } from "@/app/lib/context/AppContext";
import { useToast } from "@/app/hooks/useToast";
import { useChatbotFlow } from "@/app/hooks/chatbot/useChatbotFlow";
import { useChatbotSession } from "@/app/hooks/chatbot/useChatbotSession";
import { ChatbotNodeData } from "@/app/lib/types/chatbot";

function validateFlow(data: ChatbotNodeData): string | null {
  if (!data.configId) return "Select a configuration and version first.";
  if (!data.systemPrompt.trim()) return "Add a prompt before saving.";
  return null;
}

export default function ChatbotPage() {
  const { sidebarCollapsed } = useApp();
  const toast = useToast();
  const flow = useChatbotFlow();
  const session = useChatbotSession({ listen: false });

  const createSessionFor = useCallback(
    async (data: ChatbotNodeData): Promise<boolean> => {
      const error = validateFlow(data);
      if (error) {
        toast.error(error);
        return false;
      }
      return (await session.startSession(data)) !== null;
    },
    [session, toast],
  );

  const handleSave = async () => {
    if (!flow.llmNode) return;
    const data = flow.llmNode.data;
    if (await createSessionFor(data)) {
      flow.markSaved(data);
      toast.success("Flow saved. A new chat session has started.");
    }
  };

  const handlePlay = () => {
    if (flow.isDirty) {
      toast.error("Save your changes before testing the chatbot.");
      return;
    }
    if (!session.sessionId) {
      toast.error("Save the flow first to start a chat session.");
      return;
    }
    window.open("/chatbot/chat", "_blank", "noopener,noreferrer");
  };

  const canEdit = flow.isDirty && !session.isCreating;

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/chatbot" />

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <PageHeader
            title="Chatbot"
            subtitle="Design a chatbot flow, save it and test it live"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={flow.discard}
                  disabled={!canEdit}
                >
                  Discard changes
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!canEdit}>
                  {session.isCreating ? "Saving…" : "Save"}
                </Button>
              </div>
            }
          />

          <div className="relative flex-1 min-h-0 bg-bg-primary">
            <ChatbotFlowCanvas
              nodes={flow.nodes}
              edges={flow.edges}
              onNodesChange={flow.onNodesChange}
              updateNodeData={flow.updateNodeData}
            />
            <Button
              size="icon"
              onClick={handlePlay}
              title="Test the chatbot"
              aria-label="Test the chatbot"
              className="absolute top-4 left-4 z-10 w-11 h-11 shadow-md"
            >
              <PlayIcon className="w-5 h-5 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
