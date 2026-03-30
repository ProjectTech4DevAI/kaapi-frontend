import { RefObject } from "react";
import { Organization } from "@/app/lib/types/onboarding";
import { formatRelativeTime } from "@/app/lib/utils";
import { Button } from "@/app/components";
import { useAuth } from "@/app/lib/context/AuthContext";
import { ChevronRightIcon, RefreshIcon } from "@/app/components/icons";

interface OrganizationListProps {
  organizations: Organization[];
  isLoadingMore: boolean;
  onNewOrg: () => void;
  onSelectOrg: (org: Organization) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export default function OrganizationList({
  organizations,
  isLoadingMore,
  onNewOrg,
  onSelectOrg,
  scrollRef,
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
          <Button onClick={onNewOrg}>+ New Organization</Button>
        )}
      </div>

      <div ref={scrollRef} className="space-y-2">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => onSelectOrg(org)}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-white text-left transition-colors hover:bg-neutral-50"
          >
            <div>
              <p className="text-sm font-medium text-text-primary">
                {org.name}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Created {formatRelativeTime(org.inserted_at)}
              </p>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
          </button>
        ))}
      </div>

      {isLoadingMore && (
        <div className="text-center py-4 text-text-secondary">
          <RefreshIcon className="w-5 h-5 mx-auto animate-spin" />
          <p className="text-xs mt-1">Loading more...</p>
        </div>
      )}
    </div>
  );
}
