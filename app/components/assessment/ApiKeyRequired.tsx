"use client";

import { KeyIcon } from "@/app/components/icons";

export default function ApiKeyRequired() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <span className="mx-auto mb-4 block text-border">
          <KeyIcon className="h-12 w-12" />
        </span>
        <p className="mb-1 text-sm font-medium text-text-primary">
          API key required
        </p>
        <p className="mb-4 text-xs text-text-secondary">
          Add an API key in the Keystore first
        </p>
        <a
          href="/keystore"
          className="inline-block rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Go to Keystore
        </a>
      </div>
    </div>
  );
}
