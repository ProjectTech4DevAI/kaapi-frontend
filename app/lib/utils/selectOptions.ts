import { SelectOption } from "@/app/lib/types/ui";

export function toSelectOptions<T extends string>(
  items: { value: T; label: string }[],
): SelectOption[] {
  return items.map((i) => ({ value: i.value, label: i.label }));
}
