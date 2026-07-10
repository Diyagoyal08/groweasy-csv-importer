import { parse } from "csv-parse/sync";
import { RawCsvRow } from "../types/crm";

export class CsvParseError extends Error {}

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
      relax_quotes: true,
    });
  } catch (err) {
    throw new CsvParseError(`Could not parse CSV: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  if (records.length === 0) {
    throw new CsvParseError("The CSV has headers but no data rows.");
  }

  const normalizedRows = records.map((record) =>
    Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, typeof value === "string" ? value.trim() : String(value ?? "")])
    )
  );

  return normalizedRows;
}
