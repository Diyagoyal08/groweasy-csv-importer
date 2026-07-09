import { ExtractionResult, RawCsvRow } from "@/types/crm";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export class ApiError extends Error {}

export async function extractCrmRecords(rows: RawCsvRow[]): Promise<ExtractionResult> {
  const res = await fetch(`${API_BASE}/api/csv/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `AI extraction failed (status ${res.status}).`);
  }
  return res.json();
}
