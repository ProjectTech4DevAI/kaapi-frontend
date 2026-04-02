"use client";

import { useState } from "react";
import { Project, ProjectListProps } from "@/app/lib/types/onboarding";
import { formatRelativeTime } from "@/app/lib/utils";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  EditIcon,
} from "@/app/components/icons";
import { Button } from "@/app/components";
import { useAuth } from "@/app/lib/context/AuthContext";
import AddProjectModal from "./AddProjectModal";
import EditProjectModal from "./EditProjectModal";

function ProjectListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-white"
        >
          <div className="flex-1">
            <div className="h-4 w-36 bg-neutral-200 rounded mb-2" />
            <div className="h-3 w-48 bg-neutral-100 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 bg-neutral-100 rounded-full" />
            <div className="h-5 w-12 bg-neutral-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectList({
  organization,
  projects,
  isLoading,
  onBack,
  onSelectProject,
  onProjectAdded,
}: ProjectListProps) {
  const { activeKey, currentUser } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-text-secondary hover:text-text-primary mb-6 flex items-center gap-1 transition-colors"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to organizations
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {organization.name}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {isLoading
              ? "Loading projects..."
              : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {currentUser?.is_superuser && (
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            + Add Project
          </Button>
        )}
      </div>

      {isLoading ? (
        <ProjectListSkeleton />
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-text-secondary text-sm">
          No projects found for this organization.
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-white transition-colors hover:bg-neutral-50"
            >
              <button
                onClick={() => onSelectProject(project)}
                className="flex-1 text-left min-w-0"
              >
                <p className="text-sm font-medium text-text-primary">
                  {project.name}
                </p>
                {project.description && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {project.description}
                  </p>
                )}
                <p className="text-xs text-text-secondary mt-0.5">
                  Created {formatRelativeTime(project.inserted_at)}
                </p>
              </button>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                    project.is_active
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-neutral-100 text-text-secondary border border-border"
                  }`}
                >
                  {project.is_active ? "Active" : "Inactive"}
                </span>
                {currentUser?.is_superuser && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject(project);
                    }}
                    className="p-1.5 rounded-md text-text-secondary hover:bg-neutral-100 hover:text-text-primary transition-colors cursor-pointer"
                    title="Edit project"
                  >
                    <EditIcon className="w-4.5 h-4.5" />
                  </button>
                )}
                <button onClick={() => onSelectProject(project)}>
                  <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddProjectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        organizationId={organization.id}
        apiKey={activeKey?.key ?? ""}
        onProjectAdded={onProjectAdded}
      />

      {editingProject && (
        <EditProjectModal
          open={!!editingProject}
          onClose={() => setEditingProject(null)}
          project={editingProject}
          apiKey={activeKey?.key ?? ""}
          onProjectUpdated={onProjectAdded}
        />
      )}
    </div>
  );
}
