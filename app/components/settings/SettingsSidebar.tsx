"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { ArrowLeftIcon, KeyIcon, SlidersIcon } from "@/app/components/icons";
import { SETTINGS_NAV } from "@/app/lib/navConfig";
import { useAuth } from "@/app/lib/context/AuthContext";
import { Branding, UserMenuPopover } from "@/app/components/user-menu";

const iconMap: Record<string, React.ReactNode> = {
  key: <KeyIcon className="w-[18px] h-[18px]" />,
  sliders: <SlidersIcon className="w-[18px] h-[18px]" />,
};

export default function SettingsSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, googleProfile, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  const displayName =
    googleProfile?.name || currentUser?.full_name || currentUser?.email || "";
  const initials = (currentUser?.full_name || currentUser?.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <aside className="w-60 h-full border-r border-border bg-bg-secondary flex flex-col shrink-0">
      <Branding />

      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => router.push("/evaluations")}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] font-medium text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-all duration-150 w-full"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      <div className="mx-4 my-2 h-px bg-border" />

      <nav className="flex-1 overflow-y-auto px-3 pt-1 pb-4">
        {SETTINGS_NAV.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="px-3 mb-1.5 text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => router.push(item.route)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[14px] flex items-center gap-2.5 transition-all duration-150 border ${
                      isActive
                        ? "bg-neutral-100 text-text-primary font-semibold border-border"
                        : "bg-transparent text-black font-medium border-transparent hover:bg-neutral-100"
                    }`}
                  >
                    {item.icon && (
                      <span className={isActive ? "opacity-100" : "opacity-70"}>
                        {iconMap[item.icon]}
                      </span>
                    )}
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {isAuthenticated && (currentUser || googleProfile) && (
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
                  {initials}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-text-primary truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-text-secondary truncate">
                {currentUser?.email}
              </p>
            </div>
          </button>
        </div>
      )}
    </aside>
  );
}
