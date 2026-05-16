/**
 * TabNavigation - Generic two-tab switcher component
 * Provides a tab interface with active state highlighting
 */

"use client";

import { TabNavigationProps } from "@/app/lib/types/nav";

export type { Tab } from "@/app/lib/types/nav";

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div className="border-b flex gap-1 px-4 bg-bg-primary border-border">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              isActive
                ? "border-accent-primary text-accent-primary"
                : "border-transparent text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
