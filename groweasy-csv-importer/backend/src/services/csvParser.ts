import { parse } from "csv-parse/sync";
import { RawCsvRow } from "../types/crm";

export class CsvParseError extends Error {}

/**
 * Parses raw CSV text into an array of row objects, keyed by header name.
 * Column names are NOT assumed — whatever headers the file has are used as-is.
 * The AI mapping layer is responsible for interpreting them.
 */
export function parseCsv(csvText: string): RawCsvRow[] {
  if (!csvText || !csvText.trim()) {
    throw new CsvParseError("The uploaded file is empty.");
  }

  let records: RawCsvRow[];
  try {
    records = parse(csvText, {
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
  } catch (err) {
    throw new CsvParseError(
      `Could not parse CSV: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  if (records.length === 0) {
    throw new CsvParseError("The CSV has headers but no data rows.");
  }

  return records;
}
