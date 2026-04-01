/**
 * Sidebar  - Navigation sidebar with collapse/expand functionality
 * Provides hierarchical navigation with expandable submenus
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/app/lib/context/AuthContext";
import {
  ClipboardIcon,
  DocumentFileIcon,
  BookOpenIcon,
  GearIcon,
  ChevronRightIcon,
} from "@/app/components/icons";
import { LoginModal } from "@/app/components/auth";
import { Branding, UserMenuPopover } from "@/app/components/user-menu";
import GatePopover from "@/app/components/GatePopover";
import { NAV_ITEMS } from "@/app/lib/navConfig";
import { MenuItem, SidebarProps } from "@/app/lib/types/nav";

/** Routes that are always accessible without auth */
const PUBLIC_ROUTES = new Set(["/evaluations"]);

export default function Sidebar({
  collapsed,
  activeRoute = "/evaluations",
}: SidebarProps) {
  const router = useRouter();
  const { currentUser, googleProfile, isAuthenticated, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Evaluations: true,
    Configurations: false,
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
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

  // Close user menu on click outside
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

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

  const iconMap: Record<string, React.ReactNode> = {
    clipboard: <ClipboardIcon />,
    document: <DocumentFileIcon />,
    book: <BookOpenIcon />,
    gear: <GearIcon className="w-5 h-5" />,
  };

  const navItems: MenuItem[] = NAV_ITEMS.filter(
    (item) => !item.superuserOnly || currentUser?.is_superuser,
  ).map((item) => ({
    name: item.name,
    route: item.route,
    icon: iconMap[item.icon],
    submenu: item.submenu,
    gateDescription: item.gateDescription,
  }));

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
      <Branding />

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

      <div className="w-60">
        {isAuthenticated && (currentUser || googleProfile) ? (
          <div
            className="px-3 pb-3 pt-1 border-t border-border relative"
            ref={userMenuRef}
          >
            {showUserMenu && (
              <UserMenuPopover
                currentUser={currentUser}
                googleProfile={googleProfile}
                onClose={() => setShowUserMenu(false)}
                onLogout={logout}
              />
            )}

            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors"
            >
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
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-text-primary truncate">
                  {googleProfile?.name ||
                    currentUser?.full_name ||
                    currentUser?.email}
                </p>
                <p className="text-[11px] text-text-secondary truncate">
                  {currentUser?.email}
                </p>
              </div>
            </button>
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
