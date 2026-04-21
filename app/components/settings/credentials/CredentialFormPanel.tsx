"use client";

import { Credential, ProviderDef } from "@/app/lib/types/credentials";
import { timeAgo } from "@/app/lib/utils";
import { Button, Field } from "@/app/components";

interface CredentialFormPanelProps {
  provider: ProviderDef;
  existingCredential: Credential | null;
  formValues: Record<string, string>;
  isActive: boolean;
  hasChanges: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onChange: (key: string, value: string) => void;
  onActiveChange: (active: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export default function CredentialFormPanel({
  provider,
  existingCredential,
  formValues,
  isActive,
  hasChanges,
  isLoading,
  isSaving,
  isDeleting,
  onChange,
  onActiveChange,
  onSave,
  onCancel,
  onDelete,
}: CredentialFormPanelProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-border border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Loading credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="max-w-md">
        <h3 className="text-base font-semibold mb-0.5 text-text-primary">
          {provider.name}
        </h3>
        <p className="text-sm mb-5 text-text-secondary">
          {provider.description}
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onActiveChange(e.target.checked)}
              className="w-4 h-4 rounded accent-status-success"
            />
            <span className="text-sm text-text-primary">Active</span>
          </label>

          {provider.fields.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              value={formValues[field.key] || ""}
              onChange={(val) => onChange(field.key, val)}
              placeholder={field.placeholder}
              type={field.type || "text"}
            />
          ))}

          {existingCredential?.updated_at && (
            <p className="text-xs text-text-secondary">
              Last updated: {timeAgo(existingCredential.updated_at)}
            </p>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            <Button
              onClick={onSave}
              disabled={isSaving || isDeleting || !hasChanges}
            >
              {isSaving ? "Saving..." : existingCredential ? "Update" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            {existingCredential && (
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={isSaving || isDeleting}
                className="ml-auto"
              >
                {isDeleting ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
