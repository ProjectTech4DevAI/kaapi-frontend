"use client";

import Sidebar from "@/app/components/Sidebar";
import TabNavigation from "@/app/components/TabNavigation";
import type { PageLayoutProps } from "@/app/lib/types/assessment";
import ApiKeyRequired from "./ApiKeyRequired";
import ConfigPanel from "./ConfigPanel";
import DatasetsTab from "./DatasetsTab";
import EvaluationsTab from "./EvaluationsTab";
import PageHeader from "./PageHeader";

export default function PageLayout({
  sidebarCollapsed,
  onToggleSidebar,
  hasApiKeys,
  activeTab,
  tabs,
  onTabSwitch,
  datasetsTabProps,
  configPanelProps,
  evaluationsTabProps,
}: PageLayoutProps) {
  return (
    <div className="flex h-screen w-full flex-col bg-neutral-50">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/assessment" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader onToggleSidebar={onToggleSidebar} />

          {!hasApiKeys ? (
            <ApiKeyRequired />
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
