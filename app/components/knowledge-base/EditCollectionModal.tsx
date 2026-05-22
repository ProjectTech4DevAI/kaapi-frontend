"use client";

import { useEffect, useState } from "react";
import { Button, Modal, Field } from "@/app/components/ui";
import { Collection } from "@/app/lib/types/document";
import {
  COLLECTION_DESCRIPTION_MAX,
  COLLECTION_NAME_MAX,
} from "@/app/lib/constants";

interface EditCollectionModalProps {
  open: boolean;
  collection: Collection | null;
  onClose: () => void;
  onSave: (patch: { name?: string; description?: string }) => Promise<boolean>;
}

export default function EditCollectionModal({
  open,
  collection,
  onClose,
  onSave,
}: EditCollectionModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && collection) {
      setName(collection.name ?? "");
      setDescription(collection.description ?? "");
    }
  }, [open, collection]);

  const handleSave = async () => {
    if (!collection) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const patch: { name?: string; description?: string } = {};
    if (trimmedName !== (collection.name ?? "")) patch.name = trimmedName;
    if (description !== (collection.description ?? ""))
      patch.description = description;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setIsSaving(true);
    const ok = await onSave(patch);
    setIsSaving(false);
    if (ok) onClose();
  };

  const isDisabled = isSaving || !name.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Knowledge Base"
      maxWidth="max-w-lg"
    >
      <div className="px-6 pb-6 space-y-4">
        <div>
          <Field
            label="Name *"
            value={name}
            onChange={setName}
            placeholder="e.g., Product Docs v1"
            maxLength={COLLECTION_NAME_MAX}
          />
          <p className="text-[11px] text-text-secondary mt-1 text-right">
            {name.length}/{COLLECTION_NAME_MAX}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-text-secondary">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description..."
            rows={3}
            maxLength={COLLECTION_DESCRIPTION_MAX}
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-text-primary text-sm placeholder:text-neutral-400 resize-none focus:outline-none focus:ring-accent-primary/20 focus:border-accent-primary transition-colors"
          />
          <p className="text-[11px] text-text-secondary mt-1 text-right">
            {description.length}/{COLLECTION_DESCRIPTION_MAX}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={isDisabled}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
