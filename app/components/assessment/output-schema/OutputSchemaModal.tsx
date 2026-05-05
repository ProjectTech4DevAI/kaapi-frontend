"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Modal } from "@/app/components";
import { CloseIcon } from "@/app/components/icons";
import type { SchemaProperty, ValueSetter } from "@/app/lib/types/assessment";
import { createProperty } from "@/app/lib/utils/outputSchema";
import OutputSchemaEditorInner from "./OutputSchemaEditorInner";

interface OutputSchemaModalProps {
  open: boolean;
  onClose: () => void;
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
}

export default function OutputSchemaModal({
  open,
  onClose,
  schema,
  setSchema,
}: OutputSchemaModalProps) {
  const [draftSchema, setDraftSchema] = useState<SchemaProperty[]>([]);
  const [mounted, setMounted] = useState(false);
  const schemaRef = useRef(schema);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);
  useEffect(() => {
    if (open) {
      setDraftSchema(
        JSON.parse(JSON.stringify(schemaRef.current)) as SchemaProperty[],
      );
    }
  }, [open]);

  if (!open || !mounted) return null;

  const handleSave = () => {
    setSchema(draftSchema);
    onClose();
  };
  const handleReset = () => {
    setDraftSchema([createProperty()]);
  };

  return createPortal(
    <Modal
      open
      onClose={onClose}
      maxWidth="!w-[760px] !max-w-[calc(100vw-2rem)]"
      maxHeight="max-h-[85vh]"
      showClose={false}
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h2 className="text-lg font-semibold text-text-primary">
          Response format
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          aria-label="Close response format"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <p className="px-6 text-sm text-text-secondary">
        Define the structure of the AI response. Use the visual editor or switch
        to JSON.
      </p>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <OutputSchemaEditorInner
          schema={draftSchema}
          setSchema={setDraftSchema}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button type="button" onClick={handleSave}>
          Save
        </Button>
      </div>
    </Modal>,
    document.body,
  );
}
