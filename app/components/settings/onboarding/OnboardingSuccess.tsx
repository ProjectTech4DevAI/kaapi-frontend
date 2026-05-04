"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components";
import { OnboardResponseData } from "@/app/lib/types/onboarding";

interface OnboardingSuccessProps {
  data: OnboardResponseData;
  onOnboardAnother?: () => void;
  onBackToList?: () => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

export default function OnboardingSuccess({
  data,
  onOnboardAnother,
  onBackToList,
}: OnboardingSuccessProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(data.api_key);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy. Please select and copy manually.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-green-50 border border-green-200 p-4">
        <p className="text-sm font-medium text-green-800">
          Onboarding completed successfully!
        </p>
        <p className="text-xs text-green-700 mt-1">
          Your organization, project, and admin user have been created.
        </p>
      </div>

      <div className="space-y-3">
        <SummaryRow label="Organization" value={data.organization_name} />
        <SummaryRow label="Project" value={data.project_name} />
        <SummaryRow label="Admin Email" value={data.user_email} />
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-amber-900">Your API Key</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-semibold">
            Shown only once
          </span>
        </div>
        <p className="text-xs text-amber-800 mb-3">
          Copy this key now. You will not be able to see it again.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-md bg-white border border-amber-200 text-sm text-text-primary font-mono break-all select-all">
            {data.api_key}
          </code>
          <Button
            onClick={copyApiKey}
            className={copied ? "bg-green-600!" : ""}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-neutral-50 p-4">
        <p className="text-sm font-medium text-text-primary mb-1">
          What&apos;s next?
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">
          Add this API key in the{" "}
          <a
            href="/keystore"
            className="text-accent-primary underline hover:text-accent-hover"
          >
            Keystore
          </a>{" "}
          to start using configurations, evaluations, and other features.
        </p>
      </div>

      {(onOnboardAnother || onBackToList) && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {onOnboardAnother && (
            <Button variant="primary" onClick={onOnboardAnother}>
              Onboard another organization
            </Button>
          )}
          {onBackToList && (
            <Button variant="outline" onClick={onBackToList}>
              Back to organizations
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
