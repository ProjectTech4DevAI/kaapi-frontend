import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
}

export default function Tag({ children }: TagProps) {
  return (
    <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-bg-secondary text-text-primary">
      {children}
    </span>
  );
}
