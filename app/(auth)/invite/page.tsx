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
import { Button } from "@/app/components";

type Status = "verifying" | "success" | "error";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

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
  }, [searchParams, loginWithToken]);

  useEffect(() => {
    if (status !== "success") return;

    const duration = 2000;
    const interval = 30;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(timer);
        router.push("/evaluations");
      }
    }, interval);

    return () => clearInterval(timer);
  }, [status, router]);

  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-linear-to-br from-blue-50 to-purple-50 opacity-60 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[500px] h-[500px] rounded-full bg-linear-to-tr from-green-50 to-blue-50 opacity-40 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-lg font-semibold text-text-primary tracking-tight">
            Kaapi Konsole
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">by Tech4Dev</p>
        </div>

        <div
          className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-500 ${
            status === "error"
              ? "border-red-200"
              : status === "success"
                ? "border-green-200"
                : "border-border"
          }`}
        >
          <div
            className="h-1 transition-all duration-700"
            style={{
              background:
                status === "error"
                  ? "linear-gradient(90deg, #fca5a5, #ef4444)"
                  : status === "success"
                    ? "linear-gradient(90deg, #86efac, #22c55e)"
                    : "linear-gradient(90deg, #dbeafe, #c7d2fe, #ddd6fe)",
            }}
          />

          <div className="px-8 py-10">
            <div className="flex justify-center mb-5">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                  status === "verifying"
                    ? "bg-neutral-50 border border-border"
                    : status === "success"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                }`}
              >
                {status === "verifying" && (
                  <SpinnerIcon className="w-7 h-7 text-text-secondary animate-spin" />
                )}
                {status === "success" && (
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                )}
                {status === "error" && (
                  <WarningIcon className="w-8 h-8 text-red-500" />
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-center text-xl font-semibold text-text-primary mb-2">
              {status === "verifying" && "Verifying invitation"}
              {status === "success" && "Welcome aboard!"}
              {status === "error" && "Something went wrong"}
            </h1>

            <p className="text-sm text-text-secondary leading-relaxed">
              {status === "verifying" &&
                "Please wait while we verify your invitation and set up your account."}
              {status === "success" &&
                "Your account has been activated. Redirecting you to the dashboard..."}
              {status === "error" && error}
            </p>

            {status === "success" && (
              <div className="mt-6 flex justify-center">
                <div className="h-1 w-32 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-[width] duration-75 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {status === "verifying" && (
              <div className="mt-6 flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            )}

            {status === "error" && (
              <div className="mt-8 space-y-3">
                <Button fullWidth onClick={() => router.push("/evaluations")}>
                  Go to Dashboard
                </Button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full text-center text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>

        {status === "error" && (
          <p className="text-center text-xs text-text-secondary mt-5 leading-relaxed">
            If this keeps happening, please contact your organization
            administrator for a new invitation link.
          </p>
        )}
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
