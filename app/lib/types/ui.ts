export interface SelectOption {
  value: string;
  label: string;
  /**
   * Optional group label. When any option in a `<Select>` declares a group,
   * the select renders `<optgroup>` blocks. Options without a group fall
   * into an untitled top-level bucket.
   */
  group?: string;
}
