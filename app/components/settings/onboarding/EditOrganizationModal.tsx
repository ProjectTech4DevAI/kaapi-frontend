"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox, Field, Modal } from "@/app/components/ui";
import { useToast } from "@/app/hooks/useToast";
import {
  EditOrganizationModalProps,
  OrganizationResponse,
} from "@/app/lib/types/onboarding";
import { apiFetch } from "@/app/lib/apiClient";

export default function EditOrganizationModal({
  open,
  onClose,
  organization,
  apiKey,
  onOrganizationUpdated,
}: EditOrganizationModalProps) {
  const toast = useToast();
  const [name, setName] = useState(organization.name);
  const [isActive, setIsActive] = useState(organization.is_active);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setName(organization.name);
    setIsActive(organization.is_active);
    setNameError("");
  }, [organization]);

  const handleClose = () => {
    if (isSubmitting) return;
    setName(organization.name);
    setIsActive(organization.is_active);
    setNameError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("Organization name is required");
      return;
    }

    setNameError("");
    setIsSubmitting(true);

    try {
      await apiFetch<OrganizationResponse>(
        `/api/organization/${organization.id}`,
        apiKey,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            is_active: isActive,
          }),
        },
      );

      toast.success("Organization updated");
      onOrganizationUpdated();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update organization",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges =
    name.trim() !== organization.name || isActive !== organization.is_active;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit organization"
      maxWidth="max-w-md"
    >
      <div className="px-6 pb-6 space-y-4">
        <Field
          label="Name *"
          value={name}
          onChange={(val) => {
            setName(val);
            if (nameError) setNameError("");
          }}
          placeholder="Enter organization name"
          error={nameError}
        />

        <Checkbox
          checked={isActive}
          onChange={setIsActive}
          label="Active"
          description="Inactive organizations are hidden from listings and their projects are deactivated."
        />

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="md"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !hasChanges}
            size="md"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
