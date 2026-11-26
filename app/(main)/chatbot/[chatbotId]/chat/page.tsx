"use client";

import { useParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { Button } from "@/app/components/ui";
import { RefreshIcon } from "@/app/components/icons";
import {
  ChatbotBreadcrumb,
  ChatbotChatWindow,
  ChatbotStatusBadge,
} from "@/app/components/chatbot";
import type { BreadcrumbItem } from "@/app/components/chatbot/ChatbotBreadcrumb";
import { useApp } from "@/app/lib/context/AppContext";
import { useChatbot } from "@/app/hooks/chatbot/useChatbot";
import { useChatbotSession } from "@/app/hooks/chatbot/useChatbotSession";

export default function ChatbotChatPage() {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const { sidebarCollapsed } = useApp();
  const { chatbot } = useChatbot(chatbotId);
  const session = useChatbotSession(chatbotId);

  const breadcrumb: BreadcrumbItem[] = [
    { label: chatbot?.name ?? "…", href: `/chatbot/${chatbotId}` },
  ];
  if (session.sessionId)
    breadcrumb.push({ label: session.sessionId, muted: true });

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
                    onClick={session.startChat}
                    disabled={session.isStarting || session.isPending}
                    title="Start a new session"
                    aria-label="Restart session"
                  >
                    <RefreshIcon className="w-4 h-4" />
                  </Button>
                </div>
              ) : null
            }
          >
            <ChatbotBreadcrumb items={breadcrumb} />
          </PageHeader>

          <ChatbotChatWindow
            status={session.status}
            messages={session.messages}
            isPending={session.isPending}
            onStart={session.startChat}
            onSend={session.send}
          />
        </div>
      </div>
    </div>
  );
}
