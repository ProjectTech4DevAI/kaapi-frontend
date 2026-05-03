"use client";

import { MenuIcon } from "@/app/components/icons";
import type { PageHeaderProps } from "@/app/lib/types/assessment";

export default function PageHeader({ onToggleSidebar }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="cursor-pointer rounded-md p-1.5 text-neutral-500"
      >
        <MenuIcon className="h-5 w-5 text-neutral-500" />
      </button>
      <div>
        <h1 className="text-base font-semibold tracking-[-0.01em] text-neutral-900">
          Assessment
        </h1>
        <p className="text-xs text-neutral-500">
          Multi-modal batch evaluation with prompt templates, attachments, and
          config comparison
        </p>
      </div>
    </div>
  );
}
