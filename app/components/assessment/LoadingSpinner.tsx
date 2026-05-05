export default function LoadingSpinner({ className }: { className: string }) {
  return (
    <div
      className={`${className} animate-spin rounded-full border-2 border-accent-primary border-t-transparent`}
    />
  );
}
