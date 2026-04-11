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
      <div className="border-b px-4 py-3 flex items-center justify-between shrink-0 bg-bg-primary border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-md text-text-secondary"
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          {children ?? (
            <div>
              {title && (
                <h1 className="text-base font-semibold text-text-primary tracking-[-0.01em]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-text-secondary">{subtitle}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
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
