"use client";

import { useEffect, useState } from "react";
import { Select } from "@/app/components/ui";
import { MONTH_OPTIONS, getRecentYearOptions } from "@/app/lib/constants";

interface MonthYearPickerProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  yearCount?: number;
}

export default function MonthYearPicker({
  label,
  value,
  onChange,
  yearCount = 2,
}: MonthYearPickerProps) {
  const [year, setYear] = useState(value ? value.slice(0, 4) : "");
  const [month, setMonth] = useState(value ? value.slice(5, 7) : "");

  useEffect(() => {
    setYear(value ? value.slice(0, 4) : "");
    setMonth(value ? value.slice(5, 7) : "");
  }, [value]);

  const yearOptions = getRecentYearOptions(yearCount);

  const flush = (y: string, m: string) => {
    if (y && m) onChange(`${y}-${m}-01`);
    else if (!y && !m) onChange("");
  };

  const handleMonth = (m: string) => {
    setMonth(m);
    flush(year, m);
  };
  const handleYear = (y: string) => {
    setYear(y);
    flush(y, month);
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-text-secondary">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={month}
          onChange={(e) => handleMonth(e.target.value)}
          options={MONTH_OPTIONS}
          placeholder="Month"
        />
        <Select
          value={year}
          onChange={(e) => handleYear(e.target.value)}
          options={yearOptions}
          placeholder="Year"
        />
      </div>
    </div>
  );
}
