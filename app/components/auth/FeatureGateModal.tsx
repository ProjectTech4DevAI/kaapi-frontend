"use client";

import { Button } from "@/app/components/ui";
interface FeatureGateModalProps {
  feature: string;
  description: string;
  onLogin: () => void;
}

export default function FeatureGateModal({
  feature,
  description,
  onLogin,
}: FeatureGateModalProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-bg-secondary">
      <div className="max-w-sm text-center px-6">
        <h3 className="text-lg font-semibold text-text-primary">{feature}</h3>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {description}
        </p>
        <div className="mt-6">
          <Button size="lg" onClick={onLogin}>
            Log in
          </Button>
        </div>
      </div>
    </div>
  );
}
