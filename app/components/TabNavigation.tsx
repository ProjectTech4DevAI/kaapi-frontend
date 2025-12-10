/**
 * TabNavigation - Generic two-tab switcher component
 * Provides a tab interface with active state highlighting
 */

"use client"
import React from 'react';

export interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b" style={{ backgroundColor: '#ffffff', borderColor: '#e5e5e5' }}>
      <div className="flex px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="px-4 py-3 text-sm border-b-2"
              style={{
                borderBottomColor: isActive ? '#171717' : 'transparent',
                color: isActive ? '#171717' : '#737373',
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#171717';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#737373';
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
