"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Organization,
  Project,
  UserProject,
  UserProjectListResponse,
  UserProjectDeleteResponse,
} from "@/app/lib/types/onboarding";
import { formatRelativeTime } from "@/app/lib/utils";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@/app/components/icons";
import { Button } from "@/app/components";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { useToast } from "@/app/components/Toast";
import AddUserModal from "./AddUserModal";

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
  const [showAddModal, setShowAddModal] = useState(false);
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

  const handleRemoveUser = async (userId: number) => {
    setRemovingId(userId);
    try {
      await apiFetch<UserProjectDeleteResponse>(
        `/api/user-projects/${userId}?project_id=${project.id}`,
        apiKey,
        { method: "DELETE" },
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

      <div className="flex items-center justify-between mb-4">
        <div>
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
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            + Add User
          </Button>
        )}
      </div>

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
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                    user.is_active
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-neutral-100 text-text-secondary border border-border"
                  }`}
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  {user.is_active ? "Active" : "Inactive"}
                </span>
                {currentUser?.is_superuser && (
                  <button
                    onClick={() => handleRemoveUser(user.user_id)}
                    disabled={removingId === user.user_id}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 font-medium rounded-lg border border-red bg-white text-red-600 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    {removingId === user.user_id ? "Removing..." : "Remove"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddUserModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        organizationId={organization.id}
        projectId={project.id}
        apiKey={apiKey}
        onUsersAdded={fetchUsers}
      />
    </div>
  );
}
