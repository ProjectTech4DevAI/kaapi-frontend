"use client";

import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { Button, Field } from "@/app/components/ui";
import {
  AddProjectModalProps,
  ProjectResponse,
} from "@/app/lib/types/onboarding";
import { apiFetch } from "@/app/lib/apiClient";
import { useToast } from "@/app/components/ui/Toast";

export default function AddProjectModal({
  open,
  onClose,
  organizationId,
  apiKey,
  onProjectAdded,
}: AddProjectModalProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsActive(true);
    setNameError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("Project name is required");
      return;
    }

    setNameError("");
    setIsSubmitting(true);

    try {
      await apiFetch<ProjectResponse>("/api/projects", apiKey, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          is_active: isActive,
          organization_id: organizationId,
        }),
      });

      toast.success(`Project "${name.trim()}" created`);
      resetForm();
      onProjectAdded();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create project",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Project"
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
          placeholder="Enter project name"
          error={nameError}
        />

        <Field
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Enter project description (optional)"
        />

        <div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-text-primary">Active</span>
          </label>
          <p className="text-xs text-text-secondary mt-1 ml-6.5">
            Inactive projects won&apos;t be available for use.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            size="md"
          >
            {isSubmitting ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
