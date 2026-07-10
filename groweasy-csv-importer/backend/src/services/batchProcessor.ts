import {
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  CrmRecord,
  ExtractionResult,
  RawCsvRow,
  SkippedRecord,
} from "../types/crm";
import { extractBatch } from "./aiExtractor";

const BATCH_SIZE = Math.max(1, Number(process.env.AI_BATCH_SIZE || 25));
const MAX_RETRIES = Math.max(0, Number(process.env.AI_MAX_RETRIES || 3));

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function splitList(value: unknown): string[] {
  const text = toStringValue(value);
  if (!text) return [];
  return text
    .split(/[|,;\/\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeCreatedAt(value: unknown): string {
  const text = toStringValue(value);
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizeEnumValue<T extends string>(value: unknown, allowed: readonly T[], synonyms: Record<string, string>): T | "" {
  const normalized = toStringValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) return "";

  const directMatch = synonyms[normalized];
  if (directMatch) return directMatch as T;

  return (allowed.find((option) => option.toLowerCase() === normalized) ?? "") as T | "";
}

function normalizeStatus(value: unknown): CrmRecord["crm_status"] {
  const synonyms: Record<string, string> = {
    good_lead_follow_up: "GOOD_LEAD_FOLLOW_UP",
    good_lead: "GOOD_LEAD_FOLLOW_UP",
    follow_up: "GOOD_LEAD_FOLLOW_UP",
    did_not_connect: "DID_NOT_CONNECT",
    did_not_connects: "DID_NOT_CONNECT",
    bad_lead: "BAD_LEAD",
    sale_done: "SALE_DONE",
  };
  return normalizeEnumValue(value, CRM_STATUS_VALUES, synonyms);
}

function normalizeSource(value: unknown): CrmRecord["data_source"] {
  const synonyms: Record<string, string> = {
    leads_on_demand: "leads_on_demand",
    leads_on_demand_leads: "leads_on_demand",
    meridian_tower: "meridian_tower",
    meridian: "meridian_tower",
    eden_park: "eden_park",
    eden: "eden_park",
    varah_swamy: "varah_swamy",
    varah: "varah_swamy",
    sarjapur_plots: "sarjapur_plots",
    sarjapur: "sarjapur_plots",
  };
  return normalizeEnumValue(value, DATA_SOURCE_VALUES, synonyms);
}

function normalizePhone(value: unknown): { countryCode: string; mobile: string } {
  const candidates = splitList(value);
  const first = candidates[0] ?? "";
  if (!first) return { countryCode: "", mobile: "" };

  const digitsOnly = first.replace(/\D/g, "");
  if (!digitsOnly) return { countryCode: "", mobile: "" };

  const explicitCountryCode = first.match(/(\+\d{1,3})/);
  if (explicitCountryCode) {
    const prefix = explicitCountryCode[1].replace(/\D/g, "");
    const remainder = digitsOnly.slice(prefix.length);
    if (remainder.length >= 7) {
      return { countryCode: `+${prefix}`, mobile: remainder.replace(/^0+/, "") };
    }
  }

  if (digitsOnly.length > 10) {
    const potentialCountryCode = digitsOnly.slice(0, digitsOnly.length - 10);
    const remainder = digitsOnly.slice(digitsOnly.length - 10);
    if (potentialCountryCode.length <= 3 && remainder.length === 10) {
      return { countryCode: `+${potentialCountryCode}`, mobile: remainder.replace(/^0+/, "") };
    }
  }

  return { countryCode: "", mobile: digitsOnly.slice(-10).replace(/^0+/, "") };
}

function appendNote(existingNote: string, ...parts: string[]): string {
  return [existingNote, ...parts].filter(Boolean).join(" | ");
}

/** Defense-in-depth: even if the model drifts, enforce the allowed enums server-side. */
export function sanitizeRecord(raw: Record<string, unknown>): CrmRecord {
  const emailCandidates = splitList(raw.email);
  const phoneCandidates = splitList(raw.mobile_without_country_code);
  const primaryEmail = emailCandidates[0] ?? "";
  const extraEmails = emailCandidates.slice(1);
  const primaryPhone = phoneCandidates[0] ?? "";
  const extraPhones = phoneCandidates.slice(1);
  const { countryCode, mobile } = normalizePhone(primaryPhone);

  const noteParts: string[] = [];
  if (extraEmails.length > 0) noteParts.push(`Additional emails: ${extraEmails.join(", ")}`);
  if (extraPhones.length > 0) noteParts.push(`Additional phone numbers: ${extraPhones.join(", ")}`);
  const existingNote = toStringValue(raw.crm_note);
  if (existingNote) noteParts.push(existingNote);

  return {
    created_at: normalizeCreatedAt(raw.created_at),
    name: toStringValue(raw.name),
    email: primaryEmail,
    country_code: countryCode,
    mobile_without_country_code: mobile,
    company: toStringValue(raw.company),
    city: toStringValue(raw.city),
    state: toStringValue(raw.state),
    country: toStringValue(raw.country),
    lead_owner: toStringValue(raw.lead_owner),
    crm_status: normalizeStatus(raw.crm_status),
    crm_note: appendNote("", ...noteParts),
    data_source: normalizeSource(raw.data_source),
    possession_time: toStringValue(raw.possession_time),
    description: toStringValue(raw.description),
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
        const sanitized = sanitizeRecord(raw as Record<string, unknown>);
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
        const delay = 500 * 2 ** attempt + Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

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
