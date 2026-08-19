"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useToast } from "@/app/hooks/useToast";
import {
  extractTemplateTokens,
  isLikelyUrl,
  stripTokenFromTemplate,
  suggestFieldTypeFromSample,
} from "@/app/lib/utils/assessmentTemplate";
import type {
  ColumnMapping,
  DerivedField,
  SampleRow,
  ValueSetter,
} from "@/app/lib/types/assessment";
import type { AssessmentColumnType } from "@/app/lib/types/configs";

interface UseDerivedFieldsParams {
  columnMapping: ColumnMapping;
  setColumnMapping: ValueSetter<ColumnMapping>;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  sampleRow: SampleRow;
}

function fieldWarning(
  sample: string | undefined,
  isText: boolean,
): string | undefined {
  if (isText) {
    if (suggestFieldTypeFromSample(sample))
      return "Looks like a file link — check the type.";
    if (isLikelyUrl(sample)) return "Looks like a link — check the type.";
    return undefined;
  }
  if (sample !== undefined && !isLikelyUrl(sample))
    return "The sample value is not a link — attachments must be public URLs.";
  return undefined;
}

// Derives the config's input fields from the Submission template's {tokens}
// and the attachment list, so the user never authors an input schema directly.
export function useDerivedFields({
  columnMapping,
  setColumnMapping,
  promptTemplate,
  setPromptTemplate,
  sampleRow,
}: UseDerivedFieldsParams) {
  const toast = useToast();

  const templateTokens = useMemo(
    () => extractTemplateTokens(promptTemplate),
    [promptTemplate],
  );

  // Every new {token} becomes a field automatically. Columns whose sample cell
  // clearly holds an image/pdf link become attachments (their token is removed
  // — the backend never substitutes attachment columns into text).
  useEffect(() => {
    const known = new Set([
      ...columnMapping.textColumns,
      ...columnMapping.attachments.map((a) => a.column),
    ]);
    const newTokens = templateTokens.filter((token) => !known.has(token));
    if (newTokens.length === 0) return;

    const textAdds: string[] = [];
    const attachmentAdds: Array<{ column: string; type: "image" | "pdf" }> = [];
    for (const token of newTokens) {
      const suggested = suggestFieldTypeFromSample(sampleRow[token]);
      if (suggested) attachmentAdds.push({ column: token, type: suggested });
      else textAdds.push(token);
    }

    setColumnMapping({
      ...columnMapping,
      textColumns: [...columnMapping.textColumns, ...textAdds],
      attachments: [
        ...columnMapping.attachments,
        ...attachmentAdds.map((a) => ({
          column: a.column,
          type: a.type,
          format: "url" as const,
        })),
      ],
    });
    if (attachmentAdds.length > 0) {
      let nextTemplate = promptTemplate;
      for (const add of attachmentAdds) {
        nextTemplate = stripTokenFromTemplate(nextTemplate, add.column);
      }
      setPromptTemplate(nextTemplate);
      toast.info(
        `${attachmentAdds.map((a) => a.column).join(", ")} will be attached automatically (file link).`,
      );
    }
    // Re-runs when the mapping changes too (two editors share it — Assessment
    // and Pre-filter Submission zones); the newTokens guard prevents loops.
  }, [templateTokens, columnMapping]);

  const fields: DerivedField[] = useMemo(() => {
    const referenced = new Set(templateTokens);
    const textFields = columnMapping.textColumns.map(
      (name): DerivedField => ({
        name,
        type: "text",
        referenced: referenced.has(name),
        warning: fieldWarning(sampleRow[name], true),
      }),
    );
    const attachmentFields = columnMapping.attachments.map(
      (attachment): DerivedField => ({
        name: attachment.column,
        type: attachment.type === "pdf" ? "pdf" : "image",
        referenced: true,
        warning: fieldWarning(sampleRow[attachment.column], false),
      }),
    );
    return [...textFields, ...attachmentFields];
  }, [columnMapping, sampleRow, templateTokens]);

  const setFieldType = useCallback(
    (name: string, type: AssessmentColumnType) => {
      const isText = columnMapping.textColumns.includes(name);
      if (type === "text") {
        if (isText) return;
        setColumnMapping({
          ...columnMapping,
          textColumns: [...columnMapping.textColumns, name],
          attachments: columnMapping.attachments.filter(
            (a) => a.column !== name,
          ),
        });
        return;
      }
      setColumnMapping({
        ...columnMapping,
        textColumns: columnMapping.textColumns.filter((col) => col !== name),
        attachments: [
          ...columnMapping.attachments.filter((a) => a.column !== name),
          { column: name, type, format: "url" as const },
        ],
      });
      if (isText && promptTemplate.includes(`{${name}}`)) {
        setPromptTemplate(stripTokenFromTemplate(promptTemplate, name));
        toast.info(
          `${name} is now attached automatically — removed its tag from the text.`,
        );
      }
    },
    [columnMapping, promptTemplate, setColumnMapping, setPromptTemplate, toast],
  );

  const addField = useCallback(
    (name: string, type: AssessmentColumnType) => {
      const exists =
        columnMapping.textColumns.includes(name) ||
        columnMapping.attachments.some((a) => a.column === name);
      if (exists) {
        toast.error(`Field "${name}" already exists`);
        return;
      }
      if (type === "text") {
        setColumnMapping({
          ...columnMapping,
          textColumns: [...columnMapping.textColumns, name],
        });
      } else {
        setColumnMapping({
          ...columnMapping,
          attachments: [
            ...columnMapping.attachments,
            { column: name, type, format: "url" as const },
          ],
        });
      }
    },
    [columnMapping, setColumnMapping, toast],
  );

  const removeField = useCallback(
    (name: string) => {
      setColumnMapping({
        ...columnMapping,
        textColumns: columnMapping.textColumns.filter((col) => col !== name),
        attachments: columnMapping.attachments.filter((a) => a.column !== name),
        strictColumns: (columnMapping.strictColumns ?? []).filter(
          (col) => col !== name,
        ),
      });
      if (promptTemplate.includes(`{${name}}`)) {
        setPromptTemplate(stripTokenFromTemplate(promptTemplate, name));
      }
    },
    [columnMapping, promptTemplate, setColumnMapping, setPromptTemplate],
  );

  const onPickAttachment = useCallback(
    (column: string) => {
      toast.info(`${column} is attached automatically with every submission.`);
    },
    [toast],
  );

  const onCreateField = useCallback(
    (column: string) => {
      // The inserted {token} makes the sync effect register it as a text field.
      toast.success(
        `Field "${column}" added — set its type in the Fields card.`,
      );
    },
    [toast],
  );

  return {
    templateTokens,
    fields,
    setFieldType,
    addField,
    removeField,
    onPickAttachment,
    onCreateField,
  };
}
