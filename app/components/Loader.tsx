/**
 * Loader - Reusable circular loader component
 */

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

export default function Loader({
  size = "md",
  message,
  fullScreen = false,
}: LoaderProps) {
  const sizeClass = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }[size];

  const loaderContent = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClass} rounded-full animate-spin loader-spinner`}
      />
      {message && (
        <p className="text-sm font-medium text-text-secondary">{message}</p>
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
    <div className="border rounded-lg p-8 text-center bg-white border-gray-200">
      <Loader size={size} message={message} />
    </div>
  );
}
