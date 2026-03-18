"use client";

import { colors } from "@/app/lib/colors";
import Loader from "@/app/components/Loader";
import { Credential, ProviderDef } from "@/app/lib/types/credentials";

interface Props {
  provider: ProviderDef;
  existingCredential: Credential | null;
  formValues: Record<string, string>;
  isActive: boolean;
  isLoading: boolean;
  isSaving: boolean;
  visibleFields: Set<string>;
  onChange: (key: string, value: string) => void;
  onActiveChange: (active: boolean) => void;
  onToggleVisibility: (key: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function CredentialForm({
  provider,
  existingCredential,
  formValues,
  isActive,
  isLoading,
  isSaving,
  visibleFields,
  onChange,
  onActiveChange,
  onToggleVisibility,
  onSave,
  onCancel,
}: Props) {
  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold mb-1" style={{ color: colors.text.primary }}>
        {provider.name}
      </h2>
      <p className="text-sm mb-6" style={{ color: colors.text.secondary }}>
        {provider.description}
      </p>

      {isLoading ? (
        <Loader size="sm" message="Loading credentials…" />
      ) : (
        <div className="space-y-5">
          {/* Active toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onActiveChange(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: colors.status.success }}
            />
            <span className="text-sm" style={{ color: colors.text.primary }}>
              Active?
            </span>
          </label>

          {/* Fields */}
          {provider.fields.map((field) => {
            const isPassword = field.type === "password";
            const visible = visibleFields.has(field.key);
            const hasSavedValue = !!existingCredential && !!formValues[field.key];
            return (
              <div key={field.key}>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: colors.text.primary }}
                >
                  {field.label}
                  {isPassword && hasSavedValue && (
                    <span
                      className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${colors.status.success}20`,
                        color: colors.status.success,
                      }}
                    >
                      Saved
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={isPassword && !visible ? "password" : "text"}
                    value={formValues[field.key] || ""}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.bg.primary,
                      color: colors.text.primary,
                      paddingRight: isPassword ? "2.75rem" : undefined,
                    }}
                    onFocus={(e) => { e.target.style.borderColor = colors.accent.primary; }}
                    onBlur={(e) => { e.target.style.borderColor = colors.border; }}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(field.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: colors.text.secondary }}
                      tabIndex={-1}
                    >
                      {visible ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Last updated */}
          {existingCredential && (
            <p className="text-xs" style={{ color: colors.text.secondary }}>
              Last updated:{" "}
              {existingCredential.updated_at
                ? new Date(existingCredential.updated_at).toLocaleString()
                : "—"}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: isSaving ? colors.accent.hover : colors.accent.primary,
                color: "#fff",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "Saving…" : existingCredential ? "Update" : "Save"}
            </button>
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="px-5 py-2 rounded-full text-sm font-medium border transition-colors"
              style={{
                borderColor: colors.border,
                color: colors.text.secondary,
                backgroundColor: colors.bg.primary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.accent.primary;
                e.currentTarget.style.color = colors.text.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.color = colors.text.secondary;
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
