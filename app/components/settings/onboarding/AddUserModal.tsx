"use client";

import { useState } from "react";
import Modal from "@/app/components/ui/Modal";
import { Button, Field } from "@/app/components/ui";
import { isValidEmail } from "@/app/lib/utils";
import {
  AddUserModalProps,
  UserProjectListResponse,
} from "@/app/lib/types/onboarding";
import { apiFetch } from "@/app/lib/apiClient";
import { useToast } from "@/app/components/ui/Toast";

export default function AddUserModal({
  open,
  onClose,
  organizationId,
  projectId,
  apiKey,
  onUsersAdded,
}: AddUserModalProps) {
  const toast = useToast();
  const [userRows, setUserRows] = useState([{ email: "", full_name: "" }]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [isAdding, setIsAdding] = useState(false);

  const updateRow = (
    index: number,
    field: "email" | "full_name",
    value: string,
  ) => {
    setUserRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
    if (rowErrors[index]) {
      setRowErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const addRow = () => {
    setUserRows((prev) => [...prev, { email: "", full_name: "" }]);
  };

  const removeRow = (index: number) => {
    if (userRows.length === 1) return;
    setUserRows((prev) => prev.filter((_, i) => i !== index));
    setRowErrors((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const key = Number(k);
        if (key < index) next[key] = v;
        else if (key > index) next[key - 1] = v;
      });
      return next;
    });
  };

  const resetForm = () => {
    setUserRows([{ email: "", full_name: "" }]);
    setRowErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const filledRows = userRows.filter((r) => r.email.trim());

    if (filledRows.length === 0) {
      setRowErrors({ 0: "Please enter an email address" });
      return;
    }

    const errors: Record<number, string> = {};
    userRows.forEach((row, i) => {
      if (row.email.trim() && !isValidEmail(row.email.trim())) {
        errors[i] = "Invalid email address";
      }
    });

    if (Object.keys(errors).length > 0) {
      setRowErrors(errors);
      return;
    }

    setRowErrors({});
    setIsAdding(true);

    try {
      const payload = filledRows.map((r) => {
        const entry: { email: string; full_name?: string } = {
          email: r.email.trim(),
        };
        if (r.full_name.trim()) entry.full_name = r.full_name.trim();
        return entry;
      });

      await apiFetch<UserProjectListResponse>("/api/user-projects", apiKey, {
        method: "POST",
        body: JSON.stringify({
          organization_id: organizationId,
          project_id: projectId,
          users: payload,
        }),
      });

      toast.success(
        `${filledRows.length} user${filledRows.length > 1 ? "s" : ""} added`,
      );
      resetForm();
      onUsersAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add users");
    } finally {
      setIsAdding(false);
    }
  };

  const filledCount = userRows.filter((r) => r.email.trim()).length;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Users"
      maxWidth="max-w-lg"
    >
      <div className="px-6 pb-6">
        <p className="text-sm text-text-secondary mb-4">
          Add users by email. Full name is optional.
        </p>

        <div className="space-y-3">
          {userRows.map((row, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1">
                <Field
                  label=""
                  value={row.email}
                  onChange={(val) => updateRow(index, "email", val)}
                  placeholder="Email address"
                  error={rowErrors[index]}
                />
              </div>
              <div className="flex-1">
                <Field
                  label=""
                  value={row.full_name}
                  onChange={(val) => updateRow(index, "full_name", val)}
                  placeholder="Full name (optional)"
                />
              </div>
              {userRows.length > 1 && (
                <button
                  onClick={() => removeRow(index)}
                  className="mt-2 p-1 text-text-secondary hover:text-red-500 transition-colors cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 mb-5">
          <Button variant="ghost" size="sm" onClick={addRow}>
            + Add another
          </Button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isAdding || filledCount === 0}
            size="md"
          >
            {isAdding ? "Adding..." : `Add User${filledCount > 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
