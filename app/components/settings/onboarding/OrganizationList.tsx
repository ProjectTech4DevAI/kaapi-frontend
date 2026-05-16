import { OrganizationListProps } from "@/app/lib/types/onboarding";
import { formatRelativeTime } from "@/app/lib/utils";
import { Button, Loader } from "@/app/components";
import { useAuth } from "@/app/lib/context/AuthContext";
import { ChevronRightIcon } from "@/app/components/icons";

export default function OrganizationList({
  organizations,
  isLoadingMore,
  onNewOrg,
  onSelectOrg,
}: OrganizationListProps) {
  const { currentUser } = useAuth();
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Organizations
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {organizations.length} organization
            {organizations.length !== 1 ? "s" : ""}
          </p>
        </div>
        {currentUser?.is_superuser && (
          <Button size="sm" onClick={onNewOrg}>
            + New Organization
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => onSelectOrg(org)}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-lg bg-bg-primary text-left shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-shadow cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {org.name}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Created {formatRelativeTime(org.inserted_at)}
              </p>
            </div>
            <ChevronRightIcon className="w-4 h-4 shrink-0 text-text-secondary" />
          </button>
        ))}
      </div>

      {isLoadingMore && (
        <div className="text-center py-4 text-text-secondary">
          <Loader message="Loading more..." size="sm" />
        </div>
      )}
    </div>
  );
}
