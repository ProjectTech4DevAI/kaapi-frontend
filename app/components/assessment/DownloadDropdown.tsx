"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components";
import { ChevronDownIcon } from "@/app/components/icons";
import DownloadIcon from "@/app/components/icons/assessment/DownloadIcon";
import type { ExportFormat } from "@/app/lib/types/assessment";

interface DownloadDropdownProps {
  onDownload: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
}

function LoadingSpinner({ className }: { className: string }) {
  return (
    <div
      className={`${className} animate-spin rounded-full border-2 border-accent-primary border-t-transparent`}
    />
  );
}

export default function DownloadDropdown({
  onDownload,
  disabled,
  loading,
}: DownloadDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
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
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-border bg-bg-primary py-1 shadow-lg">
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
        </div>
      )}
    </div>
  );
}
