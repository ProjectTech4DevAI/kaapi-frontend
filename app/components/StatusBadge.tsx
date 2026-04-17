/**
 * StatusBadge - Color-coded status indicator
 * Displays status with appropriate color based on job/evaluation state
 */

"use client";

import { getStatusColor } from "./utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const statusColor = getStatusColor(status);

  const sizeClasses =
    size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs";

  return (
    <div
      className={`inline-block ${sizeClasses} rounded font-semibold border ${statusColor.bg} ${statusColor.border} ${statusColor.text}`}
    >
      {status.toUpperCase()}
    </div>
  );
}
