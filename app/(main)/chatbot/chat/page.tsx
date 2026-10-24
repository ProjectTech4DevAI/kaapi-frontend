"use client";

import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { Button } from "@/app/components/ui";
import { RefreshIcon } from "@/app/components/icons";
import {
  ChatbotBreadcrumb,
  ChatbotChatWindow,
  ChatbotStatusBadge,
} from "@/app/components/chatbot";
import { useApp } from "@/app/lib/context/AppContext";
import { useToast } from "@/app/hooks/useToast";
import { useChatbotSession } from "@/app/hooks/chatbot/useChatbotSession";
import { useChatbotStore } from "@/app/lib/store/chatbot";

export default function ChatbotChatPage() {
  const { sidebarCollapsed } = useApp();
  const toast = useToast();
  const session = useChatbotSession();
  const savedFlow = useChatbotStore((s) => s.savedFlow);

  const handleRestart = async () => {
    if (!savedFlow) {
      toast.error("Save the flow first to start a session.");
      return;
    }
    if (await session.startSession(savedFlow)) {
      toast.success("New chat session started.");
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/chatbot" />

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <PageHeader
            actions={
              session.sessionId ? (
                <div className="flex items-center gap-2">
                  <ChatbotStatusBadge
                    status={session.status}
                    completionStatus={session.completionStatus}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRestart}
                    disabled={session.isCreating || session.isPending}
                    title="Start a new session with the saved flow"
                    aria-label="Restart session"
                  >
                    <RefreshIcon className="w-4 h-4" />
                  </Button>
                </div>
              ) : null
            }
          >
            <ChatbotBreadcrumb
              name={session.sessionName}
              sessionId={session.sessionId}
            />
          </PageHeader>

          <ChatbotChatWindow
            hasSession={!!session.sessionId}
            status={session.status}
            messages={session.messages}
            isPending={session.isPending}
            onSend={session.send}
          />
        </div>
      </div>
    </div>
  );
}
