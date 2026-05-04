"use client";

import { MenuIcon } from "@/app/components/icons";
import { useApp } from "@/app/lib/context/AppContext";

export default function PageHeader() {
  const { toggleSidebar } = useApp();

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-primary px-4 py-3">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="cursor-pointer rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
      >
        <MenuIcon className="h-5 w-5 text-text-secondary" />
      </button>
      <div>
        <h1 className="text-base font-semibold tracking-[-0.01em] text-text-primary">
          Assessment
        </h1>
        <p className="text-xs text-text-secondary">
          Multi-modal batch evaluation with prompt templates, attachments, and
          config comparison
        </p>
      </div>
    </div>
  );
}
