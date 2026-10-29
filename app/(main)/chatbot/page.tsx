"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { Button, Loader } from "@/app/components/ui";
import { PlusIcon, SearchIcon } from "@/app/components/icons";
import { ChatbotList, CreateChatbotModal } from "@/app/components/chatbot";
import { useApp } from "@/app/lib/context/AppContext";
import { useToast } from "@/app/hooks/useToast";
import { useChatbots } from "@/app/hooks/chatbot/useChatbots";

export default function ChatbotsPage() {
  const { sidebarCollapsed } = useApp();
  const router = useRouter();
  const toast = useToast();
  const { chatbots, isLoading, error, create } = useChatbots();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = chatbots.filter((c) => c.name.toLowerCase().includes(query));

  const handleCreate = async (name: string) => {
    try {
      const chatbot = await create(name);
      router.push(`/chatbot/${chatbot.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create the chatbot.",
      );
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader message="Loading chatbots..." />
        </div>
      );
    }
    if (error) {
      return <p className="text-sm text-status-error-text">{error}</p>;
    }
    if (chatbots.length === 0) {
      return (
        <div className="py-16 text-center">
          <p className="text-sm text-text-secondary">No chatbots yet.</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => setShowCreate(true)}
          >
            Create your first chatbot
          </Button>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <p className="py-16 text-center text-sm text-text-secondary">
          No chatbots match &quot;{search}&quot;.
        </p>
      );
    }
    return <ChatbotList chatbots={filtered} />;
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/chatbot" />

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <PageHeader
            title="Chatbots"
            subtitle="Build chatbot flows and test them live"
            actions={
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <PlusIcon className="w-3.5 h-3.5" />
                Add New
              </Button>
            }
          />

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            <div className="relative max-w-xs">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm bg-bg-primary text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
            {renderContent()}
          </div>
        </div>
      </div>

      <CreateChatbotModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
