import { CRM_COLUMNS, ExtractionResult } from "@/types/crm";

const STATUS_STYLES: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-amber-100 text-amber-800",
  DID_NOT_CONNECT: "bg-slate-200 text-slate-700",
  BAD_LEAD: "bg-red-100 text-red-700",
  SALE_DONE: "bg-green-100 text-green-700",
};

export function ResultsTable({ result }: { result: ExtractionResult }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total Imported" value={result.totalImported} accent="good" />
        <SummaryCard label="Total Skipped" value={result.totalSkipped} accent="bad" />
        <SummaryCard label="Total Processed" value={result.totalImported + result.totalSkipped} accent="ink" />
      </div>

      <div>
        <h3 className="font-display font-semibold text-ink mb-2">Successfully Imported Records</h3>
        <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr>
                  {CRM_COLUMNS.map((col) => (
                    <th key={col} className="sticky-th text-left font-medium px-4 py-3 whitespace-nowrap border-b border-slate-700">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.imported.map((rec, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    {CRM_COLUMNS.map((col) => (
                      <td key={col} className="px-4 py-2.5 whitespace-nowrap text-ink border-b border-line max-w-xs truncate">
                        {col === "crm_status" && rec[col] ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[rec[col]] || "bg-slate-100"}`}>
                            {rec[col]}
                          </span>
                        ) : (
                          rec[col] || <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {result.imported.length === 0 && (
                  <tr>
                    <td colSpan={CRM_COLUMNS.length} className="px-4 py-6 text-center text-muted">
                      No records were successfully imported.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {result.skipped.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-ink mb-2">Skipped Records</h3>
          <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
            <div className="max-h-[300px] overflow-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="sticky-th text-left font-medium px-4 py-3 whitespace-nowrap border-b border-slate-700">
                      Reason
                    </th>
                    <th className="sticky-th text-left font-medium px-4 py-3 whitespace-nowrap border-b border-slate-700">
                      Original Row
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.skipped.map((s, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-2.5 text-bad border-b border-line whitespace-nowrap">{s.reason}</td>
                      <td className="px-4 py-2.5 text-muted border-b border-line font-mono text-xs max-w-lg break-all">
                        {JSON.stringify(s.originalRow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: "good" | "bad" | "ink" }) {
  const colors = { good: "text-good", bad: "text-bad", ink: "text-ink" };
  return (
    <div className="rounded-xl border border-line bg-white shadow-card px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted font-medium">{label}</p>
      <p className={`text-3xl font-display font-bold mt-1 ${colors[accent]}`}>{value}</p>
    </div>
  );
}
