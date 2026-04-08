"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/context/AuthContext";
import { InviteVerifyResponse } from "@/app/lib/types/auth";
import {
  CheckCircleIcon,
  WarningIcon,
  SpinnerIcon,
} from "@/app/components/icons";

type Status = "verifying" | "success" | "error";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setError("Invalid invitation link. No token found.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/auth/invite?token=${encodeURIComponent(token)}`,
          { credentials: "include" },
        );

        const data: InviteVerifyResponse = await res.json();

        if (cancelled) return;

        if (!res.ok || !data.success || !data.data) {
          setStatus("error");
          setError(data.error || "Invitation link is invalid or has expired.");
          return;
        }

        loginWithToken(data.data.access_token, data.data.user);

        setStatus("success");

        setTimeout(() => {
          if (!cancelled) router.push("/evaluations");
        }, 1500);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setError("Failed to verify invitation. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, loginWithToken]);

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div
            className="h-2"
            style={{
              background:
                status === "error"
                  ? "linear-gradient(90deg, #fca5a5, #ef4444)"
                  : status === "success"
                    ? "linear-gradient(90deg, #86efac, #22c55e)"
                    : "linear-gradient(90deg, #dbeafe, #c7d2fe, #ddd6fe)",
            }}
          />

          <div className="px-8 py-10 text-center">
            <p className="text-xs font-medium text-text-secondary tracking-wider mb-8">
              Kaapi Konsole
            </p>

            <div className="flex justify-center mb-6">
              {status === "verifying" && (
                <div className="w-14 h-14 rounded-full bg-neutral-50 border border-border flex items-center justify-center">
                  <SpinnerIcon className="w-7 h-7 text-text-secondary animate-spin" />
                </div>
              )}
              {status === "success" && (
                <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                  <CheckCircleIcon className="w-7 h-7 text-green-600" />
                </div>
              )}
              {status === "error" && (
                <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                  <WarningIcon className="w-7 h-7 text-red-500" />
                </div>
              )}
            </div>

            <h1 className="text-xl font-semibold text-text-primary mb-2">
              {status === "verifying" && "Verifying your invitation..."}
              {status === "success" && "You're all set!"}
              {status === "error" && "Invitation failed"}
            </h1>

            <p className="text-sm text-text-secondary leading-relaxed">
              {status === "verifying" &&
                "Please wait while we verify your invitation and set up your account."}
              {status === "success" &&
                "Your account has been activated. Redirecting you to the dashboard..."}
              {status === "error" && error}
            </p>

            {status === "success" && (
              <div className="mt-6">
                <div className="h-1 w-24 mx-auto rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full animate-[progress_1.5s_ease-in-out]" />
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => router.push("/evaluations")}
                  className="w-full py-2.5 rounded-lg bg-text-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Go to Dashboard
                </button>
                <p className="text-xs text-text-secondary">
                  If you believe this is a mistake, please contact your
                  administrator.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-text-secondary mt-6">
          Powered by Tech4Dev
        </p>
      </div>
    </div>
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
