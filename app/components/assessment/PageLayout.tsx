"use client";

// Top-level layout for /assessment: sidebar, tab navigation, and active tab content.
import Sidebar from "@/app/components/Sidebar";
import TabNavigation from "@/app/components/TabNavigation";
import PageHeader from "@/app/components/PageHeader";
import { useApp } from "@/app/lib/context/AppContext";
import type { PageLayoutProps } from "@/app/lib/types/assessment";
import ConfigPanel from "./ConfigPanel";
import DatasetsTab from "./DatasetsTab";
import EvaluationsTab from "./EvaluationsTab";

export default function PageLayout({
  activeTab,
  tabs,
  onTabSwitch,
  datasetsTabProps,
  configPanelProps,
  evaluationsTabProps,
}: PageLayoutProps) {
  const { sidebarCollapsed } = useApp();

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-50">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/assessment" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Assessment"
            subtitle="Multi-modal batch evaluation with prompt templates, attachments, and config comparison"
          />

          <TabNavigation
            activeTab={activeTab}
            tabs={tabs}
            onTabChange={(tabId) => onTabSwitch(tabId as typeof activeTab)}
          />

          {activeTab === "datasets" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <DatasetsTab {...datasetsTabProps} />
            </div>
          )}

          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
              activeTab === "config" ? "" : "hidden"
            }`}
          >
            <ConfigPanel {...configPanelProps} />
          </div>

          {activeTab === "results" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <EvaluationsTab {...evaluationsTabProps} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
