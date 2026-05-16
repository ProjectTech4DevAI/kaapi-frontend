interface FileExtBadgeProps {
  fileName: string;
  size?: "sm" | "md";
  className?: string;
}

const EXT_COLORS: Record<string, string> = {
  pdf: "bg-status-error-bg text-status-error-text",
  doc: "bg-blue-100 text-blue-700",
  docx: "bg-blue-100 text-blue-700",
  txt: "bg-neutral-200 text-text-primary",
  csv: "bg-status-success-bg text-status-success-text",
  md: "bg-neutral-200 text-text-primary",
  jpg: "bg-status-error-bg text-status-error-text",
  jpeg: "bg-status-error-bg text-status-error-text",
  png: "bg-purple-100 text-purple-700",
  gif: "bg-purple-100 text-purple-700",
};

const SIZE_CLASS = {
  sm: "w-6 h-6 text-[8px] rounded",
  md: "w-9 h-9 text-[10px] rounded-md",
};

export const getFileExtension = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return "FILE";
  return fileName.slice(dot + 1).toLowerCase();
};

export default function FileExtBadge({
  fileName,
  size = "md",
  className = "",
}: FileExtBadgeProps) {
  const ext = getFileExtension(fileName);
  const colorClass = EXT_COLORS[ext] || "bg-neutral-200 text-text-primary";
  return (
    <span
      className={`shrink-0 inline-flex items-center justify-center font-bold uppercase ${SIZE_CLASS[size]} ${colorClass} ${className}`}
    >
      {ext}
    </span>
  );
}
