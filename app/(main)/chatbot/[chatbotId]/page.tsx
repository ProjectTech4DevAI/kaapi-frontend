"use client";

import { useParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { Button, Loader } from "@/app/components/ui";
import { PlayIcon } from "@/app/components/icons";
import {
  ChatbotBreadcrumb,
  ChatbotFlowCanvas,
  ChatbotVersionPill,
} from "@/app/components/chatbot";
import { useApp } from "@/app/lib/context/AppContext";
import { useToast } from "@/app/hooks/useToast";
import { useChatbot } from "@/app/hooks/chatbot/useChatbot";
import { useChatbotFlow } from "@/app/hooks/chatbot/useChatbotFlow";

/** Flow editor of one chatbot: edit, save a draft, publish, and test. */
export default function ChatbotEditorPage() {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const { sidebarCollapsed } = useApp();
  const toast = useToast();
  const { chatbot } = useChatbot(chatbotId);
  const flow = useChatbotFlow(chatbotId);

  const isBusy = flow.isSaving || flow.isPublishing;
  const { flowVersion } = flow;

  const handlePlay = () => {
    if (!flowVersion) {
      toast.error("Save the flow first to test the chatbot.");
      return;
    }
    window.open(`/chatbot/${chatbotId}/chat`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/chatbot" />

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <PageHeader
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={flow.discard}
                  disabled={!flow.isDirty || isBusy}
                >
                  Discard changes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={flow.save}
                  disabled={!flow.isDirty || isBusy}
                >
                  {flow.isSaving ? "Saving…" : "Save"}
                </Button>
                {/* Only a draft (newer than live) can be published. */}
                {flowVersion && !flowVersion.isLive && (
                  <Button
                    size="sm"
                    onClick={flow.publish}
                    disabled={flow.isDirty || isBusy}
                    title={flow.isDirty ? "Save your changes first" : undefined}
                  >
                    {flow.isPublishing ? "Publishing…" : "Publish"}
                  </Button>
                )}
              </div>
            }
          >
            <div className="flex items-center gap-3 min-w-0">
              <ChatbotBreadcrumb items={[{ label: chatbot?.name ?? "…" }]} />
              <ChatbotVersionPill version={flowVersion} />
            </div>
          </PageHeader>

          <div className="relative flex-1 min-h-0 bg-bg-primary">
            {flow.isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader message="Loading flow..." />
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
