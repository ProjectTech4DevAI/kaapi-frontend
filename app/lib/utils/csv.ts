import { ParsedCsv } from "@/app/lib/types/document";

/**
 * Parse a single CSV line. Handles quoted fields and escaped quotes ("")
 **/
export const parseCsvRow = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (line[i] === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
};

/**
 * Split CSV text into records, preserving newlines inside quoted fields.
 */
export const splitCsvRecords = (text: string): string[] => {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      if (current.trim().length > 0) records.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) records.push(current);
  return records;
};

/**
 * Parse a CSV file into headers + rows. First non-empty record is treated as
 * the header row. Multi-line quoted cells are preserved as a single field.
 */
export const parseCsv = (text: string): ParsedCsv => {
  const records = splitCsvRecords(text);
  const headers = records.length > 0 ? parseCsvRow(records[0]) : [];
  const rows = records.slice(1).map(parseCsvRow);
  return { headers, rows };
};
