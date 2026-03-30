"use client";

import { ReactNode } from "react";
import { colors } from "@/app/lib/colors";
import { useApp } from "@/app/lib/context/AppContext";
import { MenuIcon } from "@/app/components/icons";

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

  if (hidden) return null;

  return (
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
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
