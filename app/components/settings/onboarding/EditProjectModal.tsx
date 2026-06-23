"use client";

import { useState, useEffect } from "react";
import { Button, Checkbox, Field, Modal } from "@/app/components/ui";
import { useToast } from "@/app/hooks/useToast";
import {
  EditProjectModalProps,
  ProjectResponse,
} from "@/app/lib/types/onboarding";
import { apiFetch } from "@/app/lib/apiClient";

export default function EditProjectModal({
  open,
  onClose,
  project,
  apiKey,
  onProjectUpdated,
}: EditProjectModalProps) {
  const toast = useToast();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [isActive, setIsActive] = useState(project.is_active);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? "");
    setIsActive(project.is_active);
    setNameError("");
  }, [project]);

  const handleClose = () => {
    setName(project.name);
    setDescription(project.description ?? "");
    setIsActive(project.is_active);
    setNameError("");
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
      await apiFetch<ProjectResponse>(`/api/projects/${project.id}`, apiKey, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          is_active: isActive,
        }),
      });

      toast.success("Project updated");
      onProjectUpdated();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update project",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit Project"
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

        <Checkbox
          checked={isActive}
          onChange={setIsActive}
          label="Active"
          description="Inactive projects won't be available for use."
        />

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            size="md"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
