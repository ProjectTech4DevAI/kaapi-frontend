/**
 * Sidebar  - Navigation sidebar with collapse/expand functionality
 * Provides hierarchical navigation with expandable submenus
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardIcon,
  DocumentFileIcon,
  BookOpenIcon,
  GearIcon,
  SlidersIcon,
  KeyIcon,
  ChevronRightIcon,
} from "@/app/components/icons";

interface SubMenuItem {
  name: string;
  route?: string;
  comingSoon?: boolean;
  submenu?: SubMenuItem[];
}

interface MenuItem {
  name: string;
  route?: string;
  icon: React.ReactNode;
  submenu?: SubMenuItem[];
}

interface SidebarProps {
  collapsed: boolean;
  activeRoute?: string;
}

export default function Sidebar({
  collapsed,
  activeRoute = "/evaluations",
}: SidebarProps) {
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Evaluations: true,
    Configurations: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-expanded-menus");
    if (saved) {
      try {
        setExpandedMenus(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load sidebar state:", e);
      }
    }
  }, []);

  const toggleMenu = (menuName: string) => {
    const newState = { ...expandedMenus, [menuName]: !expandedMenus[menuName] };
    setExpandedMenus(newState);
    localStorage.setItem("sidebar-expanded-menus", JSON.stringify(newState));
  };

  const navItems: MenuItem[] = [
    {
      name: "Evaluations",
      icon: <ClipboardIcon />,
      submenu: [
        { name: "Text", route: "/evaluations" },
        { name: "Speech-to-Text", route: "/speech-to-text" },
        { name: "Text-to-Speech", route: "/text-to-speech" },
      ],
    },
    {
      name: "Documents",
      route: "/document",
      icon: <DocumentFileIcon />,
    },
    {
      name: "Knowledge Base",
      route: "/knowledge-base",
      icon: <BookOpenIcon />,
    },
    {
      name: "Configurations",
      icon: <GearIcon className="w-5 h-5" />,
      submenu: [
        { name: "Library", route: "/configurations" },
        { name: "Prompt Editor", route: "/configurations/prompt-editor" },
      ],
    },
    {
      name: "Settings",
      route: "/settings/credentials",
      icon: <SlidersIcon />,
    },
  ];

  const bottomItem: MenuItem = {
    name: "Keystore",
    route: "/keystore",
    icon: <KeyIcon className="w-5 h-5" />,
  };

  return (
    <aside
      className={`border-r border-border transition-all duration-300 ease-in-out h-full shrink-0 flex flex-col bg-bg-secondary overflow-hidden ${collapsed ? "w-0" : "w-60"}`}
    >
      <div className="px-5 py-[13px] border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary tracking-tight">
          Kaapi Konsole
        </h2>
        <p className="text-xs mt-0.5 text-text-secondary">Tech4Dev</p>
      </div>

      <nav className="p-3 space-y-1 flex-1 overflow-y-auto w-60">
        {navItems.map((item) => {
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isExpanded = expandedMenus[item.name];
          const isActive = activeRoute === item.route;

          const hasActiveChild =
            hasSubmenu &&
            item.submenu?.some(
              (sub) =>
                activeRoute === sub.route ||
                (sub.submenu &&
                  sub.submenu.some((nested) => activeRoute === nested.route)),
            );

          return (
            <div key={item.name}>
              <button
                onClick={() => {
                  if (hasSubmenu) {
                    toggleMenu(item.name);
                  } else if (item.route) {
                    router.push(item.route);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-[14px] flex items-center gap-2.5 transition-all duration-150 border ${
                  isActive
                    ? "bg-neutral-100 text-text-primary font-semibold border-border"
                    : isActive || hasActiveChild
                      ? "bg-transparent text-text-primary font-semibold border-transparent"
                      : "bg-transparent text-black font-medium border-transparent hover:bg-neutral-100"
                }`}
              >
                <span
                  className={
                    isActive || hasActiveChild ? "opacity-100" : "opacity-70"
                  }
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.name}</span>
                {hasSubmenu && (
                  <ChevronRightIcon
                    className={`w-4 h-4 transition-transform duration-150 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                )}
              </button>

              {hasSubmenu && isExpanded && (
                <div className="ml-3 mt-1 space-y-0.5 overflow-hidden border-l-2 border-border pl-3 animate-[slideDown_0.15s_ease-out]">
                  {item.submenu?.map((subItem) => {
                    const hasNestedSubmenu =
                      subItem.submenu && subItem.submenu.length > 0;
                    const isNestedExpanded = expandedMenus[subItem.name];
                    const isSubActive = activeRoute === subItem.route;
                    const hasActiveNestedChild =
                      hasNestedSubmenu &&
                      subItem.submenu?.some(
                        (nested) => activeRoute === nested.route,
                      );

                    return (
                      <div key={subItem.name}>
                        <button
                          onClick={() => {
                            if (hasNestedSubmenu) {
                              toggleMenu(subItem.name);
                            } else if (subItem.route) {
                              router.push(subItem.route);
                            }
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-[13px] flex items-center justify-between gap-2 transition-all duration-150 border ${
                            isSubActive
                              ? "bg-neutral-100 text-text-primary font-medium border-border"
                              : isSubActive || hasActiveNestedChild
                                ? "bg-transparent text-text-primary font-medium border-transparent"
                                : "bg-transparent text-black font-normal border-transparent hover:bg-neutral-100"
                          }`}
                        >
                          <span className="flex-1">{subItem.name}</span>
                          {subItem.comingSoon && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                              ☕
                            </span>
                          )}
                          {hasNestedSubmenu && (
                            <ChevronRightIcon
                              className={`w-3 h-3 transition-transform duration-150 ${
                                isNestedExpanded ? "rotate-90" : ""
                              }`}
                            />
                          )}
                        </button>

                        {hasNestedSubmenu && isNestedExpanded && (
                          <div className="ml-2 mt-0.5 space-y-0.5 overflow-hidden border-l border-border pl-2.5 animate-[slideDown_0.15s_ease-out]">
                            {subItem.submenu?.map((nestedItem) => {
                              const isNestedActive =
                                activeRoute === nestedItem.route;
                              return (
                                <button
                                  key={nestedItem.route}
                                  onClick={() =>
                                    nestedItem.route &&
                                    router.push(nestedItem.route)
                                  }
                                  className={`w-full text-left px-2.5 py-1 rounded-md text-[13px] flex items-center justify-between gap-2 transition-all duration-150 border ${
                                    isNestedActive
                                      ? "bg-neutral-100 text-text-primary font-medium border-border"
                                      : "bg-transparent text-black font-normal border-transparent hover:bg-neutral-100"
                                  }`}
                                >
                                  <span>{nestedItem.name}</span>
                                  {nestedItem.comingSoon && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                                      ☕
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-[11px] border-t border-border w-60">
        <button
          onClick={() => router.push(bottomItem.route!)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-all duration-150 border ${
            activeRoute === bottomItem.route
              ? "bg-neutral-100 text-text-primary font-semibold border-border"
              : "bg-transparent text-text-secondary font-medium border-transparent hover:bg-neutral-100 hover:text-text-primary"
          }`}
        >
          <span
            className={
              activeRoute === bottomItem.route ? "opacity-100" : "opacity-70"
            }
          >
            {bottomItem.icon}
          </span>
          {bottomItem.name}
        </button>
      </div>
    </aside>
  );
}
