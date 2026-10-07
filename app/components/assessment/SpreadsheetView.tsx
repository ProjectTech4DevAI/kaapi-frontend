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
  savedSnapshotMatchesHeaders,
} from "@/app/lib/assessment/results";
import {
  SPREADSHEET_STATE_DEBOUNCE_MS,
  UNIVER_MUTATION_TYPE,
} from "@/app/lib/assessment/constants";
import type {
  SpreadsheetViewProps,
  UniverAPI,
} from "@/app/lib/types/assessment";

export default function SpreadsheetView({
  runId,
  headers,
  rows,
}: SpreadsheetViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<UniverAPI | null>(null);

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
    const useSaved =
      saved != null && savedSnapshotMatchesHeaders(saved, headers);
    api.createUniverSheet(
      useSaved ? saved : buildSpreadsheetWorkbookData(headers, rows),
    );

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
      } catch {}
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
    <div className="flex min-h-0 w-full flex-1 flex-col bg-bg-primary">
      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden" />
    </div>
  );
}
