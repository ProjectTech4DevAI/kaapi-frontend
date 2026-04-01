"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Organization,
  Project,
  UserProject,
  UserProjectListResponse,
  UserProjectDeleteResponse,
} from "@/app/lib/types/onboarding";
import { formatRelativeTime, isValidEmail } from "@/app/lib/utils";
import { ArrowLeftIcon } from "@/app/components/icons";
import { Button, Field } from "@/app/components";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { useToast } from "@/app/components/Toast";

interface UserListProps {
  organization: Organization;
  project: Project;
  onBack: () => void;
}

function UserListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-white"
        >
          <div className="flex-1">
            <div className="h-4 w-40 bg-neutral-200 rounded mb-2" />
            <div className="h-3 w-56 bg-neutral-100 rounded" />
          </div>
          <div className="h-8 w-16 bg-neutral-100 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function UserList({
  organization,
  project,
  onBack,
}: UserListProps) {
  const toast = useToast();
  const { activeKey, currentUser } = useAuth();
  const apiKey = activeKey?.key ?? "";

  const [users, setUsers] = useState<UserProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRows, setUserRows] = useState([{ email: "", full_name: "" }]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<UserProjectListResponse>(
        `/api/user-projects?project_id=${project.id}`,
        apiKey,
      );
      const list = data.data || [];
      setUsers(list);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, project.id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const handleAddUsers = async () => {
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
          organization_id: organization.id,
          project_id: project.id,
          users: payload,
        }),
      });
      toast.success(
        `${filledRows.length} user${filledRows.length > 1 ? "s" : ""} added successfully`,
      );
      setUserRows([{ email: "", full_name: "" }]);
      await fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add users");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveUser = async (userId: number) => {
    setRemovingId(userId);
    try {
      await apiFetch<UserProjectDeleteResponse>(
        `/api/user-projects/${userId}?project_id=${project.id}`,
        apiKey,
        {
          method: "DELETE",
        },
      );
      toast.success("User removed");
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove user");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" className="px-0!" onClick={onBack}>
        <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to projects
      </Button>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {project.name}
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          {organization.name} &middot;{" "}
          {isLoading
            ? "Loading users..."
            : `${users.length} user${users.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {currentUser?.is_superuser && (
        <div className="mb-6 p-4 rounded-lg border border-border bg-white">
          <p className="text-sm font-medium text-text-primary mb-3">
            Add Users
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(index)}
                  >
                    &times;
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <Button variant="ghost" size="sm" onClick={addRow}>
              + Add another
            </Button>
            <Button
              onClick={handleAddUsers}
              disabled={isAdding || userRows.every((r) => !r.email.trim())}
              size="md"
            >
              {isAdding
                ? "Adding..."
                : `Add User${userRows.filter((r) => r.email.trim()).length > 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <UserListSkeleton />
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-text-secondary text-sm">
          No users found for this project.
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-white"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {user.full_name}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {user.email}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Added {formatRelativeTime(user.inserted_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    user.is_active
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-neutral-100 text-text-secondary border border-border"
                  }`}
                >
                  {user.is_active ? "Active" : "Inactive"}
                </span>
                {currentUser?.is_superuser && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveUser(user.user_id)}
                    disabled={removingId === user.user_id}
                  >
                    {removingId === user.user_id ? "Removing..." : "Remove"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
