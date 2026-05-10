"use client";

import { ReactNode, useState } from "react";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { MenuIcon } from "@/app/components/icons";
import { LoginModal } from "@/app/components/auth";
import { Button } from "@/app/components";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
  hidden?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  children,
  actions,
  hidden = false,
}: PageHeaderProps) {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (hidden) return null;

  return (
    <>
      <div className="border-b h-16 px-4 flex items-center justify-between gap-3 shrink-0 bg-bg-primary border-border">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-1.5 rounded-md text-text-secondary hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
              aria-label="Open sidebar"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          )}
          {children ?? (
            <div className="min-w-0">
              {title && (
                <h1 className="text-base font-semibold text-text-primary tracking-[-0.01em] truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-text-secondary truncate">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {!isAuthenticated && (
            <Button size="sm" onClick={() => setShowLoginModal(true)}>
              Log in
            </Button>
          )}
        </div>
      </div>

      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
