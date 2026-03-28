/**
 * TabNavigation - Generic two-tab switcher component
 * Provides a tab interface with active state highlighting
 */

"use client";

import { colors } from "@/app/lib/colors";

export interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div
      className="border-b flex gap-1 px-4"
      style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: isActive ? colors.accent.primary : "transparent",
              color: isActive ? colors.accent.primary : colors.text.secondary,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
