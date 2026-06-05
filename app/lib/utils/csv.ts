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
 * Parse a CSV file into headers + rows. First non-empty line is treated as the header row.
 **/
export const parseCsv = (text: string): ParsedCsv => {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const headers = lines.length > 0 ? parseCsvRow(lines[0]) : [];
  const rows = lines.slice(1).map(parseCsvRow);
  return { headers, rows };
};
