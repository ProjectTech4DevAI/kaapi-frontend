"use client";

import { ReactNode, useState } from "react";
import { colors } from "@/app/lib/colors";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { MenuIcon } from "@/app/components/icons";
import { LoginModal } from "@/app/components/auth";
import { Button } from "@/app/components";

interface PageHeaderProps {
  /** Page title displayed next to the sidebar toggle. Ignored when `children` is provided. */
  title?: string;
  /** Subtitle shown below the title. Ignored when `children` is provided. */
  subtitle?: string;
  /** Custom left-side content that replaces the default title/subtitle. */
  children?: ReactNode;
  /** Right-side action buttons / controls. */
  actions?: ReactNode;
  /** When true the header is not rendered at all. */
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
      <div
        className="border-b px-4 py-3 flex items-center justify-between shrink-0"
        style={{
          backgroundColor: colors.bg.primary,
          borderColor: colors.border,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-md"
            style={{ color: colors.text.secondary }}
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          {children ?? (
            <div>
              {title && (
                <h1
                  className="text-base font-semibold"
                  style={{
                    color: colors.text.primary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs" style={{ color: colors.text.secondary }}>
                  {subtitle}
                </p>
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
