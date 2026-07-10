import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { RawCsvRow, SkippedRecord } from "../types/crm";
import { SYSTEM_PROMPT, buildUserPrompt, RESPONSE_JSON_SCHEMA } from "./promptBuilder";

export interface BatchAiResult {
  records: Record<string, unknown>[];
  skipped: SkippedRecord[];
}

export class AiExtractionError extends Error {}

const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();
const MAX_ATTEMPTS = Math.max(1, Number(process.env.AI_MAX_RETRIES || 3) + 1);
const INITIAL_BACKOFF_MS = 500;

function cleanJson(text: string): string {
  return text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function isRetryableAiError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  const status = typeof error === "object" && error !== null && "status" in error ? String((error as any).status) : "";
  const combined = `${status} ${message}`.toLowerCase();
  return ["429", "503", "timeout", "timed out", "rate limit", "resource_exhausted", "temporarily unavailable"].some((token) => combined.includes(token));
}

async function waitBeforeRetry(attempt: number): Promise<void> {
  const delay = INITIAL_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * 200);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function callGemini(rows: RawCsvRow[], batchIndex: number, totalBatches: number): Promise<BatchAiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiExtractionError("GEMINI_API_KEY is not set.");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: buildUserPrompt(rows, batchIndex, totalBatches),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_JSON_SCHEMA as any,
          temperature: 0.1,
          topP: 0.1,
        },
      });

      const text = response.text ?? "{}";
      const parsed = JSON.parse(cleanJson(text));
      return { records: parsed.records ?? [], skipped: parsed.skipped ?? [] };
    } catch (error) {
      if (attempt < MAX_ATTEMPTS - 1 && isRetryableAiError(error)) {
        await waitBeforeRetry(attempt);
        continue;
      }
      throw new AiExtractionError(error instanceof Error ? error.message : "Gemini request failed.");
    }
  }

  throw new AiExtractionError("Gemini request failed after all retries.");
}

async function callOpenAi(rows: RawCsvRow[], batchIndex: number, totalBatches: number): Promise<BatchAiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiExtractionError("OPENAI_API_KEY is not set.");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
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
    } catch (error) {
      if (attempt < MAX_ATTEMPTS - 1 && isRetryableAiError(error)) {
        await waitBeforeRetry(attempt);
        continue;
      }
      throw new AiExtractionError(error instanceof Error ? error.message : "OpenAI request failed.");
    }
  }

  throw new AiExtractionError("OpenAI request failed after all retries.");
}

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
