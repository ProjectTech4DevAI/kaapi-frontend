"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpinnerIcon } from "@/app/components/icons";
import TokenVerifyPage from "@/app/components/auth/TokenVerifyPage";

function InviteContent() {
  const searchParams = useSearchParams();

  return (
    <TokenVerifyPage
      token={searchParams.get("token")}
      apiUrl="/api/auth/invite"
      title={{
        verifying: "Verifying invitation",
        success: "Welcome aboard!",
        error: "Something went wrong",
      }}
      description={{
        verifying: "Hang tight — we're setting up your account.",
        success: "Your account has been activated. Redirecting to dashboard...",
      }}
      errorFallback="Invitation link is invalid or has expired."
      helpText="If this keeps happening, please contact your organization administrator for a new invitation link."
    />
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
          <SpinnerIcon className="w-8 h-8 text-text-secondary animate-spin" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
