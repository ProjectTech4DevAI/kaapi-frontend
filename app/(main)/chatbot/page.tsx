/**
 * Chatbot - Design the chatbot flow on a canvas; Save stores it as a
 * server-side session that the test panel chats with.
 */

"use client";

import { useCallback, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { Button } from "@/app/components/ui";
import { ChatbotFlowCanvas, ChatbotTestPanel } from "@/app/components/chatbot";
import { useApp } from "@/app/lib/context/AppContext";
import { useToast } from "@/app/hooks/useToast";
import { useChatbotFlow } from "@/app/hooks/useChatbotFlow";
import { useChatbotSession } from "@/app/hooks/useChatbotSession";
import { useChatbotStore } from "@/app/lib/store/chatbot";
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
  const session = useChatbotSession();
  const savedFlow = useChatbotStore((s) => s.savedFlow);

  // Trigger persisted-state rehydration on mount.
  useEffect(() => {
    useChatbotStore.persist.rehydrate();
  }, []);

  const createSessionFor = useCallback(
    async (data: ChatbotNodeData): Promise<boolean> => {
      const error = validateFlow(data);
      if (error) {
        toast.error(error);
        return false;
      }
      return session.startSession(data);
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

  const handleRestart = async () => {
    if (!savedFlow) {
      toast.error("Save the flow first to start a session.");
      return;
    }
    if (await createSessionFor(savedFlow)) {
      toast.success("New chat session started.");
    }
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

          <div className="flex flex-1 min-h-0">
            <div className="flex-1 min-w-0 bg-bg-primary">
              <ChatbotFlowCanvas
                nodes={flow.nodes}
                edges={flow.edges}
                onNodesChange={flow.onNodesChange}
                onEdgesChange={flow.onEdgesChange}
                onConnect={flow.onConnect}
                updateNodeData={flow.updateNodeData}
              />
            </div>

            <aside className="w-[380px] shrink-0 border-l border-border flex flex-col min-h-0 bg-bg-primary">
              <ChatbotTestPanel
                hasSession={!!session.sessionId}
                sessionName={session.sessionName}
                status={session.status}
                completionStatus={session.completionStatus}
                messages={session.messages}
                isPending={session.isPending}
                isRestarting={session.isCreating}
                isDirty={flow.isDirty}
                onSend={session.send}
                onRestart={handleRestart}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
