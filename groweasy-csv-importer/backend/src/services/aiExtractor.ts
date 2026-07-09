import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { RawCsvRow, SkippedRecord } from "../types/crm";
import { SYSTEM_PROMPT, buildUserPrompt, RESPONSE_JSON_SCHEMA } from "./promptBuilder";

export interface BatchAiResult {
  // Raw, unvalidated shape returned by the model — sanitized/typed downstream in batchProcessor.
  records: Record<string, unknown>[];
  skipped: SkippedRecord[];
}

export class AiExtractionError extends Error {}

const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

/** Strips accidental markdown fences some models add despite instructions. */
function cleanJson(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

async function callGemini(rows: RawCsvRow[], batchIndex: number, totalBatches: number): Promise<BatchAiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiExtractionError("GEMINI_API_KEY is not set.");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    contents: buildUserPrompt(rows, batchIndex, totalBatches),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_JSON_SCHEMA as any,
      temperature: 0.1,
    },
  });

  const text = response.text ?? "";
  const parsed = JSON.parse(cleanJson(text));
  return { records: parsed.records ?? [], skipped: parsed.skipped ?? [] };
}

async function callOpenAi(rows: RawCsvRow[], batchIndex: number, totalBatches: number): Promise<BatchAiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiExtractionError("OPENAI_API_KEY is not set.");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(rows, batchIndex, totalBatches) },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(cleanJson(text));
  return { records: parsed.records ?? [], skipped: parsed.skipped ?? [] };
}

/**
 * Sends one batch of raw rows to the configured AI provider and returns
 * normalized CRM records + skipped rows. Provider is chosen via AI_PROVIDER env var.
 */
export async function extractBatch(
  rows: RawCsvRow[],
  batchIndex: number,
  totalBatches: number
): Promise<BatchAiResult> {
  if (AI_PROVIDER === "openai") {
    return callOpenAi(rows, batchIndex, totalBatches);
  }
  return callGemini(rows, batchIndex, totalBatches);
}
