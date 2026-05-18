/**
 * ComingSoon - Reusable component for features under construction
 */

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui";
interface ComingSoonProps {
  featureName: string;
  description?: string;
}

export default function ComingSoon({
  featureName,
  description,
}: ComingSoonProps) {
  const router = useRouter();

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-8 relative inline-block">
            <div className="text-8xl animate-bounce [animation-duration:2s]">
              ☕
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
              <div className="text-3xl opacity-60 animate-[steam_3s_ease-in-out_infinite]">
                ～
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4 text-text-primary tracking-[-0.02em]">
            {featureName}
          </h1>

          <div className="inline-block px-4 py-2 rounded-full mb-6 bg-status-warning-bg border border-status-warning-border">
            <p className="text-sm font-semibold text-status-warning-text">
              🚧 Being Brewed
            </p>
          </div>

          <p className="text-lg mb-8 text-text-secondary">
            {description ||
              "This feature is currently being crafted with care. Check back soon for something amazing!"}
          </p>

          <div className="border border-border rounded-lg p-4 mb-8 bg-bg-primary">
            <p className="text-xs font-semibold mb-1 text-text-primary">
              ☕ Kaapi Fact
            </p>
            <p className="text-sm text-text-secondary">
              Great features, like great coffee, take time to brew.
            </p>
          </div>

          <Button variant="primary" size="md" onClick={() => router.back()}>
            ← Go Back
          </Button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes steam {
          0%,
          100% {
            transform: translateY(0) translateX(-50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-20px) translateX(-50%) scale(1.5);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
