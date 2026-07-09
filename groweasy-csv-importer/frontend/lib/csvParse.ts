import Papa from "papaparse";
import { RawCsvRow } from "@/types/crm";

export interface ParsedCsv {
  headers: string[];
  rows: RawCsvRow[];
}

/**
 * Parses a CSV file entirely in the browser for the preview step.
 * Per the spec, no network/AI call should happen until the user confirms —
 * so preview parsing stays client-side.
 */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.errors?.length) {
          const fatal = results.errors.find((e) => e.type === "Delimiter" || e.row === undefined);
          if (fatal) {
            reject(new Error(fatal.message));
            return;
          }
        }
        const rows = results.data.filter((row) => Object.values(row).some((v) => (v ?? "").toString().trim() !== ""));
        if (rows.length === 0) {
          reject(new Error("No data rows found in this CSV."));
          return;
        }
        resolve({ headers: results.meta.fields ?? [], rows });
      },
      error: (err) => reject(err),
    });
  });
}
