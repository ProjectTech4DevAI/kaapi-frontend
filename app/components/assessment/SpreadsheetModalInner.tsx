"use client";

import { useEffect, useRef } from "react";
import { createUniver, defaultTheme, LocaleType } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import sheetsEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import CloseIcon from "@/app/components/icons/document/CloseIcon";
import {
  buildSpreadsheetWorkbookData,
  loadSpreadsheetState,
  persistSpreadsheetState,
} from "@/app/lib/assessment/results";
import { SPREADSHEET_STATE_DEBOUNCE_MS } from "@/app/lib/assessment/constants";
import type { UniverAPI } from "@/app/lib/types/assessment";

// Univer command types: 0=COMMAND, 1=OPERATION, 2=MUTATION. Only mutations change state.
const UNIVER_MUTATION_TYPE = 2;

interface SpreadsheetModalInnerProps {
  runId: number;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  onClose: () => void;
}

export default function SpreadsheetModalInner({
  runId,
  title,
  subtitle,
  headers,
  rows,
  onClose,
}: SpreadsheetModalInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<{ dispose?: () => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const { univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: sheetsEnUS },
      theme: defaultTheme,
      presets: [UniverSheetsCorePreset({ container: containerRef.current })],
    });

    const api = univerAPI as unknown as UniverAPI;
    univerRef.current = api;

    const saved = loadSpreadsheetState(runId);
    api.createUniverSheet(saved ?? buildSpreadsheetWorkbookData(headers, rows));

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSerialized: string | null = null;

    const flushNow = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      try {
        const snapshot = api.getActiveWorkbook()?.save();
        if (!snapshot) return;
        const serialized = JSON.stringify(snapshot);
        if (serialized === lastSerialized) return; // dedup unchanged saves
        lastSerialized = serialized;
        persistSpreadsheetState(runId, snapshot);
      } catch {
        // serialization failed or storage unavailable — keep in-memory state
      }
    };

    const cmdDisposable = api.onCommandExecuted((info) => {
      // Skip non-mutating commands (selection, scroll, focus, etc.)
      if (info.type !== UNIVER_MUTATION_TYPE) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flushNow, SPREADSHEET_STATE_DEBOUNCE_MS);
    });

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("beforeunload", flushNow);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", flushNow);
      document.removeEventListener("visibilitychange", handleVisibility);
      flushNow(); // flush pending edits on unmount
      cmdDisposable.dispose();
      api.dispose?.();
      univerRef.current = null;
    };
  }, [runId, headers, rows]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col bg-bg-primary rounded-lg shadow-2xl mx-4 my-4 flex-1 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1.5 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div ref={containerRef} className="flex-1 overflow-hidden" />
      </div>
    </div>
  );
}
