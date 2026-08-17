"use client";

// Top-level layout for /assessment. Tabs are sidebar sub-items (routes), so the
// active tab is driven by the URL rather than an in-page tab bar.
import { usePathname } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { useApp } from "@/app/lib/context/AppContext";
import type { PageLayoutProps } from "@/app/lib/types/assessment";
import ConfigPanel from "./ConfigPanel";
import DatasetsTab from "./DatasetsTab";
import EvaluationsTab from "./EvaluationsTab";
import ExperimentTab from "./ExperimentTab";

export default function PageLayout({
  activeTab,
  datasetsTabProps,
  configPanelProps,
  experimentTabProps,
  evaluationsTabProps,
}: PageLayoutProps) {
  const { sidebarCollapsed } = useApp();
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-50">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          activeRoute={pathname ?? undefined}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Assessment"
            subtitle="Multi-modal batch evaluation with prompt templates, attachments, and config comparison"
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

          {activeTab === "experiment" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ExperimentTab {...experimentTabProps} />
            </div>
          )}

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
