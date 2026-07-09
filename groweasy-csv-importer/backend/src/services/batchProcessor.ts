import {
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  CrmRecord,
  ExtractionResult,
  RawCsvRow,
  SkippedRecord,
} from "../types/crm";
import { extractBatch } from "./aiExtractor";

const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE || 25);
const MAX_RETRIES = Number(process.env.AI_MAX_RETRIES || 2);

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Defense-in-depth: even if the model drifts, enforce the allowed enums server-side. */
function sanitizeRecord(raw: any): CrmRecord {
  const status = CRM_STATUS_VALUES.includes(raw.crm_status) ? raw.crm_status : "";
  const source = DATA_SOURCE_VALUES.includes(raw.data_source) ? raw.data_source : "";

  return {
    created_at: String(raw.created_at ?? ""),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    country_code: String(raw.country_code ?? ""),
    mobile_without_country_code: String(raw.mobile_without_country_code ?? ""),
    company: String(raw.company ?? ""),
    city: String(raw.city ?? ""),
    state: String(raw.state ?? ""),
    country: String(raw.country ?? ""),
    lead_owner: String(raw.lead_owner ?? ""),
    crm_status: status,
    crm_note: String(raw.crm_note ?? ""),
    data_source: source,
    possession_time: String(raw.possession_time ?? ""),
    description: String(raw.description ?? ""),
  };
}

function hasContactInfo(record: CrmRecord): boolean {
  return Boolean(record.email.trim()) || Boolean(record.mobile_without_country_code.trim());
}

async function processBatchWithRetry(
  rows: RawCsvRow[],
  batchIndex: number,
  totalBatches: number
): Promise<{ records: CrmRecord[]; skipped: SkippedRecord[] }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await extractBatch(rows, batchIndex, totalBatches);
      const records: CrmRecord[] = [];
      const skipped: SkippedRecord[] = [...(result.skipped || [])];

      for (const raw of result.records || []) {
        const sanitized = sanitizeRecord(raw);
        if (hasContactInfo(sanitized)) {
          records.push(sanitized);
        } else {
          skipped.push({ originalRow: raw as RawCsvRow, reason: "No email or mobile number after AI extraction." });
        }
      }
      return { records, skipped };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  // All retries exhausted: mark every row in this batch as skipped rather than failing the whole request.
  const reason = `AI extraction failed after ${MAX_RETRIES + 1} attempts: ${
    lastError instanceof Error ? lastError.message : "unknown error"
  }`;
  return {
    records: [],
    skipped: rows.map((row) => ({ originalRow: row, reason })),
  };
}

/**
 * Splits rows into batches, sends each to the AI provider (with retry),
 * and merges the results into a single ExtractionResult.
 */
export async function processRowsWithAi(rows: RawCsvRow[]): Promise<ExtractionResult> {
  const batches = chunk(rows, BATCH_SIZE);
  const imported: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  // Batches run sequentially to stay well within provider rate limits;
  // swap to Promise.all with a concurrency limiter if higher throughput is needed.
  for (let i = 0; i < batches.length; i++) {
    const { records, skipped: batchSkipped } = await processBatchWithRetry(batches[i], i, batches.length);
    imported.push(...records);
    skipped.push(...batchSkipped);
  }

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
  };
}
