"use client";

import { useState } from "react";

const DESCRIPTION_CHAR_LIMIT = 100;

export default function DatasetDescription({
  description,
}: {
  description: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > DESCRIPTION_CHAR_LIMIT;

  return (
    <div className="mt-2 text-xs leading-relaxed wrap-break-word overflow-hidden text-text-secondary">
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
          className="mt-1 block text-xs font-medium text-text-primary cursor-pointer"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
