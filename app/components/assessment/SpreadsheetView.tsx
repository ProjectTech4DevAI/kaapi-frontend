"use client";

import { useEffect, useRef } from "react";
import { createUniver, defaultTheme, LocaleType } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import sheetsEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import {
  buildSpreadsheetWorkbookData,
  loadSpreadsheetState,
  persistSpreadsheetState,
} from "@/app/lib/assessment/results";
import { SPREADSHEET_STATE_DEBOUNCE_MS } from "@/app/lib/assessment/constants";
import type { UniverAPI } from "@/app/lib/types/assessment";

const UNIVER_MUTATION_TYPE = 2;

interface SpreadsheetViewProps {
  runId: number;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
}

export default function SpreadsheetView({
  runId,
  title,
  subtitle,
  headers,
  rows,
}: SpreadsheetViewProps) {
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
        if (serialized === lastSerialized) return;
        lastSerialized = serialized;
        persistSpreadsheetState(runId, snapshot);
      } catch {
        // storage unavailable — keep in-memory state
      }
    };

    const cmdDisposable = api.onCommandExecuted((info) => {
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
      flushNow();
      cmdDisposable.dispose();
      api.dispose?.();
      univerRef.current = null;
    };
  }, [runId, headers, rows]);

  return (
    <div className="w-full h-screen flex flex-col bg-bg-primary">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
