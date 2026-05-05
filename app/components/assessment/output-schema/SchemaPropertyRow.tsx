"use client";

import { Button } from "@/app/components";
import Select from "@/app/components/Select";
import { CloseIcon, TrashIcon } from "@/app/components/icons";
import { SCHEMA_TYPE_OPTIONS } from "@/app/lib/assessment/constants";
import type {
  SchemaProperty,
  SchemaPropertyType,
  ValueSetter,
} from "@/app/lib/types/assessment";
import CompactToggleSwitch from "../CompactToggleSwitch";

interface SchemaPropertyRowProps {
  property: SchemaProperty;
  depth: number;
  onUpdate: (
    id: string,
    updater: (property: SchemaProperty) => SchemaProperty,
  ) => void;
  onRemove: ValueSetter<string>;
  onAddChild: ValueSetter<string>;
  onAddEnumValue: ValueSetter<string>;
  onUpdateEnumValue: (id: string, index: number, value: string) => void;
  onRemoveEnumValue: (id: string, index: number) => void;
}

export default function SchemaPropertyRow({
  property,
  depth,
  onUpdate,
  onRemove,
  onAddChild,
  onAddEnumValue,
  onUpdateEnumValue,
  onRemoveEnumValue,
}: SchemaPropertyRowProps) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_196px_56px_56px_36px] items-center gap-3">
        <input
          type="text"
          value={property.name}
          onChange={(e) =>
            onUpdate(property.id, (p) => ({ ...p, name: e.target.value }))
          }
          placeholder="name"
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-bg-primary px-3 text-sm text-text-primary"
        />
        <div className="min-w-0">
          <Select
            value={property.type}
            onChange={(e) => {
              const t = e.target.value as SchemaPropertyType;
              onUpdate(property.id, (p) => ({
                ...p,
                type: t,
                children: t === "object" ? p.children : [],
                enumValues:
                  t === "enum"
                    ? p.enumValues.length > 0
                      ? p.enumValues
                      : [""]
                    : [],
              }));
            }}
            options={SCHEMA_TYPE_OPTIONS}
            className="h-9 w-full cursor-pointer rounded-md border border-border bg-bg-primary px-2.5 py-1.5 text-sm text-text-primary outline-none focus:ring-1"
          />
        </div>
        <CompactToggleSwitch
          checked={property.isArray}
          onChange={() =>
            onUpdate(property.id, (p) => ({ ...p, isArray: !p.isArray }))
          }
          title={property.isArray ? "Remove array wrapper" : "Make array"}
        />
        <CompactToggleSwitch
          checked={property.isRequired}
          onChange={() =>
            onUpdate(property.id, (p) => ({ ...p, isRequired: !p.isRequired }))
          }
          title={property.isRequired ? "Mark optional" : "Mark required"}
        />
        <button
          type="button"
          onClick={() => onRemove(property.id)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center justify-self-center rounded-md text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          aria-label={`Delete ${property.name.trim() || "field"}`}
          title="Delete"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {property.type === "enum" && (
        <div className="ml-3 mt-2 space-y-1.5">
          {property.enumValues.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={val}
                onChange={(e) =>
                  onUpdateEnumValue(property.id, idx, e.target.value)
                }
                placeholder={`value ${idx + 1}`}
                className="h-8 max-w-[240px] rounded-md border border-border bg-bg-primary px-3 text-sm text-text-primary"
              />
              <button
                type="button"
                onClick={() => onRemoveEnumValue(property.id, idx)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                aria-label={`Remove enum value ${idx + 1} from ${property.name.trim() || "field"}`}
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAddEnumValue(property.id)}
            className="mt-0.5 !justify-start !px-0 text-text-primary"
          >
            + Add enum value
          </Button>
        </div>
      )}

      {property.type === "object" && (
        <div className="mt-2 ml-6 space-y-3">
          {property.children.map((child) => (
            <SchemaPropertyRow
              key={child.id}
              property={child}
              depth={depth + 1}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddChild={onAddChild}
              onAddEnumValue={onAddEnumValue}
              onUpdateEnumValue={onUpdateEnumValue}
              onRemoveEnumValue={onRemoveEnumValue}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAddChild(property.id)}
            className="!justify-start !px-0 text-text-primary"
          >
            + Add nested property
          </Button>
        </div>
      )}
    </div>
  );
}
