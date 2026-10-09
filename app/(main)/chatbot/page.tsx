/**
 * Chatbot - Build a chatbot flow on a canvas and test each step live.
 */

"use client";

import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { Button } from "@/app/components/ui";
import { PlusIcon } from "@/app/components/icons";
import { ChatbotFlowCanvas, ChatbotTestPanel } from "@/app/components/chatbot";
import { useApp } from "@/app/lib/context/AppContext";
import { useChatbotFlow } from "@/app/hooks/useChatbotFlow";

export default function ChatbotPage() {
  const { sidebarCollapsed } = useApp();
  const flow = useChatbotFlow();
  const node = flow.selectedNode;

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/chatbot" />

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <PageHeader
            title="Chatbot"
            subtitle="Design a chatbot flow and test each step before saving"
            actions={
              <Button variant="outline" size="sm" onClick={flow.addNode}>
                <PlusIcon className="w-3.5 h-3.5" />
                Add step
              </Button>
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
                onSelectNode={flow.setSelectedId}
                updateNodeData={flow.updateNodeData}
              />
            </div>

            <aside className="w-[380px] shrink-0 border-l border-border flex flex-col min-h-0 bg-bg-primary">
              {node ? (
                <>
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-text-primary">
                      Test: {node.data.label || "Untitled step"}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Click a step on the canvas to test it.
                    </p>
                  </div>
                  <ChatbotTestPanel key={node.id} data={node.data} />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-text-secondary">
                  Add a step to start testing.
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
