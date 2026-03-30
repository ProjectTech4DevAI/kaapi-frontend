import { Organization, Project } from "@/app/lib/types/onboarding";
import { formatRelativeTime } from "@/app/lib/utils";
import { ArrowLeftIcon } from "@/app/components/icons";

interface ProjectListProps {
  organization: Organization;
  projects: Project[];
  isLoading: boolean;
  onBack: () => void;
}

export default function ProjectList({
  organization,
  projects,
  isLoading,
  onBack,
}: ProjectListProps) {
  const renderProjectLoader = () => {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-white animate-pulse"
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
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-text-secondary hover:text-text-primary mb-6 flex items-center gap-1 transition-colors"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to organizations
      </button>

      <div className="flex items-center justify-between mb-6">
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
      </div>

      {isLoading ? (
        renderProjectLoader()
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-text-secondary text-sm">
          No projects found for this organization.
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-white"
            >
              <div>
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
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    project.is_active
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-neutral-100 text-text-secondary border border-border"
                  }`}
                >
                  {project.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-xs text-text-secondary px-2 py-1 rounded bg-neutral-100">
                  ID: {project.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
