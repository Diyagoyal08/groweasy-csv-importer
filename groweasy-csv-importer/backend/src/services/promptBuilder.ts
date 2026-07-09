import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES, RawCsvRow } from "../types/crm";

/**
 * Builds the system + user prompt sent to the LLM for a single batch of rows.
 * This is the core "prompt engineering" piece the assignment grades on.
 */
export const SYSTEM_PROMPT = `You are a data-mapping engine for GrowEasy CRM. You receive raw rows from arbitrary CSV exports (Facebook Lead Ads, Google Ads, real-estate CRMs, manually made spreadsheets, etc.) and must map them into GrowEasy's fixed CRM schema.

You never see the same column names twice. Column names may be abbreviated, differently-cased, in a different language, or absent altogether. Infer meaning from header text AND from the values themselves (e.g. a column of values like "+91 98765 43210" is a phone number regardless of its header).

TARGET SCHEMA (return exactly these keys for every kept record):
- created_at: string, must be parseable by JavaScript's "new Date(value)". If the source date is ambiguous or missing, use "" (empty string). Never invent a date.
- name: full name of the lead. Combine first/last name columns if split.
- email: the PRIMARY email address only.
- country_code: phone country code, formatted like "+91". Infer from context (e.g. Indian phone formats, "IN" locale) if not explicit; otherwise "".
- mobile_without_country_code: the primary phone number, digits only, without the country code.
- company: company / organization name.
- city, state, country: location fields, each separate. Leave "" if not derivable.
- lead_owner: the salesperson/agent/owner assigned to this lead, often an email or name.
- crm_status: MUST be exactly one of ${CRM_STATUS_VALUES.join(", ")}, or "" if nothing in the row confidently maps to one of these statuses. Do not invent a fifth value.
- crm_note: free text for remarks, follow-up notes, extra comments, EXTRA phone numbers beyond the primary one, EXTRA email addresses beyond the primary one, or any other useful info that doesn't fit elsewhere. Concatenate multiple such pieces of info with " | ".
- data_source: MUST be exactly one of ${DATA_SOURCE_VALUES.join(", ")}, or "" if no confident match exists. Do not guess loosely — only set this if the row clearly references one of these named sources/projects.
- possession_time: property possession timeframe/date if this is real-estate data, else "".
- description: any additional descriptive text not captured above, else "".

RULES:
1. If a row has MULTIPLE emails: keep the first as "email", append the rest into "crm_note".
2. If a row has MULTIPLE phone numbers: keep the first as "mobile_without_country_code" (+ its country_code), append the rest into "crm_note".
3. SKIP a row entirely (do not include it in "records") if it has NEITHER a usable email NOR a usable mobile number. Instead, add it to "skipped" with a short "reason".
4. Never fabricate data. If a field cannot be derived, use "" — do not guess.
5. Preserve values as single-line strings (escape internal newlines as \\n) so each record can safely become one CSV row.
6. Return ONLY valid JSON matching the response schema. No markdown fences, no commentary.`;

export function buildUserPrompt(rows: RawCsvRow[], batchIndex: number, totalBatches: number): string {
  return `Batch ${batchIndex + 1} of ${totalBatches}. Map the following ${rows.length} raw CSV rows into the GrowEasy CRM schema described in the system prompt.

RAW ROWS (JSON array, each object's keys are the original CSV headers for this file):
${JSON.stringify(rows, null, 2)}

Respond with a JSON object of the shape:
{
  "records": [ { ...crm fields... }, ... ],
  "skipped": [ { "originalRow": { ...the raw row as given... }, "reason": "short reason" }, ... ]
}`;
}

export const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    records: {
      type: "array",
      items: {
        type: "object",
        properties: {
          created_at: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          country_code: { type: "string" },
          mobile_without_country_code: { type: "string" },
          company: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          country: { type: "string" },
          lead_owner: { type: "string" },
          crm_status: { type: "string" },
          crm_note: { type: "string" },
          data_source: { type: "string" },
          possession_time: { type: "string" },
          description: { type: "string" },
        },
        required: ["email", "mobile_without_country_code"],
      },
    },
    skipped: {
      type: "array",
      items: {
        type: "object",
        properties: {
          originalRow: { type: "object" },
          reason: { type: "string" },
        },
      },
    },
  },
  required: ["records", "skipped"],
} as const;
