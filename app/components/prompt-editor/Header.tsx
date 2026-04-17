import { useRouter } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
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
      <nav className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push("/configurations")}
          className="font-medium transition-colors text-text-secondary hover:text-text-primary"
        >
          Configurations
        </button>
        <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
        <span className="font-semibold text-text-primary">
          {currentConfigName || "New Config"}
        </span>
        {currentConfigVersion && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary">
            v{currentConfigVersion}
          </span>
        )}
      </nav>

      <div className="flex items-center gap-2 ml-2">
        {hasUnsavedChanges && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#b45309] border border-[#fcd34d]">
            Unsaved
          </span>
        )}
        {fromEvaluations && datasetId && (
          <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-[#f0fdf4] text-status-success border border-[#86efac]">
            <CheckCircleIcon />
            Dataset ready
          </span>
        )}
      </div>
    </PageHeader>
  );
}
