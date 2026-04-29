"use client";

import { Credential, ProviderDef } from "@/app/lib/types/credentials";
import { getExistingForProvider } from "@/app/lib/utils";

interface ProviderSidebarProps {
  providers: ProviderDef[];
  selectedProvider: ProviderDef;
  credentials: Credential[];
  onSelect: (provider: ProviderDef) => void;
  className?: string;
}

export default function ProviderSidebar({
  providers,
  selectedProvider,
  credentials,
  onSelect,
  className = "",
}: ProviderSidebarProps) {
  return (
    <div className={`shrink-0 ${className}`}>
      <div className="p-3">
        <nav className="space-y-0.5">
          {providers.map((provider) => {
            const hasExisting = !!getExistingForProvider(provider, credentials);
            const isSelected = selectedProvider.id === provider.id;
            return (
              <button
                key={provider.id}
                onClick={() => onSelect(provider)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[14px] flex items-center justify-between gap-2 transition-all duration-150 border cursor-pointer ${
                  isSelected
                    ? "bg-accent-primary/15 text-accent-primary font-semibold border-transparent"
                    : "bg-transparent text-text-secondary font-medium border-transparent hover:bg-neutral-100 hover:text-text-primary"
                }`}
              >
                <span>{provider.name}</span>
                {hasExisting && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0 bg-status-success"
                    title="Configured"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
