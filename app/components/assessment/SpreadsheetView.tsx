"use client";

import { useEffect, useRef } from "react";
import { createUniver, defaultTheme, LocaleType } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import sheetsEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import { Button } from "@/app/components/ui";
import { DownloadIcon } from "@/app/components/icons/assessment";
import {
  buildSpreadsheetWorkbookData,
  loadSpreadsheetState,
  persistSpreadsheetState,
  rowsToCsv,
  savedSnapshotMatchesHeaders,
  spreadsheetSnapshotToRows,
} from "@/app/lib/assessment/results";
import {
  SPREADSHEET_STATE_DEBOUNCE_MS,
  UNIVER_MUTATION_TYPE,
} from "@/app/lib/assessment/constants";
import type { UniverAPI } from "@/app/lib/types/assessment";

const BOM_UTF8 = String.fromCharCode(0xfeff);

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
  const univerRef = useRef<UniverAPI | null>(null);

  // Export the current (edited) sheet straight from the live Univer state — no API call.
  const handleDownloadCsv = () => {
    const snapshot = univerRef.current?.getActiveWorkbook()?.save();
    const matrix = snapshot
      ? spreadsheetSnapshotToRows(snapshot)
      : [headers, ...rows];
    const csv = rowsToCsv(matrix);
    // Prepend BOM so Excel reads UTF-8 (preserves Hindi/Telugu text).
    const blob = new Blob([BOM_UTF8, csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "results"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

    // Use the cached snapshot only when its columns still match the fresh data,
    // so newly-available columns (e.g. duplicate detection, L2 output) aren't
    // hidden by a stale snapshot persisted from an earlier, partial state.
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadCsv}
          className="!rounded-md !px-2.5 !py-1.5 !text-xs"
          aria-label="Download CSV"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          Download CSV
        </Button>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
