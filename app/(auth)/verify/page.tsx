"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpinnerIcon } from "@/app/components/icons";
import TokenVerifyPage from "@/app/components/auth/TokenVerifyPage";

function VerifyContent() {
  const searchParams = useSearchParams();

  return (
    <TokenVerifyPage
      token={searchParams.get("token")}
      apiUrl="/api/auth/magic-link/verify"
      title={{
        verifying: "Signing you in",
        success: "You're in!",
        error: "Login link failed",
      }}
      description={{
        verifying: "Verifying your login link...",
        success: "Redirecting to dashboard...",
      }}
      errorFallback="Login link is invalid or has expired."
      helpText="Login links expire after 15 minutes. Please request a new one from the login page."
    />
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
          <SpinnerIcon className="w-8 h-8 text-text-secondary animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
