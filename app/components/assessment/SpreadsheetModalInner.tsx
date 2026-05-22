"use client";

import { useEffect, useRef } from "react";
import { createUniver, defaultTheme, LocaleType } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import sheetsEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import CloseIcon from "@/app/components/icons/document/CloseIcon";

interface SpreadsheetModalInnerProps {
  runId: number;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  onClose: () => void;
}

const STORAGE_PREFIX = "kaapi_sheet_state_";

function storageKey(runId: number) {
  return `${STORAGE_PREFIX}${runId}`;
}

function loadSavedState(runId: number): object | null {
  try {
    const raw = localStorage.getItem(storageKey(runId));
    return raw ? (JSON.parse(raw) as object) : null;
  } catch {
    return null;
  }
}

function persistState(runId: number, data: object) {
  try {
    localStorage.setItem(storageKey(runId), JSON.stringify(data));
  } catch {
    // quota exceeded — silently skip
  }
}

function buildWorkbookData(headers: string[], rows: string[][]) {
  type CellEntry = { v: string | number; t: number; s?: object };
  const cellData: Record<number, Record<number, CellEntry>> = {};

  cellData[0] = {};
  headers.forEach((h, col) => {
    cellData[0][col] = {
      v: h,
      t: 1,
      s: { bl: 1, bg: { rgb: "#EFF6FF" }, cl: { rgb: "#1E40AF" } },
    };
  });

  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    row.forEach((cell, col) => {
      const numVal = Number(cell);
      const isNum = cell.trim() !== "" && !isNaN(numVal) && isFinite(numVal);
      cellData[rowIdx + 1][col] = isNum
        ? { v: numVal, t: 2 }
        : { v: cell, t: 1 };
    });
  });

  return {
    id: "assessment-results",
    locale: "enUS",
    name: "Assessment Results",
    appVersion: "0.5.0",
    sheets: {
      sheet1: {
        id: "sheet1",
        name: "Results",
        cellData,
        rowCount: Math.max(rows.length + 1, 100),
        columnCount: Math.max(headers.length, 26),
      },
    },
    styles: {},
  };
}

type UniverAPI = {
  dispose?: () => void;
  onCommandExecuted: (cb: () => void) => { dispose: () => void };
  getActiveWorkbook: () => { save: () => object } | null;
  createUniverSheet: (d: object) => void;
};

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

    const saved = loadSavedState(runId);
    api.createUniverSheet(saved ?? buildWorkbookData(headers, rows));

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const cmdDisposable = api.onCommandExecuted(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const snapshot = api.getActiveWorkbook()?.save();
        if (snapshot) persistState(runId, snapshot);
      }, 1500);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
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
