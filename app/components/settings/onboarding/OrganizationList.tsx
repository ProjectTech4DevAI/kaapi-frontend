import {
  ActiveStatus,
  OrganizationListProps,
} from "@/app/lib/types/onboarding";
import { formatRelativeTime } from "@/app/lib/utils";
import { Button, Loader, TabNavigation } from "@/app/components/ui";
import { useAuth } from "@/app/lib/context/AuthContext";
import {
  ChevronRightIcon,
  EditIcon,
  SearchIcon,
  TrashIcon,
} from "@/app/components/icons";
import { STATUS_TABS } from "@/app/lib/constants";

function OrganizationRowsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 p-4 rounded-lg bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div className="min-w-0 flex-1">
            <div className="h-4 w-40 max-w-full bg-neutral-200 rounded mb-2" />
            <div className="h-3 w-28 bg-neutral-100 rounded" />
          </div>
          <div className="h-4 w-4 shrink-0 bg-neutral-100 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function OrganizationList({
  organizations,
  isLoading,
  isLoadingMore,
  onNewOrg,
  onSelectOrg,
  onDeleteOrg,
  onEditOrg,
  onActivateOrg,
  search,
  onSearchChange,
  activeStatus,
  onActiveStatusChange,
  activatingOrgId = null,
}: OrganizationListProps) {
  const { currentUser } = useAuth();
  const canDelete = currentUser?.is_superuser && !!onDeleteOrg;
  const canEdit = currentUser?.is_superuser && !!onEditOrg;
  const canActivate = currentUser?.is_superuser && !!onActivateOrg;
  return (
    <div>
      <div className="sticky top-0 z-10 bg-bg-primary -mx-8 -mt-5 px-8 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
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
        <div className="relative mb-3">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search organizations..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-bg-secondary text-text-primary text-sm placeholder:text-neutral focus:outline-none focus:ring-1 focus:ring-accent-primary focus:bg-bg-primary transition-colors"
          />
        </div>
        <div className="-mx-4">
          <TabNavigation
            tabs={STATUS_TABS}
            activeTab={activeStatus}
            onTabChange={(id) => onActiveStatusChange(id as ActiveStatus)}
          />
        </div>
      </div>

      <div className="space-y-2 mt-3">
        {isLoading && organizations.length === 0 ? (
          <OrganizationRowsSkeleton />
        ) : organizations.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">
            {search.trim()
              ? `No ${activeStatus} organizations match "${search.trim()}"`
              : activeStatus === "inactive"
                ? "No inactive organizations"
                : "No organizations yet"}
          </div>
        ) : (
          organizations.map((org) => (
            <div
              key={org.id}
              className="group w-full flex items-center justify-between gap-3 p-4 rounded-lg bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-shadow"
            >
              <button
                type="button"
                onClick={() => onSelectOrg(org)}
                className="flex-1 min-w-0 text-left cursor-pointer"
              >
                <p className="text-sm font-medium text-text-primary truncate">
                  {org.name}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Created {formatRelativeTime(org.inserted_at)}
                </p>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {canActivate && !org.is_active && (
                  <button
                    type="button"
                    onClick={() => onActivateOrg!(org)}
                    disabled={activatingOrgId === org.id}
                    className="px-2.5 py-1 rounded-md border border-status-success-border text-status-success-text bg-status-success-bg/40 hover:bg-status-success-bg hover:border-status-success-text text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label={`Activate ${org.name}`}
                    title="Activate organization"
                  >
                    {activatingOrgId === org.id ? "Activating…" : "Activate"}
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEditOrg!(org)}
                    className="p-1.5 rounded-md text-text-secondary hover:bg-neutral-100 hover:text-text-primary transition-colors cursor-pointer"
                    aria-label={`Edit ${org.name}`}
                    title="Edit organization"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDeleteOrg!(org)}
                    className="p-1.5 rounded-md border border-status-error-border text-status-error-text bg-status-error-bg/40 hover:bg-status-error-bg hover:border-status-error-text transition-colors cursor-pointer"
                    aria-label={`Delete ${org.name}`}
                    title="Delete organization"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectOrg(org)}
                  aria-label={`Open ${org.name}`}
                  className="p-1 rounded-md text-text-secondary cursor-pointer"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isLoadingMore && (
        <div className="text-center py-4 text-text-secondary">
          <Loader message="Loading more..." size="sm" />
        </div>
      )}
    </div>
  );
}
