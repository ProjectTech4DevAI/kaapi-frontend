import { useRouter } from "next/navigation";
import { PageHeader, VersionPill } from "@/app/components";
import { ChevronRightIcon, CheckCircleIcon } from "@/app/components/icons";

interface HeaderProps {
  currentConfigId?: string;
  currentConfigVersion?: number;
  currentConfigName?: string;
  hasUnsavedChanges?: boolean;
  datasetId?: string;
  experimentName?: string;
  fromEvaluations?: boolean;
}

export default function Header({
  currentConfigVersion,
  currentConfigName,
  hasUnsavedChanges = false,
  datasetId,
  fromEvaluations = false,
}: HeaderProps) {
  const router = useRouter();

  return (
    <PageHeader>
      <nav className="flex items-center gap-2 text-sm min-w-0 flex-1">
        <button
          onClick={() => router.push("/configurations")}
          className="font-medium transition-colors text-text-secondary hover:text-text-primary shrink-0 cursor-pointer"
        >
          Configurations
        </button>
        <ChevronRightIcon className="w-4 h-4 text-text-secondary shrink-0" />
        <span
          className="font-semibold text-text-primary truncate min-w-0 max-w-xs sm:max-w-sm md:max-w-md"
          title={currentConfigName || "New Config"}
        >
          {currentConfigName || "New Config"}
        </span>
        {currentConfigVersion ? (
          <VersionPill version={currentConfigVersion} className="shrink-0" />
        ) : null}
      </nav>

      <div className="flex items-center gap-2 ml-2 shrink-0">
        {hasUnsavedChanges && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-status-warning-bg text-status-warning-text border border-status-warning-border">
            Unsaved
          </span>
        )}
        {fromEvaluations && datasetId && (
          <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-status-success-bg text-status-success-text border border-status-success-border">
            <CheckCircleIcon />
            Dataset ready
          </span>
        )}
      </div>
    </PageHeader>
  );
}
