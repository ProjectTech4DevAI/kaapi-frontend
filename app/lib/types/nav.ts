import React from "react";
import type { FeatureFlagKey } from "@/app/lib/constants";

export interface NavSubItem {
  name: string;
  route: string;
}

export interface NavItemConfig {
  name: string;
  icon: string;
  route?: string;
  submenu?: NavSubItem[];
  gateDescription?: string;
  superuserOnly?: boolean;
  featureFlag?: FeatureFlagKey;
}

export interface SubMenuItem {
  name: string;
  route?: string;
  comingSoon?: boolean;
  submenu?: SubMenuItem[];
}

export interface MenuItem {
  name: string;
  route?: string;
  icon: React.ReactNode;
  submenu?: SubMenuItem[];
  gateDescription?: string;
  featureFlag?: FeatureFlagKey;
}

export interface SidebarProps {
  collapsed: boolean;
  activeRoute?: string;
}

export interface GatePopoverProps {
  name: string;
  description: string;
  anchorRect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onLogin: () => void;
}

export interface SettingsNavItem extends NavSubItem {
  icon?: string;
}

export interface SettingsNavSection {
  label: string;
  items: SettingsNavItem[];
}

export interface Tab {
  id: string;
  label: string;
}

export interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}
