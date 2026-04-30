"use client";

type AssessmentTabId = "datasets" | "config" | "results";
type IndicatorState = "none" | "processing";

interface AssessmentTab {
  id: AssessmentTabId;
  label: string;
}

interface TabNavigationProps {
  activeTab: AssessmentTabId;
  evalIndicator: IndicatorState;
  tabs: AssessmentTab[];
  onTabSwitch: (tab: AssessmentTabId) => void;
}

const INDICATOR_CLASSES: Record<
  IndicatorState,
  { dot: string; underline: string }
> = {
  none: {
    dot: "assessment-indicator-dot-none",
    underline: "assessment-indicator-underline-none",
  },
  processing: {
    dot: "assessment-indicator-dot-processing",
    underline: "assessment-indicator-underline-processing",
  },
};

function ShimmerDot({ dotClassName }: { dotClassName: string }) {
  return (
    <span className="relative ml-1.5 inline-flex h-1.5 w-1.5">
      <span
        className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${dotClassName}`}
      />
      <span
        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotClassName}`}
      />
    </span>
  );
}

export default function TabNavigation({
  activeTab,
  evalIndicator,
  tabs,
  onTabSwitch,
}: TabNavigationProps) {
  return (
    <div className="flex shrink-0 items-center border-b border-neutral-200 bg-white pr-4">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showIndicator =
            tab.id === "results" && evalIndicator !== "none";

          return (
            <button
              key={tab.id}
              onClick={() => onTabSwitch(tab.id)}
              className={`relative flex cursor-pointer items-center px-5 py-3 text-sm font-medium transition-colors ${
                isActive ? "text-neutral-900" : "text-neutral-500"
              }`}
            >
              {tab.label}
              {showIndicator && (
                <ShimmerDot
                  dotClassName={INDICATOR_CLASSES[evalIndicator].dot}
                />
              )}
              {isActive && (
                <div
                  className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                    showIndicator
                      ? INDICATOR_CLASSES[evalIndicator].underline
                      : "bg-neutral-900"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
