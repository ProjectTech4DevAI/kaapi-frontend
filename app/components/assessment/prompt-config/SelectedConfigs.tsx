import { CloseIcon } from "@/app/components/icons";
import type { SelectedConfigsProps } from "@/app/lib/types/assessment";

export default function SelectedConfigs({
  configs,
  onRemove,
}: SelectedConfigsProps) {
  if (configs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {configs.map((config) => (
        <div
          key={`${config.config_id}-${config.config_version}`}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent-primary bg-accent-subtle/20 px-2 py-1"
        >
          <span
            className="max-w-[100px] truncate text-[12px] font-semibold text-accent-primary"
            title={config.name}
          >
            {config.name}
          </span>
          <span
            className="max-w-[96px] truncate text-[10px] text-text-secondary"
            title={`v${config.config_version} ${
              config.provider && config.model
                ? `· ${config.provider}/${config.model}`
                : ""
            }`}
          >
            v{config.config_version}{" "}
            {config.provider && config.model
              ? `· ${config.provider}/${config.model}`
              : ""}
          </span>
          <button
            type="button"
            onClick={() => onRemove(config.config_id, config.config_version)}
            className="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            aria-label={`Remove ${config.name}`}
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
