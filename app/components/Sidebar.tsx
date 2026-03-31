/**
 * Sidebar  - Navigation sidebar with collapse/expand functionality
 * Provides hierarchical navigation with expandable submenus
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/app/lib/context/AuthContext";
import {
  ClipboardIcon,
  DocumentFileIcon,
  BookOpenIcon,
  GearIcon,
  SlidersIcon,
  KeyIcon,
  ChevronRightIcon,
} from "@/app/components/icons";
import { LoginModal } from "@/app/components/auth";
import { Button } from "@/app/components";

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
  gateDescription?: string;
}

interface SidebarProps {
  collapsed: boolean;
  activeRoute?: string;
}

/** Routes that are always accessible without auth */
const PUBLIC_ROUTES = new Set(["/evaluations", "/keystore"]);

// ---- Gate Popover (rendered via portal) ----

function GatePopover({
  name,
  description,
  anchorRect,
  onMouseEnter,
  onMouseLeave,
  onLogin,
}: {
  name: string;
  description: string;
  anchorRect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onLogin: () => void;
}) {
  return createPortal(
    <div
      className="fixed z-9999 w-72"
      style={{
        top: anchorRect.top - 40,
        left: anchorRect.right + 10,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Gradient banner */}
        <div
          className="h-24"
          style={{
            background:
              "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 30%, #c7d2fe 50%, #ddd6fe 70%, #fce7f3 100%)",
          }}
        />

        {/* Content */}
        <div className="px-4 pt-3 pb-4">
          <p className="text-[15px] font-semibold text-text-primary leading-snug">
            {name}
          </p>
          <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
            {description}
          </p>

          <div className="mt-4">
            <Button size="sm" onClick={onLogin}>
              Log in
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---- Main Sidebar ----

export default function Sidebar({
  collapsed,
  activeRoute = "/evaluations",
}: SidebarProps) {
  const router = useRouter();
  const { currentUser, googleProfile, isAuthenticated, session, logout } =
    useAuth();
  const isGoogleUser = !!session?.accessToken;
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Evaluations: true,
    Configurations: false,
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hoveredGate, setHoveredGate] = useState<string | null>(null);
  const [gateRect, setGateRect] = useState<DOMRect | null>(null);
  const gateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleGateEnter = useCallback((name: string, el: HTMLElement) => {
    if (gateTimeoutRef.current) clearTimeout(gateTimeoutRef.current);
    setHoveredGate(name);
    setGateRect(el.getBoundingClientRect());
  }, []);

  const handleGateLeave = useCallback(() => {
    gateTimeoutRef.current = setTimeout(() => {
      setHoveredGate(null);
      setGateRect(null);
    }, 200);
  }, []);

  const handleGatePopoverEnter = useCallback(() => {
    if (gateTimeoutRef.current) clearTimeout(gateTimeoutRef.current);
  }, []);

  const isRouteGated = (route?: string): boolean => {
    if (isAuthenticated) return false;
    if (!route) return false;
    return !PUBLIC_ROUTES.has(route);
  };

  const isItemGated = (item: MenuItem): boolean => {
    if (isAuthenticated) return false;
    if (item.route) return isRouteGated(item.route);
    if (item.submenu) {
      return item.submenu.every((sub) => isRouteGated(sub.route));
    }
    return false;
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
      gateDescription:
        "Log in to compare model response quality across different configs.",
    },
    {
      name: "Documents",
      route: "/document",
      icon: <DocumentFileIcon />,
      gateDescription: "Log in to upload and manage your documents.",
    },
    {
      name: "Knowledge Base",
      route: "/knowledge-base",
      icon: <BookOpenIcon />,
      gateDescription: "Log in to manage your knowledge bases for RAG.",
    },
    {
      name: "Configurations",
      icon: <GearIcon className="w-5 h-5" />,
      submenu: [
        { name: "Library", route: "/configurations" },
        { name: "Prompt Editor", route: "/configurations/prompt-editor" },
      ],
      gateDescription: "Log in to manage prompts and model configurations.",
    },
    ...(currentUser?.is_superuser
      ? [
          {
            name: "Settings",
            icon: <SlidersIcon />,
            submenu: [
              { name: "Credentials", route: "/settings/credentials" },
              { name: "Onboarding", route: "/settings/onboarding" },
            ],
          },
        ]
      : []),
  ];

  // Find the gate description for the currently hovered item
  const getGateDescription = (name: string): string => {
    for (const item of navItems) {
      if (item.name === name)
        return (
          item.gateDescription || `Log in to access ${name.toLowerCase()}.`
        );
      if (item.submenu) {
        for (const sub of item.submenu) {
          if (sub.name === name)
            return `Log in to access ${name.toLowerCase()}.`;
        }
      }
    }
    return "Log in to access this feature.";
  };

  return (
    <aside
      className={`border-r border-border transition-all duration-300 ease-in-out h-full shrink-0 flex flex-col bg-bg-secondary ${collapsed ? "w-0 overflow-hidden" : "w-60"}`}
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
          const gated = isItemGated(item);

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
                onMouseEnter={(e) =>
                  gated && handleGateEnter(item.name, e.currentTarget)
                }
                onMouseLeave={() => gated && handleGateLeave()}
                onClick={() => {
                  if (gated) return;
                  if (hasSubmenu) {
                    toggleMenu(item.name);
                  } else if (item.route) {
                    router.push(item.route);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-[14px] flex items-center gap-2.5 transition-all duration-150 border ${
                  isActive
                    ? "bg-neutral-100 text-text-primary font-semibold border-border"
                    : hasActiveChild
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

              {hasSubmenu && isExpanded && !gated && (
                <div className="ml-3 mt-1 space-y-0.5 overflow-hidden border-l-2 border-border pl-3 animate-[slideDown_0.15s_ease-out]">
                  {item.submenu?.map((subItem) => {
                    const hasNestedSubmenu =
                      subItem.submenu && subItem.submenu.length > 0;
                    const isNestedExpanded = expandedMenus[subItem.name];
                    const isSubActive = activeRoute === subItem.route;
                    const subGated = isRouteGated(subItem.route);
                    const hasActiveNestedChild =
                      hasNestedSubmenu &&
                      subItem.submenu?.some(
                        (nested) => activeRoute === nested.route,
                      );

                    return (
                      <div key={subItem.name}>
                        <button
                          onMouseEnter={(e) =>
                            subGated &&
                            handleGateEnter(subItem.name, e.currentTarget)
                          }
                          onMouseLeave={() => subGated && handleGateLeave()}
                          onClick={() => {
                            if (subGated) return;
                            if (hasNestedSubmenu) {
                              toggleMenu(subItem.name);
                            } else if (subItem.route) {
                              router.push(subItem.route);
                            }
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-[13px] flex items-center justify-between gap-2 transition-all duration-150 border ${
                            isSubActive
                              ? "bg-neutral-100 text-text-primary font-medium border-border"
                              : hasActiveNestedChild
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

      {/* Bottom section */}
      <div className="w-60">
        {!isGoogleUser && (
          <div className="px-3 py-3">
            <button
              onClick={() => router.push("/keystore")}
              className={`w-full text-left px-3 py-2 rounded-lg text-[14px] flex items-center gap-2.5 transition-all duration-150 border ${
                activeRoute === "/keystore"
                  ? "bg-neutral-100 text-text-primary font-semibold border-border"
                  : "bg-transparent text-black font-medium border-transparent hover:bg-neutral-100"
              }`}
            >
              <span
                className={
                  activeRoute === "/keystore" ? "opacity-100" : "opacity-70"
                }
              >
                <KeyIcon className="w-5 h-5" />
              </span>
              Keystore
            </button>
          </div>
        )}
        {/* Keystore */}

        {/* User profile (authenticated) or login prompt */}
        {isAuthenticated && (currentUser || googleProfile) ? (
          <div className="px-3 pb-3 pt-1 border-t border-border">
            <div className="flex items-center gap-3 px-2 py-2">
              {googleProfile?.picture ? (
                <Image
                  src={googleProfile.picture}
                  alt={googleProfile.name}
                  width={32}
                  height={32}
                  className="rounded-full shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-white">
                    {(currentUser?.full_name || currentUser?.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {googleProfile?.name ||
                    currentUser?.full_name ||
                    currentUser?.email}
                </p>
                <p className="text-[11px] text-text-secondary truncate">
                  {currentUser?.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-text-secondary hover:bg-neutral-100 hover:text-text-primary transition-colors shrink-0"
                title="Log out"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="px-4 py-4 w-60 border-t border-border">
            <div className="rounded-lg bg-neutral-50 py-3">
              <p className="text-sm font-semibold text-text-primary">
                Get full access
              </p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Log in to run evaluations, manage configs, and upload documents.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="mt-3 w-full py-2 rounded-full border border-border bg-white text-sm font-medium text-text-primary hover:bg-neutral-50 transition-colors"
              >
                Log in
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Gate popover — rendered via portal so it's never clipped */}
      {hoveredGate && gateRect && (
        <GatePopover
          name={hoveredGate}
          description={getGateDescription(hoveredGate)}
          anchorRect={gateRect}
          onMouseEnter={handleGatePopoverEnter}
          onMouseLeave={handleGateLeave}
          onLogin={() => {
            setHoveredGate(null);
            setShowLoginModal(true);
          }}
        />
      )}

      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </aside>
  );
}
