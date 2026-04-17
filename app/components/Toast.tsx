"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  CheckCircleIcon,
  ErrorCircleIcon,
  WarningTriangleIcon,
  InfoIcon,
  CloseIcon,
} from "@/app/components/icons";
import type { Toast, ToastType, ToastContextType } from "@/app/lib/types/toast";
import { TOAST_CONFIG } from "@/app/lib/constants";

export type { ToastType, Toast, ToastContextType };

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);
    },
    [],
  );

  const success = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "success", duration),
    [addToast],
  );

  const error = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "error", duration),
    [addToast],
  );

  const info = useCallback(
    (message: string, duration?: number) => addToast(message, "info", duration),
    [addToast],
  );

  const warning = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "warning", duration),
    [addToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, info, warning }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-9999 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  const config = TOAST_CONFIG[type];
  const style = { color: config.icon };

  switch (type) {
    case "success":
      return <CheckCircleIcon className="w-5 h-5" style={style} />;
    case "error":
      return <ErrorCircleIcon className="w-5 h-5" style={style} />;
    case "warning":
      return <WarningTriangleIcon className="w-5 h-5" style={style} />;
    case "info":
      return <InfoIcon className="w-5 h-5" style={style} />;
  }
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(toast.duration ?? 5000);
  const config = TOAST_CONFIG[toast.type];

  useEffect(() => {
    if (paused || remaining <= 0) return;

    const start = Date.now();
    const timer = setTimeout(() => {
      setExiting(true);
    }, remaining);

    return () => {
      clearTimeout(timer);
      setRemaining((prev) => prev - (Date.now() - start));
    };
  }, [paused, remaining]);

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(onClose, 300);
    return () => clearTimeout(timer);
  }, [exiting, onClose]);

  const duration = toast.duration ?? 5000;

  return (
    <div
      className={`pointer-events-auto ${exiting ? "animate-slideOut" : "animate-slideIn"}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative overflow-hidden rounded-md shadow-[0_1px_10px_0_rgba(0,0,0,0.1),0_2px_15px_0_rgba(0,0,0,0.05)] min-w-[320px] max-w-[420px] flex items-center"
        style={{ backgroundColor: config.bg }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-[5px]"
          style={{ backgroundColor: config.accent }}
        />

        <div className="flex items-center gap-3 px-4 py-3 pl-5 flex-1 min-w-0">
          <div className="shrink-0">
            <ToastIcon type={toast.type} />
          </div>
          <p className="text-sm text-[#757575] flex-1 min-w-0 wrap-break-word leading-snug">
            {toast.message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 self-start p-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <CloseIcon className="w-3.5 h-3.5 text-[#757575]" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent">
          <div
            className={`h-full opacity-70 animate-[toastProgress_linear_forwards] ${paused ? "[animation-play-state:paused]" : "[animation-play-state:running]"}`}
            style={{
              backgroundColor: config.progressBg,
              animationDuration: `${duration}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
