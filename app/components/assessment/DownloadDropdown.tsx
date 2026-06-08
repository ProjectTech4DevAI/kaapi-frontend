"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/app/components/ui";
import { ChevronDownIcon } from "@/app/components/icons";
import { DownloadIcon } from "@/app/components/icons/assessment";
import LoadingSpinner from "@/app/components/assessment/LoadingSpinner";
import type { ExportFormat } from "@/app/lib/types/assessment";

interface DownloadDropdownProps {
  onDownload: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
}

const MENU_WIDTH = 144;

export default function DownloadDropdown({
  onDownload,
  disabled,
  loading,
}: DownloadDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);

  // Position the portal menu under the trigger, right-aligned.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.right - MENU_WIDTH });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    // Fixed menu can't follow scroll — close instead of drift.
    const handleScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", handlePointer);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  return (
    <div ref={triggerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        disabled={disabled || loading}
        className="!rounded-md !px-2.5 !py-1.5 !text-xs"
        aria-label="Download results"
        aria-expanded={open}
      >
        {loading ? (
          <LoadingSpinner className="h-3.5 w-3.5" />
        ) : (
          <DownloadIcon className="h-3.5 w-3.5" />
        )}
        Export
        <ChevronDownIcon className="h-3 w-3" />
      </Button>
      {open &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 rounded-md border border-border bg-bg-primary py-1 shadow-lg"
            style={{ top: rect.top, left: rect.left, width: MENU_WIDTH }}
          >
            {(
              [
                ["csv", "CSV File"],
                ["xlsx", "Excel Sheet"],
              ] as const
            ).map(([fmt, label]) => (
              <Button
                key={fmt}
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => {
                  onDownload(fmt);
                  setOpen(false);
                }}
                className="!justify-start !rounded-none !px-3 !py-2 !text-xs !text-text-primary"
              >
                {label}
              </Button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
