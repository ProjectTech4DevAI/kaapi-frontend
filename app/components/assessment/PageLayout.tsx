"use client";

// Top-level layout for /assessment: sidebar, page header, then the active surface —
// Home or the wizard. No tabs; the flow strip under the header is the navigation.
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { useApp } from "@/app/lib/context/AppContext";
import type { PageLayoutProps } from "@/app/lib/types/assessment";
import HomeView from "./home/HomeView";
import WizardView from "./wizard/WizardView";

export default function PageLayout({
  view,
  wizard,
  homeSelection,
  onGoHome,
}: PageLayoutProps) {
  const { sidebarCollapsed } = useApp();

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-50">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/assessment" />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <PageHeader
            title="Assessment"
            subtitle="Score submissions with versioned assessors, then track every run"
          />

          {view === "home" ? (
            <HomeView
              initialSelection={homeSelection}
              onNewAssessor={wizard.startNew}
              onEditVersion={wizard.startEdit}
              onNewRun={wizard.startRun}
            />
          ) : (
            <WizardView wizard={wizard} onHome={onGoHome} />
          )}
        </div>
      </div>
    </div>
  );
}
