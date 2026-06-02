"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon } from "@/app/components/icons";

interface MonthYearPickerProps {
  /** Label to render above the trigger. Pass empty/omit to skip (e.g. when wrapping in your own field). */
  label?: string;
  /** ISO date in `YYYY-MM-01` form (empty string when unset). */
  value: string;
  onChange: (iso: string) => void;
  /** How many months back to expose (default 24 → 2 years). */
  monthsBack?: number;
  placeholder?: string;
}

const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface AllowedRange {
  /** All `{ year, monthIdx }` pairs that are selectable, newest first. */
  pairs: { year: number; monthIdx: number }[];
  /** Sorted list of years that contain at least one allowed month, newest first. */
  years: number[];
  /** Map of year → Set of allowed month indices. */
  monthsByYear: Map<number, Set<number>>;
}

function buildAllowedRange(monthsBack: number): AllowedRange {
  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();
  const pairs: { year: number; monthIdx: number }[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const monthIdx = (((startMonth - i) % 12) + 12) % 12;
    const yearDelta = Math.floor((startMonth - i) / 12);
    pairs.push({ year: startYear + yearDelta, monthIdx });
  }
  const monthsByYear = new Map<number, Set<number>>();
  for (const { year, monthIdx } of pairs) {
    if (!monthsByYear.has(year)) monthsByYear.set(year, new Set());
    monthsByYear.get(year)!.add(monthIdx);
  }
  const years = Array.from(monthsByYear.keys()).sort((a, b) => b - a);
  return { pairs, years, monthsByYear };
}

function formatLabel(iso: string): string {
  const y = iso.slice(0, 4);
  const m = parseInt(iso.slice(5, 7), 10) - 1;
  if (Number.isNaN(m) || m < 0 || m > 11) return iso;
  return `${MONTH_LABELS_SHORT[m]} ${y}`;
}

export default function MonthYearPicker({
  label,
  value,
  onChange,
  monthsBack = 24,
  placeholder = "Select month",
}: MonthYearPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"year" | "month">("year");
  const [pendingYear, setPendingYear] = useState<number | null>(null);

  const range = useMemo(() => buildAllowedRange(monthsBack), [monthsBack]);

  const selectedYear = value ? parseInt(value.slice(0, 4), 10) : null;
  const selectedMonthIdx = value ? parseInt(value.slice(5, 7), 10) - 1 : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPopover = () => {
    setOpen(true);
    if (selectedYear != null) {
      setPendingYear(selectedYear);
      setView("month");
    } else {
      setPendingYear(null);
      setView("year");
    }
  };

  const handleYearPick = (year: number) => {
    setPendingYear(year);
    setView("month");
  };

  const handleMonthPick = (monthIdx: number) => {
    if (pendingYear == null) return;
    const mm = String(monthIdx + 1).padStart(2, "0");
    onChange(`${pendingYear}-${mm}-01`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-medium mb-1 text-text-secondary">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm bg-bg-primary text-left transition-colors cursor-pointer ${
          open ? "border-accent-primary" : "border-border"
        }`}
      >
        <span
          className={`truncate ${value ? "text-text-primary" : "text-text-secondary"}`}
        >
          {value ? formatLabel(value) : placeholder}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 text-text-secondary transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${label} picker`}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-md border border-border bg-bg-primary shadow-md p-2"
        >
          {view === "year" ? (
            <YearGrid
              years={range.years}
              selectedYear={selectedYear}
              onSelect={handleYearPick}
            />
          ) : (
            <MonthGrid
              year={pendingYear ?? range.years[0]}
              allowedMonths={
                range.monthsByYear.get(pendingYear ?? range.years[0]) ??
                new Set()
              }
              selectedMonth={
                pendingYear === selectedYear ? selectedMonthIdx : null
              }
              onBack={() => setView("year")}
              onSelect={handleMonthPick}
            />
          )}
        </div>
      )}
    </div>
  );
}

function YearGrid({
  years,
  selectedYear,
  onSelect,
}: {
  years: number[];
  selectedYear: number | null;
  onSelect: (year: number) => void;
}) {
  return (
    <div>
      <p className="px-2 pt-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
        Select year
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {years.map((y) => {
          const isSelected = y === selectedYear;
          return (
            <button
              key={y}
              type="button"
              onClick={() => onSelect(y)}
              className={`px-2 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                isSelected
                  ? "bg-accent-primary text-white"
                  : "text-text-primary hover:bg-bg-secondary"
              }`}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  year,
  allowedMonths,
  selectedMonth,
  onBack,
  onSelect,
}: {
  year: number;
  allowedMonths: Set<number>;
  selectedMonth: number | null;
  onBack: () => void;
  onSelect: (monthIdx: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 px-1 pt-1 pb-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to year"
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-secondary cursor-pointer"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          {year}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MONTH_LABELS_SHORT.map((label, monthIdx) => {
          const allowed = allowedMonths.has(monthIdx);
          const isSelected = allowed && selectedMonth === monthIdx;
          return (
            <button
              key={monthIdx}
              type="button"
              onClick={() => allowed && onSelect(monthIdx)}
              disabled={!allowed}
              className={`px-2 py-1.5 text-sm rounded-md transition-colors ${
                isSelected
                  ? "bg-accent-primary text-white cursor-pointer"
                  : allowed
                    ? "text-text-primary hover:bg-bg-secondary cursor-pointer"
                    : "text-text-secondary/40 cursor-not-allowed"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
