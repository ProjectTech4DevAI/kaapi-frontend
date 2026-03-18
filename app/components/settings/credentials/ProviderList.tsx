"use client";

import { colors } from "@/app/lib/colors";
import { Credential, ProviderDef } from "@/app/lib/types/credentials";
import { getExistingForProvider } from "@/app/lib/utils";

interface Props {
  providers: ProviderDef[];
  selectedProvider: ProviderDef;
  credentials: Credential[];
  onSelect: (provider: ProviderDef) => void;
}

export default function ProviderList({
  providers,
  selectedProvider,
  credentials,
  onSelect,
}: Props) {
  return (
    <div
      className="w-56 shrink-0 border-r overflow-y-auto"
      style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border }}
    >
      <div className="p-3">
        <p
          className="text-xs font-medium uppercase tracking-wide px-2 mb-2"
          style={{ color: colors.text.secondary }}
        >
          Providers
        </p>
        <nav className="space-y-0.5">
          {providers.map((provider) => {
            const hasExisting = !!getExistingForProvider(provider, credentials);
            const isSelected = selectedProvider.id === provider.id;
            return (
              <button
                key={provider.id}
                onClick={() => onSelect(provider)}
                className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2"
                style={{
                  backgroundColor: isSelected ? colors.bg.primary : "transparent",
                  color: isSelected ? colors.text.primary : colors.text.secondary,
                  fontWeight: isSelected ? 600 : 400,
                  border: isSelected
                    ? `1px solid ${colors.border}`
                    : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = colors.bg.primary;
                    e.currentTarget.style.color = colors.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = colors.text.secondary;
                  }
                }}
              >
                <span>{provider.name}</span>
                {hasExisting && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: colors.status.success }}
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
