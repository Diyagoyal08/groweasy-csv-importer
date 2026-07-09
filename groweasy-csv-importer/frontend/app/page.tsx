"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { StepIndicator } from "@/components/StepIndicator";
import { CsvPreviewTable } from "@/components/CsvPreviewTable";
import { ResultsTable } from "@/components/ResultsTable";
import { parseCsvFile } from "@/lib/csvParse";
import { extractCrmRecords, ApiError } from "@/lib/api";
import { ExtractionResult, RawCsvRow, Step } from "@/types/crm";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawCsvRow[]>([]);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    try {
      const parsed = await parseCsvFile(file);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read this CSV.");
    }
  }

  async function handleConfirm() {
    setStep("processing");
    setError(null);
    try {
      const extraction = await extractCrmRecords(rows);
      setResult(extraction);
      setStep("results");
    } catch (err) {
      setStep("preview");
      setError(err instanceof ApiError ? err.message : "AI extraction failed. Please try again.");
    }
  }

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setResult(null);
    setError(null);
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-ink flex items-center justify-center">
              <span className="text-brand font-display font-bold text-lg">G</span>
            </div>
            <span className="font-display font-bold text-ink text-lg">GrowEasy</span>
          </div>
          <span className="text-sm text-muted">AI-Powered CSV Lead Importer</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <StepIndicator current={step} />

        {step === "upload" && (
          <section className="max-w-xl mx-auto">
            <h1 className="font-display text-2xl font-bold text-ink text-center mb-2">Import Leads via CSV</h1>
            <p className="text-muted text-center mb-8">
              Upload a CSV from any source — Facebook Ads, Google Ads, or a plain spreadsheet. AI will map the
              columns to GrowEasy CRM fields automatically.
            </p>
            <FileDropzone onFileSelected={handleFile} error={error} />
          </section>
        )}

        {step === "preview" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Preview: {fileName}</h2>
                <p className="text-muted text-sm">{rows.length} rows detected. Nothing has been sent to the AI yet.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={reset} className="px-4 py-2 rounded-lg border border-line text-ink font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark transition-colors shadow-card"
                >
                  Confirm &amp; Import
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-bad bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}
            <CsvPreviewTable headers={headers} rows={rows} />
          </section>
        )}

        {step === "processing" && (
          <section className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-brand-light border-t-brand animate-spin" />
            <p className="font-display font-semibold text-ink">Mapping fields with AI…</p>
            <p className="text-muted text-sm">
              Processing {rows.length} rows in batches. This can take a moment for larger files.
            </p>
          </section>
        )}

        {step === "results" && result && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">Import Complete</h2>
              <button onClick={reset} className="px-4 py-2 rounded-lg border border-line text-ink font-medium hover:bg-slate-50 transition-colors">
                Import Another File
              </button>
            </div>
            <ResultsTable result={result} />
          </section>
        )}
      </div>
    </main>
  );
}
