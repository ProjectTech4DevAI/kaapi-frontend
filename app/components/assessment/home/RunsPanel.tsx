"use client";

import { Button, Select } from "@/app/components/ui";
import { PlusIcon } from "@/app/components/icons";
import RunRow from "./RunRow";
import HomePanel from "./HomePanel";
import type { RunsPanelProps } from "@/app/lib/types/assessment";

export default function RunsPanel({ home, onNewRun }: RunsPanelProps) {
  const { runSlice, selection } = home;
  const assessorName = selection
    ? home.assessors.find((item) => item.id === selection.configId)?.name
    : null;

  return (
    <HomePanel
      title="Runs"
      className="min-h-0 flex-1 bg-bg-secondary"
      countLabel={`${runSlice.total} run${runSlice.total === 1 ? "" : "s"}`}
      page={runSlice.page}
      pages={runSlice.pages}
      onGoto={home.gotoRunPage}
      headerActions={
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <Select
            aria-label="Filter runs"
            value={home.runFilter}
            options={home.runFilterOptions}
            onChange={(event) => home.setRunFilter(event.target.value)}
            className="max-w-[220px] text-[13px]"
          />
          <Button
            size="sm"
            className="shrink-0"
            disabled={!selection}
            onClick={onNewRun}
            title={
              selection
                ? `Run ${assessorName ?? "this assessor"} v${selection.version} on a submission set`
                : "Select an assessor version on the left to start a run"
            }
          >
            <PlusIcon className="w-3.5 h-3.5" />
            New run
          </Button>
        </div>
      }
    >
      {runSlice.items.map((row) => (
        <RunRow
          key={row.assessment.assessment_id}
          row={row}
          isExporting={home.exportingId === row.assessment.assessment_id}
          onExport={home.exportRun}
        />
      ))}

      {runSlice.items.length === 0 && (
        <p
          role="status"
          className="py-12 text-center text-[13px] text-text-secondary"
        >
          {selection
            ? "No runs yet for this version — start one with New run."
            : "No runs for this filter. Select an assessor version on the left to start one."}
        </p>
      )}
    </HomePanel>
  );
}
