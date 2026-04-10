"use client";

import { useState } from "react";
import { colors } from "@/app/lib/colors";

const DESCRIPTION_CHAR_LIMIT = 100;

export default function DatasetDescription({
  description,
}: {
  description: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > DESCRIPTION_CHAR_LIMIT;

  return (
    <div
      className="mt-2 text-xs leading-relaxed break-words overflow-hidden"
      style={{ color: colors.text.secondary }}
    >
      <span>
        {isLong && !expanded
          ? description.slice(0, DESCRIPTION_CHAR_LIMIT).trimEnd() + "..."
          : description}
      </span>
      {isLong && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="mt-1 block text-xs font-medium"
          style={{ color: colors.text.primary }}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
