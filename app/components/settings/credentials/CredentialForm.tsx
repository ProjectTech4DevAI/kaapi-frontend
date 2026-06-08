"use client";

import { Loader, Field, Button } from "@/app/components/ui";
import { Credential, ProviderDef } from "@/app/lib/types/credentials";
import { timeAgo } from "@/app/lib/utils";

interface Props {
  provider: ProviderDef;
  existingCredential: Credential | null;
  formValues: Record<string, string>;
  isActive: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting?: boolean;
  onChange: (key: string, value: string) => void;
  onActiveChange: (active: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function CredentialForm({
  provider,
  existingCredential,
  formValues,
  isActive,
  isLoading,
  isSaving,
  isDeleting,
  onChange,
  onActiveChange,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold mb-1 text-text-primary">
        {provider.name}
      </h2>
      <p className="text-sm mb-6 text-text-secondary">{provider.description}</p>

      {isLoading ? (
        <Loader size="sm" message="Loading credentials…" />
      ) : (
        <div className="space-y-5">
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onActiveChange(e.target.checked)}
              className="w-4 h-4 rounded accent-status-success"
            />
            <span className="text-sm text-text-primary">Active?</span>
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

          {existingCredential && (
            <p className="text-xs text-text-secondary">
              Last updated:{" "}
              {existingCredential.updated_at
                ? timeAgo(existingCredential.updated_at)
                : "—"}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={onSave} disabled={isSaving || isDeleting}>
              {isSaving ? "Saving…" : existingCredential ? "Update" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            {existingCredential && onDelete && (
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={isSaving || isDeleting}
                className="ml-auto"
              >
                {isDeleting ? "Removing…" : "Remove"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
