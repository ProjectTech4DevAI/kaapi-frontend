"use client";

import { ChevronRightIcon } from "@/app/components/icons";
import type {
  ColumnMapping,
  ConfigSelection,
  JsonSchemaValue,
} from "@/app/lib/types/assessment";

interface PayloadReviewProps {
  experimentName: string;
  datasetId: string;
  systemInstruction: string;
  promptTemplate: string;
  columnMapping: ColumnMapping;
  outputSchemaJson: JsonSchemaValue;
  configs: ConfigSelection[];
}

export default function PayloadReview({
  experimentName,
  datasetId,
  systemInstruction,
  promptTemplate,
  columnMapping,
  outputSchemaJson,
  configs,
}: PayloadReviewProps) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center gap-1.5 py-1 text-xs font-medium text-neutral-500">
        <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        View request payload
      </summary>
      <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-neutral-50 p-3 font-mono text-xs whitespace-pre-wrap text-neutral-900">
        {JSON.stringify(
          {
            experiment_name: experimentName,
            dataset_id: datasetId,
            prompt_template: promptTemplate || null,
            system_instruction: systemInstruction.trim() || null,
            text_columns: columnMapping.textColumns,
            attachments: columnMapping.attachments.map(
              ({ column, type, format }) => ({ column, type, format }),
            ),
            output_schema: outputSchemaJson,
            configs: configs.map(({ config_id, config_version }) => ({
              config_id,
              config_version,
            })),
          },
          null,
          2,
        )}
      </pre>
    </details>
  );
}
