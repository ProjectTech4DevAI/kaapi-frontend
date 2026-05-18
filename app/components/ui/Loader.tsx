/**
 * Loader - Reusable circular loader component
 */

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

const SIZE_CLASS: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "w-5 h-5 border-t-2 border-b-2",
  md: "w-8 h-8 border-t-[3px] border-b-[3px]",
  lg: "w-12 h-12 border-t-4 border-b-4",
};

export default function Loader({
  size = "md",
  message,
  fullScreen = false,
}: LoaderProps) {
  const sizeClass = SIZE_CLASS[size];

  const loaderContent = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClass} animate-spin rounded-full border-border border-t-accent-primary border-b-accent-primary [animation-duration:0.9s] [animation-timing-function:cubic-bezier(0.4,0,0.2,1)]`}
        role="status"
        aria-label={message ?? "Loading"}
      />
      {message && (
        <p className="text-sm font-medium text-text-secondary tracking-[-0.005em]">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bg-secondary">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

/**
 * LoaderBox - Loader inside a bordered container
 */
export function LoaderBox({
  message,
  size = "md",
}: {
  message?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="border rounded-lg p-8 text-center bg-bg-primary border-border">
      <Loader size={size} message={message} />
    </div>
  );
}
