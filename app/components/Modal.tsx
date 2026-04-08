"use client";

import { useEffect, useCallback, ReactNode } from "react";
import { CloseIcon } from "@/app/components/icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  showClose?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
  maxHeight = "max-h-[80vh]",
  showClose = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl border border-border w-full flex flex-col ${maxWidth} ${maxHeight}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            {title ? (
              <h2 className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
            ) : (
              <div />
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-md text-text-secondary transition-colors hover:bg-neutral-100 hover:text-text-primary cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
